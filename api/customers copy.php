<?php
// api/customers.php - Customers API endpoints

require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

switch ($method) {
    case 'GET':
        handleGetCustomers($pdo);
        break;
    case 'POST':
        handleCreateCustomer($pdo);
        break;
    case 'PUT':
        handleUpdateCustomer($pdo);
        break;
    case 'DELETE':
        handleDeleteCustomer($pdo);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function handleGetCustomers($pdo) {
    try {
        $search = $_GET['search'] ?? '';
        
        $query = "SELECT * FROM customers WHERE 1=1";
        $params = [];
        
        if ($search) {
            $query .= " AND (name LIKE ? OR contact LIKE ? OR address LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        $query .= " ORDER BY created_at DESC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $customers = $stmt->fetchAll();
        
        sendResponse(['customers' => $customers]);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleCreateCustomer($pdo) {
    try {
        $data = getJSONInput();
        validateRequired($data, ['name', 'contact', 'address']);
        
        // Validate Philippine mobile number
        if (!preg_match('/^09\d{9}$/', $data['contact'])) {
            sendResponse(['error' => 'Invalid Philippine mobile number format'], 400);
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO customers (name, contact, address) 
            VALUES (?, ?, ?)
        ");
        
        $stmt->execute([
            $data['name'],
            $data['contact'],
            $data['address']
        ]);
        
        $customerId = $pdo->lastInsertId();
        
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
        $customer = $stmt->fetch();
        
        sendResponse(['message' => 'Customer created successfully', 'customer' => $customer], 201);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleUpdateCustomer($pdo) {
    try {
        $data = getJSONInput();
        $customerId = $_GET['id'] ?? null;
        
        if (!$customerId) {
            sendResponse(['error' => 'Customer ID required'], 400);
        }
        
        validateRequired($data, ['name', 'contact', 'address']);
        
        // Validate Philippine mobile number
        if (!preg_match('/^09\d{9}$/', $data['contact'])) {
            sendResponse(['error' => 'Invalid Philippine mobile number format'], 400);
        }
        
        $stmt = $pdo->prepare("
            UPDATE customers 
            SET name = ?, contact = ?, address = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $data['name'],
            $data['contact'],
            $data['address'],
            $customerId
        ]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(['error' => 'Customer not found'], 404);
        }
        
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
        $customer = $stmt->fetch();
        
        sendResponse(['message' => 'Customer updated successfully', 'customer' => $customer]);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleDeleteCustomer($pdo) {
    try {
        $customerId = $_GET['id'] ?? null;
        
        if (!$customerId) {
            sendResponse(['error' => 'Customer ID required'], 400);
        }
        
        $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(['error' => 'Customer not found'], 404);
        }
        
        sendResponse(['message' => 'Customer deleted successfully']);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>