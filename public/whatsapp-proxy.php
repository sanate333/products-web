<?php
/**
 * Proxy PHP: reenvía /api/whatsapp/* al backend Railway (Baileys).
 * Lee la URL base desde wa_backend_url.txt (escrita por waBackendUrl.php).
 */

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-secret, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Leer URL del backend Railway
define('URL_FILE', __DIR__ . '/wa_backend_url.txt');
$backendUrl = file_exists(URL_FILE) ? trim(file_get_contents(URL_FILE)) : '';

if (!$backendUrl) {
    header('Content-Type: application/json');
    http_response_code(502);
    echo json_encode(['error' => 'Backend URL not configured. POST to /waBackendUrl.php first.']);
    exit;
}

// Ruta solicitada: path= viene del .htaccess RewriteRule
$path = $_GET['path'] ?? '';
$targetUrl = rtrim($backendUrl, '/') . '/api/whatsapp/' . $path;

// Query string (sin el "path" interno)
$qs = $_GET;
unset($qs['path']);
if ($qs) $targetUrl .= '?' . http_build_query($qs);

// Preparar cURL
$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Reenviar headers relevantes
$fwdHeaders = [];
if (isset($_SERVER['HTTP_X_SECRET']))       $fwdHeaders[] = 'x-secret: ' . $_SERVER['HTTP_X_SECRET'];
if (isset($_SERVER['HTTP_CONTENT_TYPE']))    $fwdHeaders[] = 'Content-Type: ' . $_SERVER['HTTP_CONTENT_TYPE'];
if (isset($_SERVER['HTTP_AUTHORIZATION']))   $fwdHeaders[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
if ($fwdHeaders) curl_setopt($ch, CURLOPT_HTTPHEADER, $fwdHeaders);

// Reenviar body para POST/PUT/PATCH
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    header('Content-Type: application/json');
    http_response_code(502);
    echo json_encode(['error' => 'Backend unreachable', 'detail' => $curlError]);
    exit;
}

http_response_code($httpCode);
if ($contentType) header('Content-Type: ' . $contentType);
echo $response;
?>
