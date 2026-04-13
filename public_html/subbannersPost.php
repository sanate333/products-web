<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$servidor = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$usuario = $_ENV['DB_USER'];
$contrasena = $_ENV['DB_PASS'];
$dbname = $_ENV['DB_NAME'];
$rutaweb = $_ENV['RUTA_WEB'];

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] === UPLOAD_ERR_OK) {
            $carpetaImagenes = './imagenes_subbanners';
            if (!file_exists($carpetaImagenes)) {
                mkdir($carpetaImagenes, 0777, true);
            }

            $nombreImagen = $_FILES['imagen']['name'];
            // Sanitize filename - replace spaces
            $nombreImagen = preg_replace('/\s+/', '_', $nombreImagen);
            $rutaImagen = $carpetaImagenes . '/' . $nombreImagen;
            move_uploaded_file($_FILES['imagen']['tmp_name'], $rutaImagen);
            $rutaImagenCompleta = $rutaweb . $rutaImagen;

            $sqlInsert = "INSERT INTO `subbanner` (imagen) VALUES (:imagen)";
            $stmt = $conexion->prepare($sqlInsert);
            $stmt->bindParam(':imagen', $rutaImagenCompleta);
            $stmt->execute();

            $lastId = $conexion->lastInsertId();

            echo json_encode([
                "mensaje" => "Sub-banner creado exitosamente",
                "idSubBanner" => $lastId,
                "imagen" => $rutaImagenCompleta
            ]);
        } else {
            $err = isset($_FILES['imagen']) ? $_FILES['imagen']['error'] : 'No file';
            echo json_encode(["error" => "Debe enviarse una imagen. Code: " . $err]);
        }
    } else {
        echo json_encode(["error" => "Método no permitido"]);
    }
} catch (PDOException $error) {
    echo json_encode(["error" => "Error DB: " . $error->getMessage()]);
}
?>
