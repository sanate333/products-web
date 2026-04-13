<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();
$servidor = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$con = new PDO("mysql:host=$servidor;dbname=".$_ENV['DB_NAME'], $_ENV['DB_USER'], $_ENV['DB_PASS']);
$con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Fix duplicates: change the SECOND product in each pair to a unique image
$fixes = [
    // ID:54 Kit Familia Piel was same as ID:7 (combo1_jabones.png)
    54 => '/ai-images/ecom/calendula_hero1.png',
    // ID:57 Power Mental was same as ID:8 (melena_leon.png)  
    57 => '/imagenes_productos/Melena_de_Le_n_x2_Cajas.png',
    // ID:58 Ritual Regenerador was same as ID:9 (sebo_hero1.png)
    58 => '/ai-images/ecom/sebo_promo1.png',
    // ID:13 Calendula was same as ID:11 Avena (calendula_hero2.png)
    11 => '/ai-images/ecom/WhatsApp%20Image%202026-01-05%20at%202.25.52%20AM.jpeg',
    // ID:12 Mix was same as ID:39 Tripack (Tripack_Jabones_Artesanales.png)
    12 => '/imagenes_productos/Tripack_Jabones___Sebo_10g.png',
    // ID:56 Capilar Completo was same as ID:14 Nectar (nectar_capilar.jpg)
    56 => '/ai-images/iMAGENES%20nEW/Shampo%20500ml.jpg',
    // ID:44 Polen x90 was same as ID:15 (Polen_Multifloral_x90.png) 
    15 => '/ai-images/iMAGENES%20nEW/POELNX50..jpg',
    // ID:42 Sebo x2 was same as ID:16 (Sebo_Premium_x2.png)
    16 => '/ai-images/ecom/combo6_jabones6.png',
    // Also fix ID:9 sebo combo to use the curcuma+sebo combo image user suggested
    9 => '/ai-images/ecom/sebo_hero1.png',
];

$updated = [];
$stmt = $con->prepare("UPDATE `productos` SET imagen1 = :img WHERE idProducto = :id");
foreach ($fixes as $id => $img) {
    $stmt->execute([':img' => $img, ':id' => $id]);
    $updated[] = "ID $id => $img (rows: " . $stmt->rowCount() . ")";
}
echo json_encode(["ok" => true, "updated" => $updated, "count" => count($updated)]);
?>
