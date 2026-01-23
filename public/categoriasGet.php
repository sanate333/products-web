<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$servidor = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$usuario = $_ENV['DB_USER'];
$contrasena = $_ENV['DB_PASS'];
$dbname = $_ENV['DB_NAME'];
$mensaje = "";

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'categorias' AND COLUMN_NAME = 'orden'");
    $stmt->execute([':dbname' => $dbname]);
    if ((int)$stmt->fetchColumn() === 0) {
        $conexion->exec("ALTER TABLE `categorias` ADD COLUMN orden INT(11) NULL DEFAULT NULL");
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $sqlSelect = "SELECT idCategoria, categoria, orden FROM `categorias` ORDER BY orden IS NULL, orden ASC, idCategoria ASC";
        $stmt = $conexion->query($sqlSelect);
        $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["categorias" => $categorias]);
    } else {
        echo json_encode(["error" => "Metodo no permitido"]);
    }
} catch (PDOException $error) {
    echo json_encode(["error" => "Error de conexion: " . $error->getMessage()]);
}
?>
