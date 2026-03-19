<?php
header("Content-Type: text/plain");
$base = __DIR__;
$dest = $base . "/imagenes_productos";
$ecom = $base . "/ai-images/ecom";

if (!is_dir($dest)) {
    mkdir($dest, 0755, true);
    echo "Created: imagenes_productos/\n";
} else {
    echo "Folder exists\n";
}

$map = [
    "1000744990.jpg" => "calendula_hero1.png",
    "1000736990.jpg" => "calendula_beneficios1.png",
    "1000745738.jpg" => "sebo_hero1.png",
    "1000044536.jpg" => "melena_leon.png",
    "1000740733.jpg" => "pack_jabones.png",
    "1000747650.jpg" => "calendula_hero2.png",
    "1000769473.jpg" => "combo_secreto.png",
    "1000750133.jpg" => "sebo_oferta1.png",
    "1000748981.jpg" => "melena_oferta1.png",
];

foreach ($map as $d => $s) {
    $sp = $ecom . "/" . $s;
    $dp = $dest . "/" . $d;
    if (file_exists($sp)) {
        copy($sp, $dp);
        echo "OK: $s -> $d\n";
    } else {
        echo "MISSING: $s\n";
    }
}
echo "\nDONE. Delete this file now.\n";
