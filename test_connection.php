<?php
require_once 'config.php';

try {
    $pdo = getDBConnection();
    echo "✅ Database connection successful!<br>";
    
    // Test products
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM products");
    $result = $stmt->fetch();
    echo "📦 Products in database: " . $result['count'] . "<br>";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
}
?>