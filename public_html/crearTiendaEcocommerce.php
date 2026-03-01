<?php
// Script para crear la tienda Eco-commerce
require __DIR__.'/vendor/autoload.php';
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

    // Crear tabla si no existe
    $conexion->exec("CREATE TABLE IF NOT EXISTS `tiendas` (
        idTienda INT(11) AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(20) NULL,
        logo VARCHAR(900) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    // Verificar si la tienda Eco-commerce ya existe
    $sqlCheck = "SELECT idTienda FROM tiendas WHERE slug = 'eco-commerce'";
    $stmtCheck = $conexion->prepare($sqlCheck);
    $stmtCheck->execute();

    if ($stmtCheck->rowCount() === 0) {
        // Crear la tienda Eco-commerce
        $sqlInsert = "INSERT INTO tiendas (nombre, slug, color) VALUES ('Eco-commerce', 'eco-commerce', '#10b981')";
        $conexion->exec($sqlInsert);
        echo "Tienda Eco-commerce creada correctamente.";
    } else {
        echo "La tienda Eco-commerce ya existe.";
    }

} catch (PDOException $error) {
    echo "Error: " . $error->getMessage();
}
?>
