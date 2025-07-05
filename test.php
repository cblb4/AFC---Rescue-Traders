<?php
// test.php - Simple test to see if PHP is working

echo "<h1>PHP Test</h1>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>Current Time: " . date('Y-m-d H:i:s') . "</p>";

// Test environment variables
echo "<h2>Environment Variables:</h2>";
echo "<p>MYSQLHOST: " . ($_ENV['MYSQLHOST'] ?? 'NOT SET') . "</p>";
echo "<p>MYSQLUSER: " . ($_ENV['MYSQLUSER'] ?? 'NOT SET') . "</p>";
echo "<p>MYSQLDATABASE: " . ($_ENV['MYSQLDATABASE'] ?? 'NOT SET') . "</p>";
echo "<p>MYSQLPORT: " . ($_ENV['MYSQLPORT'] ?? 'NOT SET') . "</p>";

// Test basic database connection
try {
    require_once 'config.php';
    $pdo = getDBConnection();
    echo "<p style='color: green;'>✅ Database connection successful!</p>";
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Database error: " . $e->getMessage() . "</p>";
}
?>