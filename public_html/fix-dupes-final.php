<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');
require __DIR__.'/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();
$srv = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$pdo = new PDO("mysql:host=$srv;dbname={$_ENV['DB_NAME']};charset=utf8mb4",$_ENV['DB_USER'],$_ENV['DB_PASS'],array(PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION));

// First: show table structure
echo "--- TABLE STRUCTURE ---\n";
$cols = $pdo->query("DESCRIBE productos");
while ($c = $cols->fetch(PDO::FETCH_ASSOC)) {
    echo $c['Field'] . " | " . $c['Type'] . "\n";
}

// Show a sample row
echo "\n--- SAMPLE ROW ---\n";
$s = $pdo->query("SELECT * FROM productos LIMIT 1");
$row = $s->fetch(PDO::FETCH_ASSOC);
print_r(array_keys($row));
echo "\n";
echo "DONE\n";
?>
