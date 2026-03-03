<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['error' => 'Metodo no permitido.']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $orden = isset($data['orden']) && is_array($data['orden']) ? $data['orden'] : [];

    if (empty($orden)) {
        echo json_encode(['error' => 'Orden vacio.']);
        exit;
    }

    $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'categorias' AND COLUMN_NAME = 'orden'");
    $stmt->execute([':dbname' => $dbname]);
    if ((int)$stmt->fetchColumn() === 0) {
        $conexion->exec("ALTER TABLE `categorias` ADD COLUMN orden INT(11) NULL DEFAULT NULL");
    }

    $conexion->beginTransaction();
    $update = $conexion->prepare("UPDATE categorias SET orden = :orden WHERE idCategoria = :idCategoria");
    foreach ($orden as $index => $idCategoria) {
        $update->execute([
            ':orden' => $index + 1,
            ':idCategoria' => $idCategoria,
        ]);
    }
    $conexion->commit();

    echo json_encode(['mensaje' => 'Orden actualizado.']);
} catch (PDOException $error) {
    if ($conexion && $conexion->inTransaction()) {
        $conexion->rollBack();
    }
    echo json_encode(['error' => 'Error de conexion: ' . $error->getMessage()]);
}
?>
