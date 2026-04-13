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

    // Map broken products to working images
    $fixes = [
        7  => '/ai-images/ecom/combo1_jabones.png',      // Curcuma jabones
        8  => '/ai-images/ecom/melena_leon.png',          // Melena de León
        9  => '/ai-images/ecom/sebo_hero1.png',           // Sebos + Jabones
        10 => '/ai-images/ecom/combo6_jabones6.png',      // 6 Curcuma jabones
        11 => '/ai-images/ecom/calendula_hero2.png',      // Avena y Arroz jabones
        12 => '/imagenes_productos/Tripack_Jabones_Artesanales.png', // Mix jabones
        13 => '/ai-images/ecom/calendula_hero2.png',      // Calendula jabones
        14 => '/imagenes_productos/nectar_capilar.jpg',   // Néctar Capilar
        15 => '/imagenes_productos/Polen_Multifloral_x90.png', // Polen x90
        16 => '/imagenes_productos/Sebo_Premium_x2.png',  // Sebo grande + jabones
        50 => '/ai-images/ecom/combo3_piel.png',          // Piel y Bienestar
    ];

    $updated = [];
    $stmt = $con->prepare("UPDATE producto SET imagen1 = :img WHERE idProducto = :id");

    foreach ($fixes as $id => $img) {
        $stmt->execute([':img' => $img, ':id' => $id]);
        $updated[] = "ID $id → $img";
    }

    echo json_encode(["ok" => true, "updated" => $updated, "count" => count($updated)]);
} catch (PDOException $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
