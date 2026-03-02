<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
session_start();

// Responder rápido para admin por bypass
if (!empty($_SESSION['default_admin'])) {
    echo json_encode([
        "idUsuario" => 0,
        "nombre" => $_SESSION['usuario_nombre'] ?? 'Administrador',
        "email" => $_SESSION['usuario_email'] ?? 'admin@gmail.com',
        "rol" => "admin"
    ]);
    exit();
}

// Cargar variables de entorno
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

    if (!isset($_SESSION['usuario_id'])) {
        echo json_encode(["error" => "Usuario no autenticado"]);
        exit();
    }

    $usuarioId = $_SESSION['usuario_id'];

    $sqlSelectUsuario = "SELECT idUsuario, nombre, email, rol FROM `usuarios` WHERE idUsuario = :idUsuario";
    $stmtUsuario = $conexion->prepare($sqlSelectUsuario);
    $stmtUsuario->bindParam(':idUsuario', $usuarioId);

    if ($stmtUsuario->execute()) {
        if ($stmtUsuario->rowCount() > 0) {
            $resultadoUsuario = $stmtUsuario->fetch(PDO::FETCH_ASSOC);
            echo json_encode($resultadoUsuario);
        } else {
            echo json_encode(["error" => "Usuario no encontrado"]);
        }
    } else {
        echo json_encode(["error" => "Error al ejecutar la consulta SQL"]);
    }
} catch (PDOException $error) {
    echo json_encode(["error" => "Error de conexion: " . $error->getMessage()]);
} catch (Exception $error) {
    echo json_encode(["error" => "Error desconocido: " . $error->getMessage()]);
} finally {
    $conexion = null;
}
