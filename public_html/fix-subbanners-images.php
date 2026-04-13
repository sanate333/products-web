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

    // Map broken sub-banners to working promo images
    $fixes = [
        8  => '/ai-images/ecom/sebo_hero1.png',
        9  => '/ai-images/ecom/combo1_jabones.png',
        10 => '/ai-images/ecom/melena_oferta1.png',
        11 => '/ai-images/ecom/combo3_piel.png',
        13 => '/ai-images/ecom/combo5_doble.png',
    ];

    $updated = [];
    $stmt = $con->prepare("UPDATE subbanner SET imagen = :img WHERE idSubBanner = :id");

    foreach ($fixes as $id => $img) {
        $stmt->execute([':img' => $img, ':id' => $id]);
        $updated[] = "SubBanner $id → $img";
    }

    echo json_encode(["ok" => true, "updated" => $updated, "count" => count($updated)]);
} catch (PDOException $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
