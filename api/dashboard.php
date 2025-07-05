<?php
// api/dashboard.php - Dashboard statistics API

require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

if ($method !== 'GET') {
    sendResponse(['error' => 'Method not allowed'], 405);
}

try {
    // Get total sales (sum of all completed orders)
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(total), 0) as total_sales 
        FROM orders 
        WHERE status = 'completed'
    ");
    $stmt->execute();
    $salesData = $stmt->fetch();
    $totalSales = $salesData['total_sales'];
    
    // Get total orders count
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total_orders 
        FROM orders 
        WHERE status = 'completed'
    ");
    $stmt->execute();
    $ordersData = $stmt->fetch();
    $totalOrders = $ordersData['total_orders'];
    
    // Get total customers count
    $stmt = $pdo->prepare("SELECT COUNT(*) as total_customers FROM customers");
    $stmt->execute();
    $customersData = $stmt->fetch();
    $totalCustomers = $customersData['total_customers'];
    
    // Get total products count
    $stmt = $pdo->prepare("SELECT COUNT(*) as total_products FROM products");
    $stmt->execute();
    $productsData = $stmt->fetch();
    $totalProducts = $productsData['total_products'];
    
    // Get low stock products (stock <= 5)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as low_stock_count 
        FROM products 
        WHERE stock <= 5 AND stock > 0
    ");
    $stmt->execute();
    $lowStockData = $stmt->fetch();
    $lowStockCount = $lowStockData['low_stock_count'];
    
    // Get out of stock products
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as out_of_stock_count 
        FROM products 
        WHERE stock = 0
    ");
    $stmt->execute();
    $outOfStockData = $stmt->fetch();
    $outOfStockCount = $outOfStockData['out_of_stock_count'];
    
    // Get recent transactions (last 10)
    $stmt = $pdo->prepare("
        SELECT o.*, 
               GROUP_CONCAT(
                   CONCAT(oi.product_name, ' (', oi.quantity, 'x)')
                   SEPARATOR ', '
               ) as items_summary
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status = 'completed'
        GROUP BY o.id 
        ORDER BY o.created_at DESC 
        LIMIT 10
    ");
    $stmt->execute();
    $recentTransactions = $stmt->fetchAll();
    
    // Get monthly sales data for current year
    $stmt = $pdo->prepare("
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            SUM(total) as monthly_sales,
            COUNT(*) as monthly_orders
        FROM orders 
        WHERE status = 'completed' 
        AND YEAR(created_at) = YEAR(CURDATE())
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
    ");
    $stmt->execute();
    $monthlySales = $stmt->fetchAll();
    
    sendResponse([
        'stats' => [
            'total_sales' => number_format($totalSales, 2),
            'total_orders' => $totalOrders,
            'total_customers' => $totalCustomers,
            'total_products' => $totalProducts,
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount
        ],
        'recent_transactions' => $recentTransactions,
        'monthly_sales' => $monthlySales
    ]);
    
} catch (Exception $e) {
    sendResponse(['error' => $e->getMessage()], 500);
}
?>