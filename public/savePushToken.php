<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Metodo no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';
$userAgent = $input['userAgent'] ?? null;
$deviceInfo = $input['deviceInfo'] ?? null;
$deviceId = $input['deviceId'] ?? null;
$role = $input['role'] ?? null;
$ip = $_SERVER['REMOTE_ADDR'] ?? null;
if (!$token) {
    echo json_encode(['error' => 'Token requerido']);
    exit;
}

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

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

    $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'push_tokens' AND COLUMN_NAME = :column");
    $stmt->execute([':dbname' => $dbname, ':column' => 'userAgent']);
    $hasUserAgent = (int)$stmt->fetchColumn() > 0;
    if (!$hasUserAgent) {
        $conexion->exec("ALTER TABLE `push_tokens` ADD COLUMN userAgent VARCHAR(255) NULL");
    }

    $stmt->execute([':dbname' => $dbname, ':column' => 'lastSeen']);
    $hasLastSeen = (int)$stmt->fetchColumn() > 0;
    if (!$hasLastSeen) {
        $conexion->exec("ALTER TABLE `push_tokens` ADD COLUMN lastSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }

    $stmt->execute([':dbname' => $dbname, ':column' => 'deviceId']);
    $hasDeviceId = (int)$stmt->fetchColumn() > 0;
    if (!$hasDeviceId) {
        $conexion->exec("ALTER TABLE `push_tokens` ADD COLUMN deviceId VARCHAR(80) NULL");
    }

    $stmt->execute([':dbname' => $dbname, ':column' => 'deviceInfo']);
    $hasDeviceInfo = (int)$stmt->fetchColumn() > 0;
    if (!$hasDeviceInfo) {
        $conexion->exec("ALTER TABLE `push_tokens` ADD COLUMN deviceInfo VARCHAR(100) NULL");
    }

    $stmt->execute([':dbname' => $dbname, ':column' => 'ip']);
    $hasIp = (int)$stmt->fetchColumn() > 0;
    if (!$hasIp) {
        $conexion->exec("ALTER TABLE `push_tokens` ADD COLUMN ip VARCHAR(64) NULL");
    }
    $stmt->execute([':dbname' => $dbname, ':column' => 'role']);
    $hasRole = (int)$stmt->fetchColumn() > 0;
    if (!$hasRole) {
        $conexion->exec("ALTER TABLE `push_tokens` ADD COLUMN role VARCHAR(30) NULL");
    }

    if ($deviceId) {
        $cleanup = $conexion->prepare("DELETE FROM push_tokens WHERE deviceId = :deviceId AND token != :token");
        $cleanup->execute([':deviceId' => $deviceId, ':token' => $token]);
    }

    $stmt = $conexion->prepare("INSERT INTO push_tokens (token, userAgent, deviceInfo, deviceId, role, ip) VALUES (:token, :userAgent, :deviceInfo, :deviceId, :role, :ip)
        ON DUPLICATE KEY UPDATE userAgent = VALUES(userAgent), deviceInfo = VALUES(deviceInfo), deviceId = VALUES(deviceId), role = VALUES(role), ip = VALUES(ip), lastSeen = CURRENT_TIMESTAMP");
    $stmt->bindParam(':token', $token);
    $stmt->bindParam(':userAgent', $userAgent);
    $stmt->bindParam(':deviceInfo', $deviceInfo);
    $stmt->bindParam(':deviceId', $deviceId);
    $stmt->bindParam(':role', $role);
    $stmt->bindParam(':ip', $ip);
    $stmt->execute();

    echo json_encode(['ok' => true]);
} catch (PDOException $error) {
    echo json_encode(['error' => 'Error de conexion: ' . $error->getMessage()]);
}
?>
