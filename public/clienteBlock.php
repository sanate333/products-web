<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

require __DIR__ . '/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

try {
    $dsn = "mysql:host=" . $_ENV['DB_HOST'] . ";dbname=" . $_ENV['DB_NAME'] . ";charset=utf8mb4";
    $pdo = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASS'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Add bloqueado column if it doesn't exist
    $pdo->exec("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bloqueado TINYINT(1) NOT NULL DEFAULT 0");

    $input = json_decode(file_get_contents("php://input"), true);

    if (!isset($input['idCliente']) || !isset($input['bloqueado'])) {
        http_response_code(400);
        echo json_encode(["error" => "idCliente and bloqueado are required"]);
        exit;
    }

    $idCliente = (int) $input['idCliente'];
    $bloqueado = (int) $input['bloqueado'];

    $stmt = $pdo->prepare("UPDATE clientes SET bloqueado = :bloqueado WHERE idCliente = :idCliente");
    $stmt->execute([':bloqueado' => $bloqueado, ':idCliente' => $idCliente]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["error" => "Client not found"]);
        exit;
    }

    echo json_encode(["success" => true, "idCliente" => $idCliente, "bloqueado" => $bloqueado]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>
