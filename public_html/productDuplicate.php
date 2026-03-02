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

$idProducto = $_GET['idProducto'] ?? null;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Metodo no permitido']);
    exit;
}

if (!$idProducto) {
    echo json_encode(['error' => 'Id de producto requerido']);
    exit;
}

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'productos' AND COLUMN_NAME = 'stock'");
    $stmt->execute([':dbname' => $dbname]);
    if ((int)$stmt->fetchColumn() === 0) {
        $conexion->exec("ALTER TABLE `productos` ADD COLUMN stock INT(11) NULL DEFAULT NULL");
    }
    $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'productos' AND COLUMN_NAME = 'estadoProducto'");
    $stmt->execute([':dbname' => $dbname]);
    if ((int)$stmt->fetchColumn() === 0) {
        $conexion->exec("ALTER TABLE `productos` ADD COLUMN estadoProducto VARCHAR(20) NULL DEFAULT 'Activo'");
    }
    $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'productos' AND COLUMN_NAME = 'tieneVariantes'");
    $stmt->execute([':dbname' => $dbname]);
    if ((int)$stmt->fetchColumn() === 0) {
        $conexion->exec("ALTER TABLE `productos` ADD COLUMN tieneVariantes TINYINT(1) NULL DEFAULT 0");
    }

    $sqlInsert = "INSERT INTO productos (
        descripcion, titulo, precio, idCategoria, masVendido,
        imagen1, imagen2, imagen3, imagen4,
        item1, item2, item3, item4, item5, item6, item7, item8, item9, item10,
        precioAnterior, stock, estadoProducto, tieneVariantes, createdAt
    )
    SELECT
        descripcion, CONCAT(titulo, ' (copia)') AS titulo, precio, idCategoria, masVendido,
        imagen1, imagen2, imagen3, imagen4,
        item1, item2, item3, item4, item5, item6, item7, item8, item9, item10,
        precioAnterior, stock, estadoProducto, tieneVariantes, NOW()
    FROM productos
    WHERE idProducto = :idProducto";

    $stmtInsert = $conexion->prepare($sqlInsert);
    $stmtInsert->bindParam(':idProducto', $idProducto, PDO::PARAM_INT);
    $stmtInsert->execute();

    echo json_encode(['mensaje' => 'Producto duplicado correctamente']);
} catch (PDOException $error) {
    echo json_encode(['error' => 'Error de conexion: ' . $error->getMessage()]);
}
?>
