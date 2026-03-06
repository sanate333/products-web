<?php
/**
 * wa-diagnostic.php — Diagnóstico de la conexión WhatsApp
 * Abre en el navegador: https://sanate.store/wa-diagnostic.php
 */
header('Content-Type: text/html; charset=utf-8');
echo '<html><head><title>WA Diagnostic</title><style>body{font-family:monospace;background:#1a1a2e;color:#0f0;padding:20px}
.ok{color:#0f0}.err{color:#f44}.warn{color:#ff0}h2{color:#fff}pre{background:#111;padding:10px;border-radius:5px;overflow-x:auto}</style></head><body>';
echo '<h2>WhatsApp Bot — Diagnóstico</h2>';

// 1. Check wa_backend_url.txt
echo '<h3>1. wa_backend_url.txt</h3>';
$urlFile = __DIR__ . '/wa_backend_url.txt';
if (file_exists($urlFile)) {
    $content = trim(file_get_contents($urlFile));
    echo "<p>Archivo existe: <b>$content</b></p>";
    if (preg_match('#(localhost|127\.0\.0\.1|192\.168\.|10\.|::1)#i', $content)) {
        echo '<p class="warn">⚠️ URL es local/privada — se usará Fly.io como fallback</p>';
    }
} else {
    echo '<p class="warn">⚠️ Archivo no existe — se usará Fly.io directamente</p>';
}

// 2. Check whatsapp-proxy.php exists
echo '<h3>2. whatsapp-proxy.php</h3>';
$proxyFile = __DIR__ . '/whatsapp-proxy.php';
if (file_exists($proxyFile)) {
    $proxyContent = file_get_contents($proxyFile);
    $hasFlyBackend = strpos($proxyContent, 'FLY_BACKEND') !== false;
    echo '<p class="ok">✅ Archivo existe' . ($hasFlyBackend ? ' (con fallback Fly.io)' : ' (SIN fallback Fly.io ⚠️)') . '</p>';
} else {
    echo '<p class="err">❌ NO EXISTE — las llamadas API no llegarán al backend</p>';
}

// 3. Check .htaccess routing
echo '<h3>3. .htaccess routing</h3>';
$htaccess = __DIR__ . '/.htaccess';
if (file_exists($htaccess)) {
    $htContent = file_get_contents($htaccess);
    if (strpos($htContent, 'whatsapp-proxy.php') !== false) {
        echo '<p class="ok">✅ Regla de rewrite para api/whatsapp/* existe</p>';
    } else {
        echo '<p class="err">❌ NO hay regla de rewrite para whatsapp-proxy.php</p>';
    }
} else {
    echo '<p class="err">❌ .htaccess no existe</p>';
}

// 4. Test Fly.io backend connectivity
echo '<h3>4. Conexión a Fly.io (sanate-wa-bot.fly.dev)</h3>';
$flyUrl = 'https://sanate-wa-bot.fly.dev/api/whatsapp/status';
$ch = curl_init($flyUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => ['x-secret: sanate_secret_2025'],
    CURLOPT_SSL_VERIFYPEER => true,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
$time = round(curl_getinfo($ch, CURLINFO_TOTAL_TIME), 2);
curl_close($ch);

if ($err) {
    echo "<p class=\"err\">❌ Error cURL: $err (timeout: {$time}s)</p>";
} else {
    echo "<p class=\"" . ($code >= 200 && $code < 400 ? 'ok' : 'err') . "\">HTTP $code (en {$time}s)</p>";
    echo '<pre>' . htmlspecialchars($resp) . '</pre>';
}

// 5. Test QR endpoint
echo '<h3>5. Endpoint /qr</h3>';
$qrUrl = 'https://sanate-wa-bot.fly.dev/api/whatsapp/qr';
$ch = curl_init($qrUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => ['x-secret: sanate_secret_2025'],
    CURLOPT_SSL_VERIFYPEER => true,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($err) {
    echo "<p class=\"err\">❌ Error cURL: $err</p>";
} else {
    echo "<p class=\"" . ($code >= 200 && $code < 400 ? 'ok' : 'err') . "\">HTTP $code</p>";
    $data = json_decode($resp, true);
    if ($data) {
        echo '<p>status: <b>' . ($data['status'] ?? '?') . '</b></p>';
        echo '<p>qr: <b>' . ($data['qr'] ? 'SÍ (' . strlen($data['qr']) . ' chars)' : 'null') . '</b></p>';
        echo '<p>qrRaw: <b>' . (($data['qrRaw'] ?? null) ? 'SÍ (' . strlen($data['qrRaw']) . ' chars)' : 'null') . '</b></p>';
    } else {
        echo '<pre>' . htmlspecialchars(substr($resp, 0, 500)) . '</pre>';
    }
}

// 6. Test via proxy (same way the frontend calls)
echo '<h3>6. Test via proxy local</h3>';
$proxyTestUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/api/whatsapp/status';
$ch = curl_init($proxyTestUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => ['x-secret: sanate_secret_2025'],
    CURLOPT_SSL_VERIFYPEER => false,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($err) {
    echo "<p class=\"err\">❌ Proxy error: $err</p>";
} else {
    echo "<p class=\"" . ($code >= 200 && $code < 400 ? 'ok' : 'err') . "\">HTTP $code</p>";
    echo '<pre>' . htmlspecialchars(substr($resp, 0, 500)) . '</pre>';
}

echo '<hr><p style="color:#888">Generado: ' . date('Y-m-d H:i:s T') . '</p>';
echo '</body></html>';
