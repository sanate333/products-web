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

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $conexion->exec("CREATE TABLE IF NOT EXISTS `clientes` (
        idCliente INT(11) AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NULL,
        whatsapp VARCHAR(30) NOT NULL UNIQUE,
        direccion VARCHAR(255) NULL,
        ciudad VARCHAR(100) NULL,
        departamento VARCHAR(100) NULL,
        totalPedidos INT(11) NOT NULL DEFAULT 0,
        totalGastado DECIMAL(10,2) NOT NULL DEFAULT 0,
        ultimoPedido TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    $stmt = $conexion->prepare("SELECT idCliente, nombre, whatsapp, direccion, ciudad, departamento, totalPedidos, totalGastado, ultimoPedido, createdAt, updatedAt FROM clientes ORDER BY ultimoPedido DESC, idCliente DESC");
    $stmt->execute();
    $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['clientes' => $clientes]);
} catch (PDOException $error) {
    echo json_encode(['error' => $error->getMessage()]);
}
?>
