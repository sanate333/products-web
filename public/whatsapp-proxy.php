<?php
/**
 * whatsapp-proxy.php
 * Proxies /api/whatsapp/* requests to the Node.js backend (cloudflared tunnel).
 * The tunnel URL is read from wa_backend_url.txt (saved by waBackendUrl.php).
 *
 * htaccess rule: RewriteRule ^api/whatsapp/(.*)$ whatsapp-proxy.php?path=$1 [L,QSA]
 */

// ── CORS ────────────────────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-secret, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Leer URL del túnel ──────────────────────────────────────────────────────
$urlFile = __DIR__ . '/wa_backend_url.txt';
$tunnelUrl = file_exists($urlFile) ? trim(file_get_contents($urlFile)) : '';

if (!$tunnelUrl) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode([
        'ok'    => false,
        'error' => 'Backend no disponible. Asegúrate de que el servidor Node.js está corriendo y el túnel cloudflared está activo.',
        'hint'  => 'Configura la URL del backend en Ajustes o asegúrate de que tunnel.mjs está corriendo.'
    ]);
    exit;
}

// ── Construir URL destino ───────────────────────────────────────────────────
$path   = $_GET['path'] ?? '';
$path   = ltrim($path, '/');
unset($_GET['path']);

// Reconstruir query string sin el parámetro "path"
$qs = http_build_query($_GET);
$target = rtrim($tunnelUrl, '/') . '/api/whatsapp/' . $path;
if ($qs) $target .= '?' . $qs;

// ── Leer body de la petición ────────────────────────────────────────────────
$body = file_get_contents('php://input');

// ── Preparar headers para reenviar ─────────────────────────────────────────
$forwardHeaders = ['Content-Type: application/json'];
if (!empty($_SERVER['HTTP_X_SECRET'])) {
    $forwardHeaders[] = 'x-secret: ' . $_SERVER['HTTP_X_SECRET'];
}
if (!empty($_SERVER['HTTP_CONTENT_TYPE'])) {
    $forwardHeaders[0] = 'Content-Type: ' . $_SERVER['HTTP_CONTENT_TYPE'];
}

// ── cURL al backend ─────────────────────────────────────────────────────────
$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_CUSTOMREQUEST  => $_SERVER['REQUEST_METHOD'],
    CURLOPT_HTTPHEADER     => $forwardHeaders,
    CURLOPT_SSL_VERIFYPEER => true,
]);

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'No se pudo conectar al backend: ' . $curlError]);
    exit;
}

// ── Devolver respuesta del backend ──────────────────────────────────────────
http_response_code($httpCode ?: 200);
header('Content-Type: application/json');
echo $response;
?>
