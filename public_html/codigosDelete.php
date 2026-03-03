<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
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
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        throw new Exception('Metodo no permitido');
    }

    $idCodigo = isset($_GET['idCodigo']) ? (int)$_GET['idCodigo'] : 0;
    if ($idCodigo <= 0) {
        throw new Exception('Se requiere un ID de codigo valido.');
    }

    $tiendaSlug = getTiendaActual();
    $storeId = resolveStoreIdBySlugForCodes($tiendaSlug);
    $conexion = conectarTienda($tiendaSlug);
    ensureCoreTables($conexion);

    $delete = $conexion->prepare('DELETE FROM codigos WHERE idCodigo = :idCodigo AND store_id <=> :store_id');
    $delete->bindValue(':idCodigo', $idCodigo, PDO::PARAM_INT);
    $delete->bindValue(':store_id', $storeId ?: null, $storeId ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $delete->execute();

    if ($delete->rowCount() <= 0) {
        throw new Exception('No se encontro el codigo para eliminar.');
    }

    echo json_encode(['mensaje' => 'Codigo eliminado correctamente']);
} catch (Throwable $error) {
    http_response_code(400);
    echo json_encode(['error' => $error->getMessage()]);
}
?>
