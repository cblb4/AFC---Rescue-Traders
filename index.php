<?php
// index.php - Main entry point for Railway deployment

// Check if this is an API request
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

// Route API requests to appropriate PHP files
if (strpos($path, '/api/') === 0) {
    $api_file = substr($path, 5); // Remove '/api/' prefix
    $api_file = rtrim($api_file, '/') . '.php';
    
    $file_path = __DIR__ . '/api/' . $api_file;
    
    if (file_exists($file_path)) {
        include $file_path;
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
        exit;
    }
}

// Serve static files or main dashboard
if ($path === '/' || $path === '/dashboard' || $path === '/dashboard.html') {
    include 'dashboard.html';
    exit;
}

// Handle other static files
$file_path = __DIR__ . $path;
if (file_exists($file_path) && is_file($file_path)) {
    $mime_type = mime_content_type($file_path);
    header('Content-Type: ' . $mime_type);
    readfile($file_path);
    exit;
}

// Default fallback
http_response_code(404);
echo "404 - Page not found";
?>