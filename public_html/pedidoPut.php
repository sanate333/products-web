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
$mensaje = "";

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $idPedido = isset($_GET['idPedido']) ? $_GET['idPedido'] : null;
        $data = json_decode(file_get_contents("php://input"), true);
        $nuevoEstado = isset($data['estado']) ? $data['estado'] : null;

        // Obtener el idMesa del pedido
        $sqlSelect = "SELECT idMesa FROM pedidos WHERE idPedido = :idPedido";
        $sentenciaSelect = $conexion->prepare($sqlSelect);
        $sentenciaSelect->bindParam(':idPedido', $idPedido, PDO::PARAM_INT);
        $sentenciaSelect->execute();
        $resultado = $sentenciaSelect->fetch(PDO::FETCH_ASSOC);

        if ($resultado) {
            $idMesa = $resultado['idMesa'];

            // Actualizar el estado del pedido
            $sqlUpdatePedido = "UPDATE pedidos SET estado = :estado WHERE idPedido = :idPedido";
            $sentenciaUpdatePedido = $conexion->prepare($sqlUpdatePedido);
            $sentenciaUpdatePedido->bindParam(':estado', $nuevoEstado);
            $sentenciaUpdatePedido->bindParam(':idPedido', $idPedido, PDO::PARAM_INT);

            if ($sentenciaUpdatePedido->execute()) {
                if ($nuevoEstado === 'Pagado' || $nuevoEstado === 'Rechazado') {
                    // Actualizar el estado de la mesa a 'libre'
                    $sqlUpdateMesa = "UPDATE mesas SET estado = 'libre' WHERE idMesa = :idMesa";
                    $sentenciaUpdateMesa = $conexion->prepare($sqlUpdateMesa);
                    $sentenciaUpdateMesa->bindParam(':idMesa', $idMesa, PDO::PARAM_INT);

                    if ($sentenciaUpdateMesa->execute()) {
                        echo json_encode(["mensaje" => "Estado del pedido y de la mesa actualizados correctamente"]);
                    } else {
                        echo json_encode(["error" => "Error al actualizar el estado de la mesa: " . implode(", ", $sentenciaUpdateMesa->errorInfo())]);
                    }
                } else {
                    echo json_encode(["mensaje" => "Estado del pedido actualizado correctamente"]);
                }
            } else {
                echo json_encode(["error" => "Error al actualizar el estado del pedido: " . implode(", ", $sentenciaUpdatePedido->errorInfo())]);
            }
        } else {
            echo json_encode(["error" => "Pedido no encontrado"]);
        }
        exit;
    }
} catch (PDOException $error) {
    echo json_encode(["error" => "Error de conexión: " . $error->getMessage()]);
}
?>
