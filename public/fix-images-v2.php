<?php
header('Content-Type: text/html; charset=utf-8');

// Load env vars same as other PHP files in this project
require __DIR__ . '/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$servidor = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$usuario  = $_ENV['DB_USER'];
$contrasena = $_ENV['DB_PASS'];
$dbname   = $_ENV['DB_NAME'];

try {
    $pdo = new PDO("mysql:host=$servidor;dbname=$dbname;charset=utf8", $usuario, $contrasena);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    die("DB error: " . $e->getMessage());
}

$fixes = [];

// ID 11 - Avena y Arroz: wrong image (reel_thumb = Melena bottle), replace with soap
$pdo->exec("UPDATE productos SET imagen1='/imagenes_productos/Tripack_Jabones_Artesanales.png', imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=11");
$fixes[] = "ID 11 (Avena y Arroz): imagen1 → Tripack_Jabones, cleared 2-4";

// ID 12 - Mix 3 Jabones: broken image
$pdo->exec("UPDATE productos SET imagen1='/imagenes_productos/Tripack_Jabones___Sebo_10g.png', imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=12");
$fixes[] = "ID 12 (Mix 3 Jabones): imagen1 → Tripack_Jabones_Sebo, cleared 2-4";

// ID 55 - Mente y Defensa: using Melena duplicate
$pdo->exec("UPDATE productos SET imagen1='/imagenes_productos/Energ_a___Memoria.png', imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=55");
$fixes[] = "ID 55 (Mente y Defensa): imagen1 → Energia_Memoria, cleared 2-4";

// ID 57 - Power Mental: broken image
$pdo->exec("UPDATE productos SET imagen1='/imagenes_productos/combo.png', imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=57");
$fixes[] = "ID 57 (Power Mental): imagen1 → combo.png, cleared 2-4";

// ID 58 - Ritual Regenerador: broken image
$pdo->exec("UPDATE productos SET imagen1='/imagenes_productos/Sebo_Premium_x2.png', imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=58");
$fixes[] = "ID 58 (Ritual Regenerador): imagen1 → Sebo_Premium_x2, cleared 2-4";

// ID 7 - Curcuma: clear broken WhatsApp imagen2/3/4
$pdo->exec("UPDATE productos SET imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=7");
$fixes[] = "ID 7 (Curcuma): cleared broken imagen2/3/4";

// ID 10 - Curcuma Aceite: clear broken WhatsApp imagen2/3/4
$pdo->exec("UPDATE productos SET imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=10");
$fixes[] = "ID 10 (Curcuma Aceite): cleared broken imagen2/3/4";

// ID 9: clear duplicate imagen2 (same file as ID 16)
$pdo->exec("UPDATE productos SET imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=9");
$fixes[] = "ID 9: cleared duplicate imagen2/3/4";

// ID 13 - Calendula: clear broken stores/ paths in 2-4
$pdo->exec("UPDATE productos SET imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=13");
$fixes[] = "ID 13 (Calendula): cleared broken imagen2/3/4";

// ID 38 - Sebo Combo: clear broken stores/ paths in 2-4
$pdo->exec("UPDATE productos SET imagen2=NULL, imagen3=NULL, imagen4=NULL WHERE idProducto=38");
$fixes[] = "ID 38 (Sebo Combo): cleared broken imagen2/3/4";

echo "<h2 style='color:green'>✅ Image fixes applied (" . count($fixes) . "):</h2><ul>";
foreach ($fixes as $f) echo "<li>$f</li>";
echo "</ul>";

// Verify final state
echo "<h2>Current imagen1 for all products:</h2>";
echo "<table border='1' cellpadding='5' style='border-collapse:collapse'>";
echo "<tr style='background:#eee'><th>ID</th><th>Nombre</th><th>imagen1</th></tr>";
$rows = $pdo->query("SELECT idProducto, nombre, imagen1 FROM productos ORDER BY idProducto")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    $ok = $r['imagen1'] && strpos($r['imagen1'],'reel_thumb') === false ? '✅' : '⚠️';
    echo "<tr><td>{$r['idProducto']}</td><td>{$r['nombre']}</td><td>$ok {$r['imagen1']}</td></tr>";
}
echo "</table><br><b style='color:red'>DELETE THIS FILE AFTER RUNNING</b>";
?>
