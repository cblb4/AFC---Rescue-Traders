<?php
// Simple index.php for Railway

// Get the request URI
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);

// Remove trailing slash
$path = rtrim($path, '/');

// Route requests
switch ($path) {
    case '':
    case '/':
        // Serve the main dashboard
        readfile('dashboard.html');
        break;
        
    case '/api/products':
        include 'api/products.php';
        break;
        
    case '/api/customers':
        include 'api/customers.php';
        break;
        
    case '/api/orders':
        include 'api/orders.php';
        break;
        
    case '/api/dashboard':
        include 'api/dashboard.php';
        break;
        
    default:
        // Try to serve static files
        $file = ltrim($path, '/');
        if (file_exists($file) && is_file($file)) {
            // Set content type
            $ext = pathinfo($file, PATHINFO_EXTENSION);
            switch ($ext) {
                case 'css': header('Content-Type: text/css'); break;
                case 'js': header('Content-Type: application/javascript'); break;
                case 'html': header('Content-Type: text/html'); break;
                case 'png': header('Content-Type: image/png'); break;
                case 'jpg': case 'jpeg': header('Content-Type: image/jpeg'); break;
            }
            readfile($file);
        } else {
            http_response_code(404);
            echo "404 - Not Found";
        }
        break;
}
?>