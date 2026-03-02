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

function normalizeCode(string $code): string {
    $code = strtoupper(trim($code));
    $code = preg_replace('/[^A-Z0-9_-]/', '', $code);
    return substr($code, 0, 30);
}

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

    $rawCode = (string)($_GET['codigo'] ?? '');
    $codigo = normalizeCode($rawCode);
    if ($codigo === '') {
        throw new Exception('Codigo invalido');
    }

    $tiendaSlug = getTiendaActual();
    $storeId = resolveStoreIdBySlugForCodes($tiendaSlug);
    $conexion = conectarTienda($tiendaSlug);
    ensureCoreTables($conexion);

    $stmt = $conexion->prepare('SELECT idCodigo, codigo, descuento FROM codigos WHERE codigo = :codigo AND store_id <=> :store_id LIMIT 1');
    $stmt->bindValue(':codigo', $codigo, PDO::PARAM_STR);
    $stmt->bindValue(':store_id', $storeId ?: null, $storeId ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Codigo no valido']);
        exit;
    }

    $descuento = max(0, min(100, (float)($row['descuento'] ?? 0)));

    echo json_encode([
        'ok' => true,
        'codigo' => (string)$row['codigo'],
        'descuento' => $descuento,
    ]);
} catch (Throwable $error) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $error->getMessage()]);
}
?>
