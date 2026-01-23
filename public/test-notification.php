<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__ . '/vendor/autoload.php';
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$servidor = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$usuario = $_ENV['DB_USER'];
$contrasena = $_ENV['DB_PASS'];
$dbname = $_ENV['DB_NAME'];

$mailTo = $_ENV['MAIL_TO'] ?? 'sanate333@gmail.com';
$mailFrom = $_ENV['MAIL_FROM'] ?? 'no-reply@sanate.store';
$mailFromName = $_ENV['MAIL_FROM_NAME'] ?? 'Sanate';

require __DIR__ . '/fcm.php';
$firebaseProjectId = $_ENV['FIREBASE_PROJECT_ID'] ?? '';

function randomPhoneCO() {
    $prefix = '3' . rand(10, 23);
    $rest = str_pad((string)rand(0, 9999999), 7, '0', STR_PAD_LEFT);
    return $prefix . $rest;
}

function resolveUrl($path) {
    if (!$path) {
        return '';
    }
    if (preg_match('/^https?:\/\//i', $path)) {
        return $path;
    }
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (!$host) {
        return $path;
    }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $path = '/' . ltrim($path, '/');
    return $scheme . '://' . $host . $path;
}


try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conexion->exec("CREATE TABLE IF NOT EXISTS `pedidos` (
        idPedido INT(11) AUTO_INCREMENT PRIMARY KEY,
        idMesa INT(11) NOT NULL,
        estado VARCHAR(50) NOT NULL,
        productos JSON NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        nota VARCHAR(255) NOT NULL,
        nombre VARCHAR(50) NOT NULL,
        codigo VARCHAR(50) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $conexion->exec("CREATE TABLE IF NOT EXISTS `push_tokens` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        userAgent VARCHAR(255) NULL,
        deviceInfo VARCHAR(100) NULL,
        deviceId VARCHAR(80) NULL,
        role VARCHAR(30) NULL,
        ip VARCHAR(64) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    $productos = [
        ['titulo' => 'Producto demo 1', 'cantidad' => 1, 'precio' => 35000],
        ['titulo' => 'Producto demo 2', 'cantidad' => 2, 'precio' => 20000],
    ];
    $total = 0;
    foreach ($productos as $p) {
        $total += $p['cantidad'] * $p['precio'];
    }

    $nombre = 'Cliente Prueba';
    $whatsapp = randomPhoneCO();
    $createdAt = date('Y-m-d H:i:s');

    $sqlInsert = "INSERT INTO `pedidos` (idMesa, estado, productos, total, nota, nombre, codigo, createdAt)
                  VALUES (0, 'Prueba', :productos, :total, 'Pedido simulado', :nombre, '', :createdAt)";
    $stmt = $conexion->prepare($sqlInsert);
    $stmt->bindParam(':productos', json_encode($productos));
    $stmt->bindParam(':total', $total);
    $stmt->bindParam(':nombre', $nombre);
    $stmt->bindParam(':createdAt', $createdAt);
    $stmt->execute();
    $lastPedidoId = $conexion->lastInsertId();

    $subject = "Pedido de prueba Sanate: TEST-{$lastPedidoId}";
    $body = "Pedido de prueba generado\n\n";
    $body .= "ID: TEST-{$lastPedidoId}\n";
    $body .= "Cliente: {$nombre}\n";
    $body .= "WhatsApp: {$whatsapp}\n\n";
    $body .= "Productos:\n";
    foreach ($productos as $p) {
        $body .= "- {$p['titulo']} x{$p['cantidad']} = $" . number_format($p['cantidad'] * $p['precio'], 0, ',', '.') . "\n";
    }
    $body .= "\nTotal: $" . number_format($total, 0, ',', '.') . "\n";
    $body .= "\nDashboard: " . resolveUrl('/dashboard') . "\n";
    $headers = [
        "From: {$mailFromName} <{$mailFrom}>",
        "Content-Type: text/plain; charset=UTF-8",
    ];
    $emailSent = @mail($mailTo, $subject, $body, implode("\r\n", $headers));

    $tokensStmt = $conexion->prepare("SELECT token, deviceId, lastSeen FROM push_tokens WHERE role = 'admin' ORDER BY lastSeen DESC");
    $tokensStmt->execute();
    $rows = $tokensStmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows || count($rows) === 0) {
        $stmtAll = $conexion->prepare("SELECT token, deviceId, lastSeen FROM push_tokens ORDER BY lastSeen DESC");
        $stmtAll->execute();
        $rows = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
    }
    $tokensByDevice = [];
    $tokens = [];
    foreach ($rows as $row) {
        $token = $row['token'] ?? '';
        if (!$token) {
            continue;
        }
        $deviceId = $row['deviceId'] ?? '';
        if ($deviceId) {
            if (!isset($tokensByDevice[$deviceId])) {
                $tokensByDevice[$deviceId] = $token;
            }
            continue;
        }
        $tokens[] = $token;
    }
    $tokens = array_values(array_unique(array_merge($tokens, array_values($tokensByDevice))));

    $pushStatus = sendFcmNotification(
        $firebaseProjectId,
        $tokens,
        'Pedido de prueba',
        "Pedido TEST-{$lastPedidoId} | Total: $" . number_format($total, 0, ',', '.'),
        [
            'url' => resolveUrl('/dashboard/pedidos'),
            'icon' => resolveUrl('/logo192.png'),
        ]
    );

    $pushOk = is_array($pushStatus) ? ($pushStatus['ok'] ?? false) : false;

    echo json_encode([
        'ok' => $pushOk,
        'push' => $pushStatus,
        'email_sent' => $emailSent ? true : false,
        'pedido' => [
            'pedido_id' => "TEST-{$lastPedidoId}",
            'whatsapp' => $whatsapp,
            'total' => $total,
        ],
    ]);
} catch (PDOException $error) {
    echo json_encode(['error' => 'Error de conexion: ' . $error->getMessage()]);
}
?>
