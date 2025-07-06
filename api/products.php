<?php
// api/products.php - Products API endpoints

require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

switch ($method) {
    case 'GET':
        handleGetProducts($pdo);
        break;
    case 'POST':
        handleCreateProduct($pdo);
        break;
    case 'PUT':
        handleUpdateProduct($pdo);
        break;
    case 'DELETE':
        handleDeleteProduct($pdo);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function handleGetProducts($pdo) {
    try {
        $search = $_GET['search'] ?? '';
        $category = $_GET['category'] ?? '';
        
        $query = "SELECT * FROM products WHERE 1=1";
        $params = [];
        
        if ($search) {
            $query .= " AND (name LIKE ? OR description LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        if ($category) {
            $query .= " AND category = ?";
            $params[] = $category;
        }
        
        $query .= " ORDER BY created_at DESC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $products = $stmt->fetchAll();
        
        sendResponse(['products' => $products]);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleCreateProduct($pdo) {
    try {
        $data = getJSONInput();
        validateRequired($data, ['name', 'category', 'price', 'stock']);
        
        $stmt = $pdo->prepare("
            INSERT INTO products (name, category, price, stock, description, image) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['name'],
            $data['category'],
            $data['price'],
            $data['stock'],
            $data['description'] ?? '',
            $data['image'] ?? null
        ]);
        
        $productId = $pdo->lastInsertId();
        
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        
        sendResponse(['message' => 'Product created successfully', 'product' => $product], 201);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleUpdateProduct($pdo) {
    try {
        $data = getJSONInput();
        $productId = $_GET['id'] ?? null;
        
        if (!$productId) {
            sendResponse(['error' => 'Product ID required'], 400);
        }
        
        validateRequired($data, ['name', 'category', 'price', 'stock']);
        
        $stmt = $pdo->prepare("
            UPDATE products 
            SET name = ?, category = ?, price = ?, stock = ?, description = ?, image = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $data['name'],
            $data['category'],
            $data['price'],
            $data['stock'],
            $data['description'] ?? '',
            $data['image'] ?? null,
            $productId
        ]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(['error' => 'Product not found'], 404);
        }
        
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        
        sendResponse(['message' => 'Product updated successfully', 'product' => $product]);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function handleDeleteProduct($pdo) {
    try {
        $productId = $_GET['id'] ?? null;
        
        if (!$productId) {
            sendResponse(['error' => 'Product ID required'], 400);
        }
        
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(['error' => 'Product not found'], 404);
        }
        
        sendResponse(['message' => 'Product deleted successfully']);
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>