<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');

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
    $con = new PDO($dsn, $usuario, $contrasena);
    $con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $fixes = [
        7  => '/ai-images/ecom/combo1_jabones.png',
        8  => '/ai-images/ecom/melena_leon.png',
        9  => '/ai-images/ecom/sebo_hero1.png',
        10 => '/ai-images/ecom/combo6_jabones6.png',
        11 => '/ai-images/ecom/calendula_hero2.png',
        12 => '/imagenes_productos/Tripack_Jabones_Artesanales.png',
        13 => '/ai-images/ecom/calendula_hero2.png',
        14 => '/imagenes_productos/nectar_capilar.jpg',
        15 => '/imagenes_productos/Polen_Multifloral_x90.png',
        16 => '/imagenes_productos/Sebo_Premium_x2.png',
        50 => '/ai-images/ecom/combo3_piel.png',
    ];

    $updated = [];
    $stmt = $con->prepare("UPDATE `productos` SET imagen1 = :img WHERE idProducto = :id");

    foreach ($fixes as $id => $img) {
        $stmt->execute([':img' => $img, ':id' => $id]);
        $updated[] = "ID $id => $img (rows: " . $stmt->rowCount() . ")";
    }

    echo json_encode(["ok" => true, "updated" => $updated, "count" => count($updated)]);
} catch (PDOException $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
