<?php
require __DIR__ . '/config.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        throw new Exception('Metodo no permitido');
    }

    $idTienda = isset($_GET['idTienda']) ? (int)$_GET['idTienda'] : 0;
    if ($idTienda <= 0) {
        throw new Exception('idTienda es requerido');
    }

    $conexionPrincipal = conectarPrincipal();

    $storeId = $idTienda;
    $slug = '';

    $stmt = $conexionPrincipal->prepare('SELECT id, slug FROM stores WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $idTienda]);
    $store = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($store) {
        $storeId = (int)$store['id'];
        $slug = (string)$store['slug'];
    } else {
        $stmtCompat = $conexionPrincipal->prepare('SELECT idTienda, slug FROM tiendas WHERE idTienda = :id LIMIT 1');
        $stmtCompat->execute([':id' => $idTienda]);
        $compat = $stmtCompat->fetch(PDO::FETCH_ASSOC);
        if (!$compat) {
            throw new Exception('Tienda no encontrada');
        }
        $slug = (string)$compat['slug'];

        $stmtBySlug = $conexionPrincipal->prepare('SELECT id FROM stores WHERE slug = :slug LIMIT 1');
        $stmtBySlug->execute([':slug' => $slug]);
        $fromStore = $stmtBySlug->fetchColumn();
        if ($fromStore) {
            $storeId = (int)$fromStore;
        }
    }

    if ($slug === '') {
        throw new Exception('Slug de tienda invalido');
    }
    $slugLower = strtolower($slug);
    if (in_array($slugLower, ['principal', 'eco-commerce', 'default'], true)) {
        throw new Exception('No se permite eliminar la tienda principal.');
    }

    $conexionPrincipal->beginTransaction();

    $storeScopedTables = [
        'productos',
        'pedidos',
        'categorias',
        'banner',
        'sub_banner',
        'clientes',
        'codigos',
        'tutoriales',
        'usuarios',
    ];
    foreach ($storeScopedTables as $table) {
        $stmtDeleteData = $conexionPrincipal->prepare("DELETE FROM `$table` WHERE store_id = :id");
        $stmtDeleteData->execute([':id' => $storeId]);
    }

    $stmtMembers = $conexionPrincipal->prepare('DELETE FROM store_members WHERE store_id = :id');
    $stmtMembers->execute([':id' => $storeId]);

    $stmtDeleteStore = $conexionPrincipal->prepare('DELETE FROM stores WHERE id = :id');
    $stmtDeleteStore->execute([':id' => $storeId]);

    $stmtDeleteCompat = $conexionPrincipal->prepare('DELETE FROM tiendas WHERE idTienda = :id OR slug = :slug');
    $stmtDeleteCompat->execute([':id' => $idTienda, ':slug' => $slug]);

    $conexionPrincipal->commit();

    // Limpieza opcional de carpeta de assets de tienda
    $storeFolder = __DIR__ . '/stores/' . $slug;
    if (is_dir($storeFolder)) {
        $it = new RecursiveDirectoryIterator($storeFolder, RecursiveDirectoryIterator::SKIP_DOTS);
        $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($files as $file) {
            if ($file->isDir()) {
                @rmdir($file->getRealPath());
            } else {
                @unlink($file->getRealPath());
            }
        }
        @rmdir($storeFolder);
    }

    echo json_encode(respuestaJSON(true, [], 'Tienda eliminada correctamente'));
} catch (Throwable $e) {
    if (isset($conexionPrincipal) && $conexionPrincipal instanceof PDO && $conexionPrincipal->inTransaction()) {
        $conexionPrincipal->rollBack();
    }
    http_response_code(500);
    echo json_encode(respuestaJSON(false, [], $e->getMessage()));
}
?>
