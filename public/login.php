<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$bypassEmail = 'admin@gmail.com';
$bypassPass  = 'admin1234';

// ── Bypass: no requiere base de datos ni .env ──────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $emailLogin    = $_POST['email']     ?? '';
    $contrasenaLogin = $_POST['contrasena'] ?? '';
    if ($emailLogin === $bypassEmail && $contrasenaLogin === $bypassPass) {
        $_SESSION['usuario_id']    = 0;
        $_SESSION['rol']           = 'admin';
        $_SESSION['default_admin'] = true;
        $_SESSION['usuario_nombre'] = 'Administrador';
        $_SESSION['usuario_email']  = $emailLogin;
        echo json_encode([
            "mensaje"  => "ok",
            "redirect" => "dashboard.php",
            "usuario"  => ["idUsuario" => 0, "nombre" => "Administrador", "email" => $emailLogin],
        ]);
        exit();
    }
}

// ── Conexion via config.php (tiene fallback de credenciales sin .env) ──────
require __DIR__ . '/config.php';

try {
    $dsn     = "mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_MAIN};charset=utf8mb4";
    $conexion = new PDO($dsn, $DB_USER, $DB_PASS);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $emailLogin      = $_POST['email']      ?? '';
        $contrasenaLogin = $_POST['contrasena'] ?? '';

        $sql  = "SELECT idUsuario, nombre, email, contrasena, rol FROM usuarios WHERE email = :email";
        $stmt = $conexion->prepare($sql);
        $stmt->bindParam(':email', $emailLogin);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (password_verify($contrasenaLogin, $row['contrasena'])) {
                if ($row['rol'] === 'admin') {
                    $_SESSION['usuario_id']     = $row['idUsuario'];
                    $_SESSION['rol']            = $row['rol'];
                    $_SESSION['default_admin']  = false;
                    $_SESSION['usuario_nombre'] = $row['nombre'];
                    $_SESSION['usuario_email']  = $row['email'];
                    echo json_encode([
                        "mensaje"  => "ok",
                        "redirect" => "dashboard.php",
                        "usuario"  => [
                            "idUsuario" => $row['idUsuario'],
                            "nombre"    => $row['nombre'],
                            "email"     => $row['email'],
                        ],
                    ]);
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
} catch (PDOException $e) {
    echo json_encode(["error" => "Error de conexion: " . $e->getMessage()]);
}
