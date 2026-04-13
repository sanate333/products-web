<?php
header('Content-Type: application/json');
require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();
$dsn = "mysql:host=".$_ENV['DB_HOST'].":".$_ENV['DB_PORT'].";dbname=".$_ENV['DB_NAME'];
$db = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASS']);
$stmt = $db->prepare("UPDATE productos SET imagen1 = :img WHERE idProducto = :id");
$stmt->execute([':img' => '/ai-images/ecom/melena_leon.png', ':id' => 57]);
echo json_encode(['ok' => true, 'rows' => $stmt->rowCount()]);
