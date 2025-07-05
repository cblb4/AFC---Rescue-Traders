<?php
// config.php - Database configuration for Railway

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Railway MySQL connection using environment variables
define('DB_HOST', $_ENV['MYSQLHOST'] ?? 'localhost');
define('DB_USERNAME', $_ENV['MYSQLUSER'] ?? 'root');
define('DB_PASSWORD', $_ENV['MYSQLPASSWORD'] ?? '');
define('DB_NAME', $_ENV['MYSQLDATABASE'] ?? 'afc_rescue_traders');
define('DB_PORT', $_ENV['MYSQLPORT'] ?? '3306');

function getDBConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USERNAME,
            DB_PASSWORD,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit();
    }
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

function getJSONInput() {
    $input = file_get_contents('php://input');  // Fixed: Added missing $
    return json_decode($input, true);
}

function validateRequired($data, $requiredFields) {
    $missing = [];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || 
            (is_string($data[$field]) && empty(trim($data[$field]))) ||
            (is_array($data[$field]) && empty($data[$field])) ||
            (!is_string($data[$field]) && !is_array($data[$field]) && empty($data[$field]))) {
            $missing[] = $field;
        }
    }
    
    if (!empty($missing)) {
        sendResponse([
            'error' => 'Missing required fields: ' . implode(', ', $missing)
        ], 400);
    }
}
?>