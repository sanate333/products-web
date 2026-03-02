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
$deviceId = $input['deviceId'] ?? '';
$name = $input['name'] ?? '';
$whatsapp = $input['whatsapp'] ?? '';
$userAgent = $input['userAgent'] ?? null;
$deviceInfo = $input['deviceInfo'] ?? null;
$ip = $_SERVER['REMOTE_ADDR'] ?? null;
$city = null;
$region = null;
$country = null;

function isPrivateIp($ip) {
    if (!$ip) return true;
    return preg_match('/^(10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.)/', $ip) === 1;
}

function lookupIpCity($ip) {
    if (!$ip || isPrivateIp($ip)) return null;
    $url = "http://ip-api.com/json/" . urlencode($ip) . "?fields=status,city,regionName,country";
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 2,
        ],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if (!$raw) return null;
    $data = json_decode($raw, true);
    if (!is_array($data) || ($data['status'] ?? '') !== 'success') return null;
    return [
        'city' => $data['city'] ?? null,
        'region' => $data['regionName'] ?? null,
        'country' => $data['country'] ?? null,
    ];
}

if (!$deviceId || !$name || !$whatsapp) {
    echo json_encode(['error' => 'Datos incompletos']);
    exit;
}

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $location = lookupIpCity($ip);
    if ($location) {
        $city = $location['city'];
        $region = $location['region'];
        $country = $location['country'];
    }

    $conexion->exec("CREATE TABLE IF NOT EXISTS `push_subscribers` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        deviceId VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        whatsapp VARCHAR(40) NOT NULL,
        userAgent VARCHAR(255) NULL,
        deviceInfo VARCHAR(100) NULL,
        ip VARCHAR(64) NULL,
        city VARCHAR(120) NULL,
        region VARCHAR(120) NULL,
        country VARCHAR(120) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    $columns = [
        'city' => "ALTER TABLE `push_subscribers` ADD COLUMN city VARCHAR(120) NULL",
        'region' => "ALTER TABLE `push_subscribers` ADD COLUMN region VARCHAR(120) NULL",
        'country' => "ALTER TABLE `push_subscribers` ADD COLUMN country VARCHAR(120) NULL",
        'deviceInfo' => "ALTER TABLE `push_subscribers` ADD COLUMN deviceInfo VARCHAR(100) NULL",
    ];
    foreach ($columns as $column => $sql) {
        $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'push_subscribers' AND COLUMN_NAME = :column");
        $stmt->execute([':dbname' => $dbname, ':column' => $column]);
        if ((int)$stmt->fetchColumn() === 0) {
            $conexion->exec($sql);
        }
    }

    $stmt = $conexion->prepare("INSERT INTO push_subscribers (deviceId, name, whatsapp, userAgent, deviceInfo, ip, city, region, country)
        VALUES (:deviceId, :name, :whatsapp, :userAgent, :deviceInfo, :ip, :city, :region, :country)
        ON DUPLICATE KEY UPDATE name = VALUES(name), whatsapp = VALUES(whatsapp), userAgent = VALUES(userAgent),
        deviceInfo = VALUES(deviceInfo), ip = VALUES(ip), city = VALUES(city), region = VALUES(region), country = VALUES(country),
        updatedAt = CURRENT_TIMESTAMP");
    $stmt->bindParam(':deviceId', $deviceId);
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':whatsapp', $whatsapp);
    $stmt->bindParam(':userAgent', $userAgent);
    $stmt->bindParam(':deviceInfo', $deviceInfo);
    $stmt->bindParam(':ip', $ip);
    $stmt->bindParam(':city', $city);
    $stmt->bindParam(':region', $region);
    $stmt->bindParam(':country', $country);
    $stmt->execute();

    echo json_encode(['ok' => true]);
} catch (PDOException $error) {
    echo json_encode(['error' => 'Error de conexion: ' . $error->getMessage()]);
}
?>
