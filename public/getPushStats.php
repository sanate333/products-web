<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['error' => 'Metodo no permitido']);
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `push_campaigns` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        code VARCHAR(100) NULL,
        url VARCHAR(255) NULL,
        totalTokens INT NOT NULL DEFAULT 0,
        sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `push_installs` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        deviceId VARCHAR(80) NOT NULL UNIQUE,
        userAgent VARCHAR(255) NULL,
        deviceInfo VARCHAR(100) NULL,
        ip VARCHAR(64) NULL,
        installedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `push_subscribers` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        deviceId VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        whatsapp VARCHAR(40) NOT NULL,
        userAgent VARCHAR(255) NULL,
        deviceInfo VARCHAR(100) NULL,
        ip VARCHAR(64) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    $countStmt = $conexion->query("SELECT COUNT(*) FROM push_tokens");
    $totalTokens = (int)$countStmt->fetchColumn();

    $installsStmt = $conexion->query("SELECT COUNT(*) FROM push_installs");
    $totalInstalls = (int)$installsStmt->fetchColumn();

    $subsCountStmt = $conexion->query("SELECT COUNT(*) FROM push_subscribers");
    $totalSubscribers = (int)$subsCountStmt->fetchColumn();

    $subsStmt = $conexion->query("SELECT deviceId, name, whatsapp, deviceInfo, ip, city, region, country, updatedAt FROM push_subscribers ORDER BY updatedAt DESC LIMIT 50");
    $subscribers = $subsStmt->fetchAll(PDO::FETCH_ASSOC);

    $campaignStmt = $conexion->query("SELECT id, title, body, code, url, totalTokens, sentAt FROM push_campaigns ORDER BY sentAt DESC LIMIT 20");
    $campaigns = $campaignStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true,
        'totalTokens' => $totalTokens,
        'totalInstalls' => $totalInstalls,
        'totalSubscribers' => $totalSubscribers,
        'subscribers' => $subscribers,
        'campaigns' => $campaigns,
    ]);
} catch (PDOException $error) {
    echo json_encode(['error' => 'Error de conexion: ' . $error->getMessage()]);
}
?>
