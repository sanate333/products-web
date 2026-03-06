<?php
// Instalador — accede UNA vez y crea los archivos necesarios para el QR
// URL: https://sanate.store/_wa_install.php?k=sanate2025
if (($_GET['k'] ?? '') !== 'sanate2025') { http_response_code(403); die('403 Forbidden'); }

$proxy = <<<'END'
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-secret, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$urlFile = __DIR__ . '/wa_backend_url.txt';
$tunnelUrl = file_exists($urlFile) ? trim(file_get_contents($urlFile)) : '';
if (!$tunnelUrl) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['ok'=>false,'error'=>'Backend no disponible. Inicia Node.js y el tunel cloudflared.']);
    exit;
}
$path = ltrim($_GET['path'] ?? '', '/');
unset($_GET['path']);
$qs = http_build_query($_GET);
$target = rtrim($tunnelUrl, '/') . '/api/whatsapp/' . $path;
if ($qs) $target .= '?' . $qs;
$body = file_get_contents('php://input');
$hdrs = ['Content-Type: application/json'];
if (!empty($_SERVER['HTTP_X_SECRET'])) $hdrs[] = 'x-secret: ' . $_SERVER['HTTP_X_SECRET'];
$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_CUSTOMREQUEST  => $_SERVER['REQUEST_METHOD'],
    CURLOPT_HTTPHEADER     => $hdrs,
    CURLOPT_SSL_VERIFYPEER => true,
]);
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET','HEAD'])) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);
if ($err) { http_response_code(502); echo json_encode(['ok'=>false,'error'=>$err]); exit; }
http_response_code($code ?: 200);
header('Content-Type: application/json');
echo $resp;
END;

$waBackend = <<<'END'
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-secret');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
define('SECRET', 'sanate_secret_2025');
define('URL_FILE', __DIR__ . '/wa_backend_url.txt');
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (($_SERVER['HTTP_X_SECRET'] ?? '') !== SECRET) { http_response_code(403); echo json_encode(['error'=>'Unauthorized']); exit; }
    $body = json_decode(file_get_contents('php://input'), true);
    $url  = trim($body['backendPublicUrl'] ?? '');
    if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) { echo json_encode(['error'=>'Invalid URL']); exit; }
    file_put_contents(URL_FILE, $url);
    echo json_encode(['ok'=>true,'url'=>$url]);
} else {
    $url = file_exists(URL_FILE) ? trim(file_get_contents(URL_FILE)) : '';
    echo json_encode(['backendPublicUrl'=>$url]);
}
END;

$results = [];
$results['whatsapp-proxy.php'] = file_put_contents(__DIR__ . '/whatsapp-proxy.php', $proxy) !== false ? '✅ OK' : '❌ Error';
$results['waBackendUrl.php']   = file_put_contents(__DIR__ . '/waBackendUrl.php',   $waBackend) !== false ? '✅ OK' : '❌ Error';

@unlink(__FILE__); // auto-borrar este instalador

header('Content-Type: text/html; charset=utf-8');
echo '<h2 style="font-family:sans-serif">✅ Instalación WhatsApp Bot</h2><ul style="font-family:monospace;font-size:1.1em">';
foreach ($results as $f => $r) echo "<li>$f — $r</li>";
echo '</ul>';
echo '<p style="font-family:sans-serif">Este archivo fue eliminado automáticamente.</p>';
echo '<p><a href="/dashboard/whatsapp-bot" style="font-family:sans-serif">→ Ir al bot de WhatsApp y generar QR</a></p>';
?>
