<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$servidor = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$usuario = $_ENV['DB_USER'];
$contrasena = $_ENV['DB_PASS'];
$dbname = $_ENV['DB_NAME'];

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        $items = $body['items'] ?? [];

        if (empty($items)) {
            echo json_encode(["error" => "No items provided"]);
            exit;
        }

        $stmt = $conexion->prepare("UPDATE `banner` SET orden = :orden WHERE idBanner = :id");
        foreach ($items as $item) {
            $stmt->execute([':orden' => (int)$item['orden'], ':id' => (int)$item['idBanner']]);
        }

        echo json_encode(["ok" => true, "updated" => count($items)]);
    } else {
        echo json_encode(["error" => "Método no permitido"]);
    }
} catch (PDOException $error) {
    echo json_encode(["error" => "Error: " . $error->getMessage()]);
}
?>
