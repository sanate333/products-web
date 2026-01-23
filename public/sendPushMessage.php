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

require __DIR__ . '/fcm.php';
$firebaseProjectId = $_ENV['FIREBASE_PROJECT_ID'] ?? '';

function ensureCampaignTable($conexion) {
    $conexion->exec("CREATE TABLE IF NOT EXISTS `push_campaigns` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        code VARCHAR(100) NULL,
        url VARCHAR(255) NULL,
        totalTokens INT NOT NULL DEFAULT 0,
        sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
}

function ensureTokenTable($conexion) {
    $conexion->exec("CREATE TABLE IF NOT EXISTS `push_tokens` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        userAgent VARCHAR(255) NULL,
        deviceInfo VARCHAR(100) NULL,
        deviceId VARCHAR(80) NULL,
        role VARCHAR(30) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'push_tokens' AND COLUMN_NAME = :column");
    $stmt->execute([':dbname' => $GLOBALS['dbname'], ':column' => 'role']);
    $hasRole = (int)$stmt->fetchColumn() > 0;
    if (!$hasRole) {
        $conexion->exec("ALTER TABLE `push_tokens` ADD COLUMN role VARCHAR(30) NULL");
    }
}

function ensureSubscribersTable($conexion) {
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

function getTokensForTarget($conexion, $deviceId, $whatsapp, $role) {
    ensureTokenTable($conexion);
    if ($deviceId) {
        $stmt = $conexion->prepare("SELECT token FROM push_tokens WHERE deviceId = :deviceId");
        $stmt->execute([':deviceId' => $deviceId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    if ($role) {
        $stmt = $conexion->prepare("SELECT token FROM push_tokens WHERE role = :role");
        $stmt->execute([':role' => $role]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    if ($whatsapp) {
        ensureSubscribersTable($conexion);
        $stmt = $conexion->prepare("SELECT pt.token FROM push_tokens pt JOIN push_subscribers ps ON ps.deviceId = pt.deviceId WHERE ps.whatsapp = :whatsapp");
        $stmt->execute([':whatsapp' => $whatsapp]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    $stmt = $conexion->prepare("SELECT token FROM push_tokens");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Metodo no permitido']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$title = trim($payload['title'] ?? 'Sanate - Nueva orden');
$body = trim($payload['body'] ?? 'Tienes una nueva promocion.');
$code = trim($payload['code'] ?? '');
$url = trim($payload['url'] ?? '/');
$deviceId = trim($payload['deviceId'] ?? '');
$whatsapp = trim($payload['whatsapp'] ?? '');
$targetRole = trim($payload['targetRole'] ?? '');

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    ensureCampaignTable($conexion);

    $finalBody = $body;
    if ($code && stripos($finalBody, $code) === false) {
        $finalBody = $finalBody . ' Codigo: ' . $code;
    }

    $resolvedUrl = resolveUrl($url ?: '/');
    $data = [
        'title' => (string)$title,
        'body' => (string)$finalBody,
        'url' => (string)$resolvedUrl,
        'code' => (string)$code,
        'icon' => resolveUrl('/logo192.png'),
        'tag' => 'promo-' . time(),
        'type' => 'promo',
    ];

    $tokens = getTokensForTarget($conexion, $deviceId, $whatsapp, $targetRole);
    $status = sendFcmNotification($firebaseProjectId, $tokens, $title, $finalBody, $data);

    $countStmt = $conexion->query("SELECT COUNT(*) FROM push_tokens");
    $totalTokens = (int)$countStmt->fetchColumn();
    $insert = $conexion->prepare("INSERT INTO push_campaigns (title, body, code, url, totalTokens) VALUES (:title, :body, :code, :url, :totalTokens)");
    $insert->execute([
        ':title' => $title,
        ':body' => $finalBody,
        ':code' => $code,
        ':url' => $url,
        ':totalTokens' => $totalTokens,
    ]);

    echo json_encode(['ok' => true, 'push' => $status, 'totalTokens' => $totalTokens]);
} catch (PDOException $error) {
    echo json_encode(['error' => 'Error de conexion: ' . $error->getMessage()]);
}
?>

