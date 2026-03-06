<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

define('SECRET', 'sanate_secret_2025');
define('URL_FILE', __DIR__ . '/wa_backend_url.txt');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $secret = $_SERVER['HTTP_X_SECRET'] ?? '';
    if ($secret !== SECRET) { http_response_code(403); echo json_encode(['error' => 'Unauthorized']); exit; }
    $body = json_decode(file_get_contents('php://input'), true);
    $url  = trim($body['backendPublicUrl'] ?? '');
    if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
        echo json_encode(['error' => 'Invalid URL']); exit;
    }
    file_put_contents(URL_FILE, $url);
    echo json_encode(['ok' => true, 'url' => $url]);
} else {
    $url = file_exists(URL_FILE) ? trim(file_get_contents(URL_FILE)) : '';
    echo json_encode(['backendPublicUrl' => $url]);
}
?>
