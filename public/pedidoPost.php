<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Recuperar datos del pedido
        $idMesa = $_POST['idMesa'];
        $estado = $_POST['estado'];
        $productos = json_decode($_POST['productos'], true);
        $total = $_POST['total'];
        $nombre = $_POST['nombre'];
        $nota = $_POST['nota'];
        $codigo = $_POST['codigo'];
        // Validar que los campos no estén vacíos
        if (!empty($idMesa) && !empty($estado) && !empty($productos) && !empty($total) && !empty($nombre)) {
            // Insertar el pedido en la base de datos
            $sqlInsertPedido = "INSERT INTO `pedidos` (idMesa, estado, productos, total,nombre,nota,codigo) 
                                VALUES (:idMesa, :estado, :productos, :total, :nombre, :nota, :codigo)";
            $stmtPedido = $conexion->prepare($sqlInsertPedido);
            $stmtPedido->bindParam(':idMesa', $idMesa);
            $stmtPedido->bindParam(':estado', $estado);
            $stmtPedido->bindParam(':productos', $_POST['productos']);
            $stmtPedido->bindParam(':total', $total);
            $stmtPedido->bindParam(':nombre', $nombre);
            $stmtPedido->bindParam(':nota', $nota);
            $stmtPedido->bindParam(':codigo', $codigo);
            $stmtPedido->execute();

            // Obtener el ID del último pedido insertado
            $lastPedidoId = $conexion->lastInsertId();

            // Actualizar el estado de la mesa a "ocupada"
            $sqlUpdateMesa = "UPDATE `mesas` SET estado = 'ocupada' WHERE idMesa = :idMesa";
            $stmtUpdateMesa = $conexion->prepare($sqlUpdateMesa);
            $stmtUpdateMesa->bindParam(':idMesa', $idMesa);
            $stmtUpdateMesa->execute();

            // Respuesta JSON con el mensaje y el ID del nuevo pedido
            echo json_encode([
                "mensaje" => "$nombre tu pedido es el N°$lastPedidoId",
                "idPedido" => $lastPedidoId
            ]);
        } else {
            echo json_encode(["error" => "Por favor, complete todos los campos correctamente"]);
        }
    } else {
        echo json_encode(["error" => "Método no permitido"]);
    }
} catch (PDOException $error) {
    echo json_encode(["error" => "Error de conexión: " . $error->getMessage()]);
}
?>
