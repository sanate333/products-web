<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');

require __DIR__.'/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$srv = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$pdo = new PDO(
    "mysql:host=$srv;dbname={$_ENV['DB_NAME']};charset=utf8mb4",
    $_ENV['DB_USER'], $_ENV['DB_PASS'],
    array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
);

// Fix duplicates
$fixes = array(
    array(12, '/ai-images/iMAGENES%20nEW/Mix%20jabones.jpg'),
    array(57, '/ai-images/iMAGENES%20nEW/power%20mental.jpg'),
    array(58, '/ai-images/iMAGENES%20nEW/Ritual.jpg'),
);

foreach ($fixes as $fix) {
    $id = $fix[0];
    $img = $fix[1];
    $stmt = $pdo->prepare("UPDATE productos SET imagen1 = ? WHERE id = ?");
    $stmt->execute(array($img, $id));
    echo "ID $id => $img (rows: " . $stmt->rowCount() . ")\n";
}

echo "\n--- DUPLICATES CHECK ---\n";
$stmt = $pdo->query("SELECT imagen1, COUNT(*) as c, GROUP_CONCAT(id) as ids FROM productos GROUP BY imagen1 HAVING c > 1");
$dupes = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($dupes)) {
    echo "ZERO duplicates! All products have unique images.\n";
} else {
    foreach ($dupes as $d) {
        echo "DUPE: " . $d['imagen1'] . " => IDs: " . $d['ids'] . "\n";
    }
}
echo "DONE\n";
?>
