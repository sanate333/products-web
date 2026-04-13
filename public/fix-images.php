<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$dsn = "mysql:host=".$_ENV['DB_HOST'].":".$_ENV['DB_PORT'].";dbname=".$_ENV['DB_NAME'];
$db = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASS']);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$updates = [
  // Products with combo.png → assign unique images
  [50, './imagenes_productos/combo3_piel.png', null, null],        // Piel y Bienestar
  [54, '/ai-images/ecom/combo1_jabones.png', null, null],          // Kit Familia Piel
  [55, '/ai-images/ecom/melena_oferta1.png', null, null],          // Mente y Defensa
  [56, './imagenes_productos/nectar_capilar.jpg', null, null],     // Capilar Completo
  [57, './imagenes_productos/Melena_de_Le_n_x2_Cajas.png', null, null], // Power Mental
  [58, '/ai-images/ecom/sebo_hero1.png', null, null],              // Ritual Regenerador
  [59, '/ai-images/ecom/combo5_doble.png', null, null],            // Kit Total SANATE
  // Fix product 38 broken image
  [38, '/ai-images/ecom/sebo_promo1.png', null, null],             // Secreto Japones
];

$results = [];
foreach($updates as $u) {
  $sql = "UPDATE productos SET imagen1 = :img WHERE idProducto = :id";
  $stmt = $db->prepare($sql);
  $stmt->execute([':img' => $u[1], ':id' => $u[0]]);
  $results[] = ['id' => $u[0], 'imagen1' => $u[1], 'rows' => $stmt->rowCount()];
}

echo json_encode(['ok' => true, 'updated' => $results]);
