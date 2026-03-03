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
        $idPedido = isset($_GET['idPedido']) ? $_GET['idPedido'] : null;
        $data = json_decode(file_get_contents("php://input"), true);
        $nuevosProductos = isset($data['productos']) ? $data['productos'] : null;
        $nuevoTotal = isset($data['total']) ? $data['total'] : null;

        if ($idPedido && $nuevosProductos !== null && $nuevoTotal !== null) {
            // Obtener los detalles actuales del pedido
            $sqlSelect = "SELECT productos, total, estado FROM pedidos WHERE idPedido = :idPedido";
            $sentenciaSelect = $conexion->prepare($sqlSelect);
            $sentenciaSelect->bindParam(':idPedido', $idPedido, PDO::PARAM_INT);
            $sentenciaSelect->execute();
            $resultado = $sentenciaSelect->fetch(PDO::FETCH_ASSOC);

            if ($resultado) {
                // Verificar el estado del pedido
                if ($resultado['estado'] === 'Rechazado' || $resultado['estado'] === 'Pagado') {
                    echo json_encode(["error" => "No se puede editar un pedido que está en estado 'Rechazado' o 'Pagado'"]);
                } else {
                    $productosActuales = json_decode($resultado['productos'], true);

                    // Combinar los productos existentes con los nuevos
                    foreach ($nuevosProductos as $nuevoProducto) {
                        $productoExistente = false;
                        foreach ($productosActuales as &$producto) {
                            if ($producto['titulo'] === $nuevoProducto['titulo'] && $producto['item'] === $nuevoProducto['item']) {
                                $producto['cantidad'] += $nuevoProducto['cantidad'];
                                $productoExistente = true;
                                break;
                            }
                        }
                        if (!$productoExistente) {
                            $productosActuales[] = $nuevoProducto;
                        }
                    }
                    $productosActualizados = json_encode($productosActuales);

                    // Actualizar el total sumando el nuevo total al existente
                    $totalActualizado = $resultado['total'] + $nuevoTotal;

                    // Actualizar el pedido con los nuevos productos y total
                    $sqlUpdatePedido = "UPDATE pedidos SET productos = :productos, total = :total WHERE idPedido = :idPedido";
                    $sentenciaUpdatePedido = $conexion->prepare($sqlUpdatePedido);
                    $sentenciaUpdatePedido->bindParam(':productos', $productosActualizados);
                    $sentenciaUpdatePedido->bindParam(':total', $totalActualizado);
                    $sentenciaUpdatePedido->bindParam(':idPedido', $idPedido, PDO::PARAM_INT);

                    if ($sentenciaUpdatePedido->execute()) {
                        echo json_encode(["mensaje" => "Pedido actualizado correctamente"]);
                    } else {
                        echo json_encode(["error" => "Error al actualizar el pedido: " . implode(", ", $sentenciaUpdatePedido->errorInfo())]);
                    }
                }
            } else {
                echo json_encode(["error" => "Pedido no encontrado"]);
            }
        } else {
            echo json_encode(["error" => "Datos incompletos"]);
        }
        exit;
    }
} catch (PDOException $error) {
    echo json_encode(["error" => "Error de conexión: " . $error->getMessage()]);
}
?>
