<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Respuesta rapida para admin bypass (sin DB) ────────────────────────────
if (!empty($_SESSION['default_admin'])) {
    echo json_encode([
        "idUsuario" => 0,
        "nombre"    => $_SESSION['usuario_nombre'] ?? 'Administrador',
        "email"     => $_SESSION['usuario_email']  ?? 'admin@gmail.com',
        "rol"       => "admin",
    ]);
    exit();
}

// ── Conexion via config.php (tiene fallback de credenciales sin .env) ──────
require __DIR__ . '/config.php';

// Guardia defensiva: getenv() devuelve false (no null) cuando la var no existe.
// empty() cubre false, '', null y 0.
if (empty($DB_USER) || empty($DB_MAIN)) {
    $DB_HOST = 'localhost';
    $DB_PORT = '3306';
    $DB_MAIN = 'u274689770_sanate';
    $DB_USER = 'u274689770_sanate';
    $DB_PASS = 'Sanate009';
}

$conexion = null;
try {
    $dsn      = "mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_MAIN};charset=utf8mb4";
    $conexion = new PDO($dsn, $DB_USER, $DB_PASS);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if (!isset($_SESSION['usuario_id'])) {
        echo json_encode(["error" => "Usuario no autenticado"]);
        exit();
    }

    $usuarioId = $_SESSION['usuario_id'];
    $sql       = "SELECT idUsuario, nombre, email, rol FROM usuarios WHERE idUsuario = :id";
    $stmt      = $conexion->prepare($sql);
    $stmt->bindParam(':id', $usuarioId);

    if ($stmt->execute()) {
        if ($stmt->rowCount() > 0) {
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } else {
            echo json_encode(["error" => "Usuario no encontrado"]);
        }
    } else {
        echo json_encode(["error" => "Error al ejecutar la consulta SQL"]);
    }
} catch (PDOException $e) {
    echo json_encode(["error" => "Error de conexion: " . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(["error" => "Error: " . $e->getMessage()]);
} finally {
    $conexion = null;
}
