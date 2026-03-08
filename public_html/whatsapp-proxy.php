<?php
/**
 * WhatsApp Proxy – forwards /api/whatsapp/* to Fly.io backend
 * SSE-aware: streams text/event-stream responses chunk-by-chunk
 */

$BACKEND = 'https://sanate-wa-bot.fly.dev';
$path    = isset($_GET['path']) ? ltrim($_GET['path'], '/') : '';
$url     = $BACKEND . '/api/whatsapp/' . $path;

// Build query string (excluding our own 'path' param)
$qs = $_GET;
unset($qs['path']);
if ($qs) $url .= '?' . http_build_query($qs);

// Is this an SSE request?
$acceptHeader = isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : '';
$isSSE = ($path === 'events') || (strpos($acceptHeader, 'text/event-stream') !== false);

// --- cURL setup ---
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, $isSSE ? 0 : 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);

// Forward method + body
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    $rawBody = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $rawBody);
} elseif ($method !== 'GET') {
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    $rawBody = file_get_contents('php://input');
    if ($rawBody) curl_setopt($ch, CURLOPT_POSTFIELDS, $rawBody);
}

// Forward relevant request headers
$fwdHeaders = [];
$allHeaders = function_exists('getallheaders') ? getallheaders() : [];
foreach ($allHeaders as $name => $value) {
    $nl = strtolower($name);
    if (in_array($nl, ['content-type', 'content-length', 'authorization',
                        'x-secret', 'accept', 'cache-control'])) {
        $fwdHeaders[] = "$name: $value";
    }
}
if ($isSSE) {
    $fwdHeaders[] = 'Accept: text/event-stream';
    $fwdHeaders[] = 'Cache-Control: no-cache';
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $fwdHeaders);

// --- Capture response headers ---
$responseHeaders = [];
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $header) use (&$responseHeaders) {
    $len = strlen($header);
    $h   = trim($header);
    if ($h !== '' && strpos($h, 'HTTP/') !== 0) {
        $responseHeaders[] = $h;
    }
    return $len;
});

// ============================================================
// SSE path – stream each chunk straight to the browser
// ============================================================
if ($isSSE) {
    @ini_set('output_buffering', 'off');
    @ini_set('zlib.output_compression', false);
    while (ob_get_level() > 0) { ob_end_clean(); }

    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');
    header('Access-Control-Allow-Origin: *');

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
        echo $data;
        @ob_flush();
        @flush();
        return strlen($data);
    });

    curl_exec($ch);
    curl_close($ch);
    exit;
}

// ============================================================
// Regular (non-SSE) request
// ============================================================
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$body       = curl_exec($ch);
$httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpStatus ? $httpStatus : 502);

foreach ($responseHeaders as $h) {
    $hl = strtolower($h);
    if (strpos($hl, 'transfer-encoding:') === 0) continue;
    if (strpos($hl, 'connection:') === 0) continue;
    header($h, false);
}
header('Access-Control-Allow-Origin: *', true);

echo $body;
