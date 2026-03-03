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
$mensaje = "";

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $mesa = $_POST['mesa'];
        $estado = isset($_POST['estado']) ? $_POST['estado'] : 'libre'; 

        if (!empty($mesa)) {

            // Almacenar en la base de datos
            $sqlInsert = "INSERT INTO `mesas` (mesa, estado) 
                          VALUES (:mesa ,:estado)";
            $stmt = $conexion->prepare($sqlInsert);
            $stmt->bindParam(':mesa', $mesa);
            $stmt->bindParam(':estado', $estado);

            $stmt->execute();

            // Obtener el ID de la última inserción
            $lastId = $conexion->lastInsertId();

            // Respuesta JSON con el mensaje y el ID de la nueva mesa
            echo json_encode([
                "mensaje" => "Mesa creada exitosamente",
                "idMesa" => $lastId
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