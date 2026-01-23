<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
session_start();

$bypassEmail = 'admin@gmail.com';
$bypassPass = 'admin1234';

// Bypass sin tocar la base de datos
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $emailLogin = $_POST['email'] ?? '';
    $contrasenaLogin = $_POST['contrasena'] ?? '';

    if ($emailLogin === $bypassEmail && $contrasenaLogin === $bypassPass) {
        $_SESSION['usuario_id'] = 0;
        $_SESSION['rol'] = 'admin';
        $_SESSION['default_admin'] = true;
        $_SESSION['usuario_nombre'] = 'Administrador';
        $_SESSION['usuario_email'] = $emailLogin;

        $usuario = [
            "idUsuario" => 0,
            "nombre" => "Administrador",
            "email" => $emailLogin,
        ];

        echo json_encode(["mensaje" => "ok", "redirect" => "dashboard.php", "usuario" => $usuario]);
        exit();
    }
}

// Si no es bypass, intentamos contra la base de datos
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

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $emailLogin = $_POST['email'] ?? '';
        $contrasenaLogin = $_POST['contrasena'] ?? '';

        $sqlCheckCredenciales = "SELECT idUsuario, nombre, email, contrasena, rol FROM `usuarios` WHERE email = :email";
        $stmtCheckCredenciales = $conexion->prepare($sqlCheckCredenciales);
        $stmtCheckCredenciales->bindParam(':email', $emailLogin);
        $stmtCheckCredenciales->execute();

        if ($stmtCheckCredenciales->rowCount() > 0) {
            $row = $stmtCheckCredenciales->fetch(PDO::FETCH_ASSOC);
            $contrasenaHash = $row['contrasena'];

            if (password_verify($contrasenaLogin, $contrasenaHash)) {
                if ($row['rol'] == 'admin') {
                    $_SESSION['usuario_id'] = $row['idUsuario'];
                    $_SESSION['rol'] = $row['rol'];
                    $_SESSION['default_admin'] = false;
                    $_SESSION['usuario_nombre'] = $row['nombre'];
                    $_SESSION['usuario_email'] = $row['email'];

                    $usuario = [
                        "idUsuario" => $row['idUsuario'],
                        "nombre" => $row['nombre'],
                        "email" => $row['email'],
                    ];

                    echo json_encode(["mensaje" => "ok", "redirect" => "dashboard.php", "usuario" => $usuario]);
                } else {
                    echo json_encode(["error" => "No tienes permisos para acceder"]);
                }
                exit();
            } else {
                echo json_encode(["error" => "Contrasena incorrecta"]);
            }
        } else {
            echo json_encode(["error" => "Usuario no encontrado"]);
        }
    } else {
        echo json_encode(["error" => "Metodo no permitido"]);
    }
} catch (PDOException $error) {
    echo json_encode(["error" => "Error de conexion: " . $error->getMessage()]);
}
