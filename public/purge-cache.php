<?php
// LiteSpeed Cache Purge Script
// Sends X-LiteSpeed-Purge header to clear all cached content
header('X-LiteSpeed-Purge: *');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Also try to clear OPcache if available
if (function_exists('opcache_reset')) {
    opcache_reset();
}

// Touch home.html to update its modification time
$homeFile = __DIR__ . '/home.html';
if (file_exists($homeFile)) {
    touch($homeFile);
    $mtime = filemtime($homeFile);
    echo "<h2>Cache Purged Successfully</h2>";
    echo "<p>X-LiteSpeed-Purge: * header sent</p>";
    echo "<p>home.html touched - new mtime: " . date('Y-m-d H:i:s', $mtime) . "</p>";
    echo "<p><a href='/home.html?v=" . time() . "'>Click here to view updated home.html</a></p>";
} else {
    echo "<p>home.html not found at: $homeFile</p>";
}
?>
