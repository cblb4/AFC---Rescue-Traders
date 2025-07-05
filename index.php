<?php
// Simple index.php for Railway

// Basic routing
$request_uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($request_uri, PHP_URL_PATH);

// Handle API requests
if (strpos($path, '/api/') === 0) {
    $api_file = ltrim($path, '/');
    $file_path = __DIR__ . '/' . $api_file;
    
    if (file_exists($file_path)) {
        include $file_path;
        exit;
    } else {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'API endpoint not found']);
        exit;
    }
}

// Serve main dashboard
if ($path === '/' || $path === '/dashboard' || $path === '/dashboard.html') {
    if (file_exists(__DIR__ . '/dashboard.html')) {
        include __DIR__ . '/dashboard.html';
        exit;
    } else {
        echo "Dashboard file not found";
        exit;
    }
}

// Handle static files
$file_path = __DIR__ . $path;
if (file_exists($file_path) && is_file($file_path)) {
    $mime_type = mime_content_type($file_path);
    header('Content-Type: ' . $mime_type);
    readfile($file_path);
    exit;
}

// Test endpoint
if ($path === '/test') {
    echo "PHP is working on Railway!";
    exit;
}

// Default 404
http_response_code(404);
echo "404 - Page not found";
?>