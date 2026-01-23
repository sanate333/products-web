<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Permitir solicitudes desde cualquier origen (no seguro para producción)

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
    // Establecer conexión a la base de datos
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

    // Verificar el método de la solicitud
    $metodo = $_SERVER['REQUEST_METHOD'];

    // Consulta SQL para obtener todos los productos
    if ($metodo == 'GET') {
        $includeOutOfStock = isset($_GET['includeOutOfStock']) && $_GET['includeOutOfStock'] === '1';
        if ($includeOutOfStock) {
            $sqlSelect = "SELECT * FROM productos";
        } else {
            $sqlSelect = "SELECT * FROM productos WHERE estadoProducto IS NULL OR estadoProducto <> 'Desactivado'";
        }
        $sentencia = $conexion->prepare($sqlSelect);

        if ($sentencia->execute()) {
            // Obtener resultados
            $resultado = $sentencia->fetchAll(PDO::FETCH_ASSOC);

            // Imprimir datos en formato JSON
            echo json_encode(["productos" => $resultado]);
        } else {
            // Imprimir mensaje de error si la ejecución de la consulta falla
            echo json_encode(["error" => "Error al ejecutar la consulta SQL: " . implode(", ", $sentencia->errorInfo())]);
        }
    }
} catch (PDOException $error) {
    // Manejar errores específicos de la conexión
    echo json_encode(["error" => "Error de conexión: " . $error->getMessage()]);
} catch (Exception $error) {
    // Manejar otros tipos de errores
    echo json_encode(["error" => "Error desconocido: " . $error->getMessage()]);
}
?>
