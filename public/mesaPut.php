<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejo de solicitudes OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Cargar variables de entorno desde el archivo .env
require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Obtener los valores de las variables de entorno
$servidor = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$usuario = $_ENV['DB_USER'];
$contrasena = $_ENV['DB_PASS'];
$dbname = $_ENV['DB_NAME'];

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $idMesa = isset($_GET['idMesa']) ? $_GET['idMesa'] : null;
        $data = json_decode(file_get_contents("php://input"), true);
        $nuevaMesa = isset($data['mesa']) ? $data['mesa'] : null;
        $nuevoEstado = isset($data['estado']) ? $data['estado'] : null;

        // if (!$idMesa || !$nuevaMesa || !$nuevoEstado) {
        //     echo json_encode(["error" => "Se requiere proporcionar un ID de mesa, un nuevo nombre de mesa y un nuevo estado para actualizarla."]);
        //     exit;
        // }

        // Actualizar la mesa y su estado en la base de datos
        $sqlUpdate = "UPDATE mesas SET mesa = :mesa, estado = :estado WHERE idMesa = :idMesa";
        $sentenciaUpdate = $conexion->prepare($sqlUpdate);
        $sentenciaUpdate->bindParam(':mesa', $nuevaMesa);
        $sentenciaUpdate->bindParam(':estado', $nuevoEstado);
        $sentenciaUpdate->bindParam(':idMesa', $idMesa, PDO::PARAM_INT);

        if ($sentenciaUpdate->execute()) {
            echo json_encode(["mensaje" => "Mesa actualizada correctamente"]);
        } else {
            echo json_encode(["error" => "Error al actualizar la mesa: " . implode(", ", $sentenciaUpdate->errorInfo())]);
        }

        exit;
    }
} catch (PDOException $error) {
    echo json_encode(["error" => "Error de conexión: " . $error->getMessage()]);
}
?>
