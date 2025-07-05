<?php
// Ultra simple test
echo "<h1>PHP is working!</h1>";
echo "<p>Current time: " . date('Y-m-d H:i:s') . "</p>";
echo "<p>PHP Version: " . phpversion() . "</p>";

// Check if this is the main page request
$path = $_SERVER['REQUEST_URI'] ?? '/';
if ($path === '/dashboard.html' || $path === '/dashboard') {
    if (file_exists('dashboard.html')) {
        include 'dashboard.html';
        exit;
    }
}

// Very basic API routing
if (strpos($path, '/api/') === 0) {
    echo "<p>API request detected: $path</p>";
    $api_file = str_replace('/api/', '', $path);
    $file_path = 'api/' . $api_file;
    
    if (file_exists($file_path)) {
        include $file_path;
    } else {
        echo "API file not found: $file_path";
    }
    exit;
}
?>