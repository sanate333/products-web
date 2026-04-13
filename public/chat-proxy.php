<?php
/**
 * SÁNATE — Chat Asesor Proxy v1.0
 * Keeps the Gemini API key secure on the server (never exposed to browser).
 * Frontend calls /chat-proxy.php instead of Gemini directly.
 */

// Only allow requests from sanate.store
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://sanate.store');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ─── API KEY (server-side only, never exposed to browser) ────────
$GEMINI_KEY = 'REPLACE_WITH_NEW_KEY'; // <-- pegar nueva key aquí

// ─── MODEL ───────────────────────────────────────────────────────
$MODEL = 'gemini-2.0-flash';
$GEMINI_URL = "https://generativelanguage.googleapis.com/v1/models/{$MODEL}:generateContent?key={$GEMINI_KEY}";

// ─── READ BODY ───────────────────────────────────────────────────
$body = file_get_contents('php://input');
if (!$body) {
    http_response_code(400);
    echo json_encode(['error' => 'Empty body']);
    exit;
}
$data = json_decode($body, true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// ─── FORWARD TO GEMINI ───────────────────────────────────────────
$ch = curl_init($GEMINI_URL);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'Connection error: ' . $curlError]);
    exit;
}

http_response_code($httpCode);
echo $response;
