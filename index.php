<?php
// index.php - Main entry point for Railway

// Redirect to dashboard.html for the main app
if ($_SERVER['REQUEST_URI'] === '/' || $_SERVER['REQUEST_URI'] === '/index.php') {
    header('Location: /dashboard.html');
    exit();
}

// Handle API routes
$request_uri = $_SERVER['REQUEST_URI'];

if (strpos($request_uri, '/api/') === 0) {
    // Remove /api/ prefix and route to appropriate file
    $api_file = substr($request_uri, 5); // Remove '/api/'
    $api_file = strtok($api_file, '?'); // Remove query parameters
    
    $api_path = __DIR__ . '/api/' . $api_file;
    
    if (file_exists($api_path)) {
        include $api_path;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
    }
} else {
    // Serve static files
    $file_path = __DIR__ . $request_uri;
    
    if (file_exists($file_path) && is_file($file_path)) {
        // Set appropriate content type
        $extension = pathinfo($file_path, PATHINFO_EXTENSION);
        switch ($extension) {
            case 'css':
                header('Content-Type: text/css');
                break;
            case 'js':
                header('Content-Type: application/javascript');
                break;
            case 'html':
                header('Content-Type: text/html');
                break;
            case 'png':
                header('Content-Type: image/png');
                break;
            case 'jpg':
            case 'jpeg':
                header('Content-Type: image/jpeg');
                break;
        }
        
        readfile($file_path);
    } else {
        http_response_code(404);
        echo '404 - File Not Found';
    }
}
?>