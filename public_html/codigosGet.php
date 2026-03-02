<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Tienda');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__ . '/config.php';

function resolveStoreIdBySlugForCodes(string $slug): int {
    try {
        $principal = conectarPrincipal();
        $stmt = $principal->prepare('SELECT id FROM stores WHERE slug = :slug LIMIT 1');
        $stmt->execute([':slug' => $slug]);
        return (int)($stmt->fetchColumn() ?: 0);
    } catch (Throwable $e) {
        return 0;
    }
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Metodo no permitido');
    }

    $tiendaSlug = getTiendaActual();
    $storeId = resolveStoreIdBySlugForCodes($tiendaSlug);
    $conexion = conectarTienda($tiendaSlug);
    ensureCoreTables($conexion);

    $stmt = $conexion->prepare("\n        SELECT idCodigo, codigo, descuento\n        FROM codigos\n        WHERE store_id <=> :store_id\n        ORDER BY idCodigo DESC\n    ");
    $stmt->bindValue(':store_id', $storeId ?: null, $storeId ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $stmt->execute();

    echo json_encode([
        'codigos' => $stmt->fetchAll(PDO::FETCH_ASSOC),
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => $error->getMessage()]);
}
?>
