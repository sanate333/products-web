<?php
header("Content-Type:application/json");
header('Access-Control-Allow-Origin:*');
require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv=Dotenv::createImmutable(__DIR__);
$dotenv->load();
$con=new PDO("mysql:host=".$_ENV['DB_HOST'].":".$_ENV['DB_PORT'].";dbname=".$_ENV['DB_NAME'],$_ENV['DB_USER'],$_ENV['DB_PASS']);
$con->exec("UPDATE `productos` SET imagen1='/imagenes_productos/reel_thumb_2.jpg' WHERE idProducto=11");
echo json_encode(["ok"=>true,"fixed"=>"ID 11 → reel_thumb_2.jpg"]);
?>
