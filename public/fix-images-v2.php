<?php
// Fix broken/wrong product images in DB
// Run once then delete

$host = 'localhost';
$user = 'u274689770_sanate';
$pass = 'Sanate009*';
$db   = 'u274689770_sanate';

$pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$fixes = [];

// ID 11 - Avena y Arroz: wrong image (shows Melena bottle), fix to avena soap
$pdo->exec("UPDATE productos SET
  imagen1 = '/imagenes_productos/Tripack_Jabones_Artesanales.png',
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 11");
$fixes[] = "ID 11 (Avena y Arroz): fixed imagen1, cleared 2-4";

// ID 12 - Mix 3 Jabones: broken image
$pdo->exec("UPDATE productos SET
  imagen1 = '/imagenes_productos/Tripack_Jabones_Artesanales.png',
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 12");
$fixes[] = "ID 12 (Mix 3 Jabones): fixed imagen1, cleared 2-4";

// ID 55 - Mente y Defensa: duplicate of Melena, assign Energia y Memoria image
$pdo->exec("UPDATE productos SET
  imagen1 = '/imagenes_productos/Energ_a___Memoria.png',
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 55");
$fixes[] = "ID 55 (Mente y Defensa): fixed imagen1, cleared 2-4";

// ID 57 - Power Mental: broken image, assign combo
$pdo->exec("UPDATE productos SET
  imagen1 = '/imagenes_productos/combo.png',
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 57");
$fixes[] = "ID 57 (Power Mental): fixed imagen1, cleared 2-4";

// ID 58 - Ritual Regenerador: broken image, assign sebo premium x2
$pdo->exec("UPDATE productos SET
  imagen1 = '/imagenes_productos/Sebo_Premium_x2.png',
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 58");
$fixes[] = "ID 58 (Ritual Regenerador): fixed imagen1, cleared 2-4";

// ID 7 - Curcuma: clear broken WhatsApp imagen2/3/4
$pdo->exec("UPDATE productos SET
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 7");
$fixes[] = "ID 7 (Curcuma): cleared broken imagen2/3/4";

// ID 10 - Curcuma Aceite: clear broken WhatsApp imagen2/3/4
$pdo->exec("UPDATE productos SET
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 10");
$fixes[] = "ID 10 (Curcuma Aceite): cleared broken imagen2/3/4";

// ID 9: clear duplicate imagen2 (same as ID 16)
$pdo->exec("UPDATE productos SET
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 9");
$fixes[] = "ID 9: cleared duplicate imagen2/3/4";

// ID 13 - Calendula: clear broken stores/ paths
$pdo->exec("UPDATE productos SET
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 13");
$fixes[] = "ID 13 (Calendula): cleared broken imagen2/3/4";

// ID 38 - Sebo Combo: clear broken stores/ paths
$pdo->exec("UPDATE productos SET
  imagen2 = NULL,
  imagen3 = NULL,
  imagen4 = NULL
  WHERE idProducto = 38");
$fixes[] = "ID 38 (Sebo Combo): cleared broken imagen2/3/4";

// Show results
echo "<h2>✅ Image fixes applied:</h2><ul>";
foreach ($fixes as $f) {
    echo "<li>$f</li>";
}
echo "</ul>";

// Show current state for verification
echo "<h2>Current imagen1 for all products:</h2><table border='1' cellpadding='5'>";
echo "<tr><th>ID</th><th>Nombre</th><th>imagen1</th></tr>";
$rows = $pdo->query("SELECT idProducto, nombre, imagen1 FROM productos ORDER BY idProducto")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "<tr><td>{$r['idProducto']}</td><td>{$r['nombre']}</td><td>{$r['imagen1']}</td></tr>";
}
echo "</table>";
?>
