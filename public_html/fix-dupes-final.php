<?php
header('Content-Type: text/plain');
require __DIR__.'/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$servidor = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$pdo = new PDO(
    "mysql:host=$servidor;dbname={$_ENV['DB_NAME']};charset=utf8mb4",
    $_ENV['DB_USER'], $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$fixes = [
    [12, '/ai-images/iMAGENES%20nEW/Mix%20jabones.jpg'],
    [57, '/ai-images/iMAGENES%20nEW/power%20mental.jpg'],
    [58, '/ai-images/iMAGENES%20nEW/Ritual.jpg'],
];

foreach ($fixes as [$id, $img]) {
    $stmt = $pdo->prepare("UPDATE productos SET imagen1 = ? WHERE id = ?");
    $stmt->execute([$img, $id]);
    echo "ID $id => $img (rows: {$stmt->rowCount()})\n";
}

echo "\n--- ALL IMAGES ---\n";
$stmt = $pdo->query("SELECT id, nombre, imagen1 FROM productos ORDER BY id");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID {$r['id']}: {$r['imagen1']}\n";
}

echo "\n--- DUPLICATES ---\n";
$stmt = $pdo->query("SELECT imagen1, COUNT(*) c, GROUP_CONCAT(id) ids FROM productos GROUP BY imagen1 HAVING c > 1");
$d = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo empty($d) ? "✅ ZERO duplicates!\n" : "";
foreach ($d as $row) echo "❌ {$row['imagen1']} => IDs: {$row['ids']}\n";
?>
