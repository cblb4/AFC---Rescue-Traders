<?php
// api/orders.php - Complete fixed version

require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? 'list';
        if ($action === 'next_order_number') {
            handleGetNextOrderNumber($pdo);
        } elseif ($action === 'get_proof') {
            handleGetProofOfPayment($pdo);
        } else {
            handleGetOrders($pdo);
        }
        break;
    case 'POST':
        handleCreateOrder($pdo);
        break;
    case 'DELETE':
        handleDeleteOrder($pdo);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function handleGetNextOrderNumber($pdo) {
    try {
        // Get the highest order number from the database
        $stmt = $pdo->prepare("SELECT COUNT(*) + 1 as next_order_number FROM orders");
        $stmt->execute();
        $result = $stmt->fetch();
        
        sendResponse(['next_order_number' => (int)$result['next_order_number']]);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleGetProofOfPayment($pdo) {
    try {
        $transactionId = $_GET['transaction_id'] ?? null;
        
        if (!$transactionId) {
            sendResponse(['error' => 'Transaction ID required'], 400);
        }
        
        // Try to find by order ID first
        $stmt = $pdo->prepare("SELECT proof_of_payment FROM orders WHERE id = ? AND proof_of_payment IS NOT NULL");
        $stmt->execute([$transactionId]);
        $result = $stmt->fetch();
        
        if (!$result) {
            // Try to find by order number pattern
            $stmt = $pdo->prepare("SELECT proof_of_payment FROM orders WHERE order_number LIKE ? AND proof_of_payment IS NOT NULL");
            $stmt->execute(["%$transactionId%"]);
            $result = $stmt->fetch();
        }
        
        if ($result && $result['proof_of_payment']) {
            sendResponse(['proof_of_payment' => $result['proof_of_payment']]);
        } else {
            sendResponse(['error' => 'Proof of payment not found'], 404);
        }
        
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleDeleteOrder($pdo) {
    try {
        $orderId = $_GET['id'] ?? null;
        
        if (!$orderId) {
            sendResponse(['error' => 'Order ID required'], 400);
        }
        
        $pdo->beginTransaction();
        
        // First, get the order items to restore stock
        $stmt = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
        $stmt->execute([$orderId]);
        $orderItems = $stmt->fetchAll();
        
        // Restore stock for each item
        foreach ($orderItems as $item) {
            $stmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
            $stmt->execute([$item['quantity'], $item['product_id']]);
        }
        
        // Delete order items first (due to foreign key constraint)
        $stmt = $pdo->prepare("DELETE FROM order_items WHERE order_id = ?");
        $stmt->execute([$orderId]);
        
        // Delete the order
        $stmt = $pdo->prepare("DELETE FROM orders WHERE id = ?");
        $stmt->execute([$orderId]);
        
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            sendResponse(['error' => 'Order not found'], 404);
        }
        
        $pdo->commit();
        sendResponse(['message' => 'Order deleted successfully']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleGetOrders($pdo) {
    try {
        $search = $_GET['search'] ?? '';
        $month = $_GET['month'] ?? '';
        
        $query = "
            SELECT o.*, 
                   GROUP_CONCAT(
                       CONCAT(oi.product_name, ' (', oi.quantity, 'x)')
                       SEPARATOR ', '
                   ) as items_summary
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE 1=1
        ";
        $params = [];
        
        if ($search) {
            $query .= " AND (o.order_number LIKE ? OR o.customer_name LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        if ($month) {
            $query .= " AND DATE_FORMAT(o.created_at, '%Y-%m') = ?";
            $params[] = $month;
        }
        
        $query .= " GROUP BY o.id ORDER BY o.created_at DESC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();
        
        sendResponse(['orders' => $orders]);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleCreateOrder($pdo) {
    try {
        $data = getJSONInput();
        
        // Debug: Log received data
        error_log("Received order data: " . json_encode($data));
        
        validateRequired($data, ['items', 'subtotal', 'tax', 'total', 'payment_method']);
        
        if (empty($data['items']) || !is_array($data['items'])) {
            sendResponse(['error' => 'Order must contain at least one item'], 400);
        }
        
        $pdo->beginTransaction();
        
        // Generate order number
        $orderNumber = 'ORD-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        
        // Determine customer information
        $customerId = $data['customer_id'] ?? null;
        $customerName = $data['customer_name'] ?? 'Walk-in Customer';
        $customerContact = $data['customer_contact'] ?? null;
        $customerAddress = $data['customer_address'] ?? null;
        
        // If customer_id is provided, get customer details
        if ($customerId) {
            $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
            $stmt->execute([$customerId]);
            $customer = $stmt->fetch();
            
            if ($customer) {
                $customerName = $customer['name'];
                $customerContact = $customer['contact'];
                $customerAddress = $customer['address'];
            }
        }
        
        // Insert order
        $stmt = $pdo->prepare("
            INSERT INTO orders (
                order_number, customer_id, customer_name, customer_contact, customer_address,
                subtotal, tax, discount, total, payment_method, cash_received, change_given,
                gcash_customer_name, gcash_number, proof_of_payment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $orderNumber,
            $customerId,
            $customerName,
            $customerContact,
            $customerAddress,
            $data['subtotal'],
            $data['tax'],
            $data['discount'] ?? 0,
            $data['total'],
            $data['payment_method'],
            $data['cash_received'] ?? null,
            $data['change_given'] ?? null,
            $data['gcash_customer_name'] ?? null,
            $data['gcash_number'] ?? null,
            $data['proof_of_payment'] ?? null
        ]);
        
        $orderId = $pdo->lastInsertId();
        
        // Insert order items and update stock
        foreach ($data['items'] as $item) {
            validateRequired($item, ['product_id', 'product_name', 'product_price', 'quantity']);
            
            // Insert order item
            $stmt = $pdo->prepare("
                INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, total)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $itemTotal = $item['product_price'] * $item['quantity'];
            $stmt->execute([
                $orderId,
                $item['product_id'],
                $item['product_name'],
                $item['product_price'],
                $item['quantity'],
                $itemTotal
            ]);
            
            // Update product stock
            $stmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
            $stmt->execute([$item['quantity'], $item['product_id']]);
        }
        
        $pdo->commit();
        
        // Get the complete order
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        
        sendResponse([
            'message' => 'Order created successfully', 
            'order' => $order,
            'order_number' => $orderNumber
        ], 201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Order creation error: " . $e->getMessage());
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>