<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['error' => 'Metodo no permitido.']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $idProducto = isset($data['idProducto']) ? (int)$data['idProducto'] : 0;
    $imagenes = isset($data['imagenes']) && is_array($data['imagenes']) ? $data['imagenes'] : [];

    if ($idProducto <= 0 || empty($imagenes)) {
        echo json_encode(['error' => 'Datos incompletos.']);
        exit;
    }

    $imagenes = array_values(array_filter($imagenes, function ($item) {
        return is_string($item) && trim($item) !== '';
    }));

    $imagenes = array_slice($imagenes, 0, 4);
    $imagen1 = $imagenes[0] ?? null;
    $imagen2 = $imagenes[1] ?? null;
    $imagen3 = $imagenes[2] ?? null;
    $imagen4 = $imagenes[3] ?? null;

    $sql = "UPDATE productos
            SET imagen1 = :imagen1,
                imagen2 = :imagen2,
                imagen3 = :imagen3,
                imagen4 = :imagen4
            WHERE idProducto = :idProducto";
    $stmt = $conexion->prepare($sql);
    $stmt->bindParam(':imagen1', $imagen1);
    $stmt->bindParam(':imagen2', $imagen2);
    $stmt->bindParam(':imagen3', $imagen3);
    $stmt->bindParam(':imagen4', $imagen4);
    $stmt->bindParam(':idProducto', $idProducto, PDO::PARAM_INT);

    if ($stmt->execute()) {
        echo json_encode(['mensaje' => 'Orden de imagenes actualizado.']);
    } else {
        echo json_encode(['error' => 'No se pudo actualizar el orden de imagenes.']);
    }
} catch (PDOException $error) {
    echo json_encode(['error' => 'Error de conexion: ' . $error->getMessage()]);
}
?>
