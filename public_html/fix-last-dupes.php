<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();
$con = new PDO("mysql:host=".$_ENV['DB_HOST'].":".$_ENV['DB_PORT'].";dbname=".$_ENV['DB_NAME'], $_ENV['DB_USER'], $_ENV['DB_PASS']);
$con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$fixes = [
    16 => '/ai-images/ecom/WhatsApp%20Image%202026-01-05%20at%202.25.52%20AM.jpeg',
    58 => '/imagenes_productos/Energ_a___Memoria.png',
];
$updated = [];
$stmt = $con->prepare("UPDATE `productos` SET imagen1 = :img WHERE idProducto = :id");
foreach ($fixes as $id => $img) {
    $stmt->execute([':img' => $img, ':id' => $id]);
    $updated[] = "ID $id => $img";
}
echo json_encode(["ok" => true, "updated" => $updated]);
?>
