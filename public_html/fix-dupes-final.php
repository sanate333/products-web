<?php
header('Content-Type: text/plain');
$env = parse_ini_file(__DIR__ . '/.env');
$pdo = new PDO(
    "mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset=utf8mb4",
    $env['DB_USER'], $env['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$fixes = [
    // Product 12 (Mix 3) - currently shares image with 45
    [12, '/ai-images/iMAGENES%20nEW/Mix%20jabones.jpg'],
    // Product 57 (Power Mental) - currently shares image with 41
    [57, '/ai-images/iMAGENES%20nEW/power%20mental.jpg'],
    // Product 58 (Ritual Regenerador) - currently shares image with 46
    [58, '/ai-images/iMAGENES%20nEW/Ritual.jpg'],
];

foreach ($fixes as [$id, $img]) {
    $stmt = $pdo->prepare("UPDATE productos SET imagen1 = ? WHERE id = ?");
    $stmt->execute([$img, $id]);
    $rows = $stmt->rowCount();
    echo "ID $id => $img (rows affected: $rows)\n";
}

// Verify - show all imagen1 values
echo "\n--- VERIFICATION: All product images ---\n";
$stmt = $pdo->query("SELECT id, nombre, imagen1 FROM productos ORDER BY id");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID {$row['id']}: {$row['imagen1']} ({$row['nombre']})\n";
}

// Check for duplicates
echo "\n--- DUPLICATE CHECK ---\n";
$stmt = $pdo->query("SELECT imagen1, COUNT(*) as cnt, GROUP_CONCAT(id) as ids FROM productos GROUP BY imagen1 HAVING cnt > 1");
$dupes = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($dupes)) {
    echo "✅ ZERO duplicates! All 25 products have unique images.\n";
} else {
    foreach ($dupes as $d) {
        echo "❌ DUPLICATE: {$d['imagen1']} used by IDs: {$d['ids']}\n";
    }
}
?>
