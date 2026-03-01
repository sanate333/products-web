<?php
require __DIR__ . '/config.php';

try {
    if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'], true)) {
        throw new Exception('Metodo no permitido');
    }

    $idTienda = isset($_GET['idTienda']) ? (int)$_GET['idTienda'] : 0;
    if (!$idTienda && isset($_POST['idTienda'])) {
        $idTienda = (int)$_POST['idTienda'];
    }
    if ($idTienda <= 0) {
        throw new Exception('idTienda es requerido');
    }

    $conexionPrincipal = conectarPrincipal();

    $stmtStore = $conexionPrincipal->prepare('SELECT id, name, slug, whatsapp FROM stores WHERE id = :id LIMIT 1');
    $stmtStore->execute([':id' => $idTienda]);
    $store = $stmtStore->fetch(PDO::FETCH_ASSOC);
    if (!$store) {
        throw new Exception('Tienda no encontrada');
    }

    $updates = [];
    $binds = [':id' => $idTienda];

    if (isset($_POST['color']) && $_POST['color'] !== '') {
        $updates[] = 'color = :color';
        $binds[':color'] = sanitizeString($_POST['color']);
    }

    if (isset($_POST['nombre']) && $_POST['nombre'] !== '') {
        $updates[] = 'name = :name';
        $binds[':name'] = sanitizeString($_POST['nombre']);
    }

    if (isset($_POST['logoUrl']) && $_POST['logoUrl'] !== '') {
        $updates[] = 'logo = :logo';
        $binds[':logo'] = sanitizeString($_POST['logoUrl']);
    }

    if (array_key_exists('whatsapp', $_POST)) {
        $whatsappRaw = (string)($_POST['whatsapp'] ?? '');
        $whatsapp = preg_replace('/\D+/', '', $whatsappRaw);
        $updates[] = 'whatsapp = :whatsapp';
        $binds[':whatsapp'] = $whatsapp !== '' ? $whatsapp : null;
    }

    if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/uploads/logos/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $extension = pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION);
        $safeExt = $extension ? '.' . strtolower($extension) : '.png';
        $fileName = uniqid('logo_', true) . $safeExt;
        $filePath = $uploadDir . $fileName;
        if (move_uploaded_file($_FILES['logo']['tmp_name'], $filePath)) {
            $updates[] = 'logo = :logo';
            $binds[':logo'] = 'uploads/logos/' . $fileName;
        }
    }

    if (!$updates) {
        throw new Exception('No hay datos para actualizar');
    }

    $conexionPrincipal->beginTransaction();

    $sql = 'UPDATE stores SET ' . implode(', ', $updates) . ' WHERE id = :id';
    $stmtUpdate = $conexionPrincipal->prepare($sql);
    $stmtUpdate->execute($binds);

    // Compatibilidad con tabla tiendas
    $compatFields = [];
    $compatBinds = [':id' => $idTienda];
    if (isset($binds[':name'])) {
        $compatFields[] = 'nombre = :nombre';
        $compatBinds[':nombre'] = $binds[':name'];
    }
    if (isset($binds[':color'])) {
        $compatFields[] = 'color = :color';
        $compatBinds[':color'] = $binds[':color'];
    }
    if (isset($binds[':logo'])) {
        $compatFields[] = 'logo = :logo';
        $compatBinds[':logo'] = $binds[':logo'];
    }
    if (array_key_exists(':whatsapp', $binds)) {
        $compatFields[] = 'whatsapp = :whatsapp';
        $compatBinds[':whatsapp'] = $binds[':whatsapp'];
    }
    if ($compatFields) {
        $stmtCompat = $conexionPrincipal->prepare('UPDATE tiendas SET ' . implode(', ', $compatFields) . ' WHERE idTienda = :id');
        $stmtCompat->execute($compatBinds);
    }

    $conexionPrincipal->commit();

    $stmtOut = $conexionPrincipal->prepare('SELECT id, owner_user_id, name, slug, color, whatsapp, logo, updated_at FROM stores WHERE id = :id LIMIT 1');
    $stmtOut->execute([':id' => $idTienda]);
    $out = $stmtOut->fetch(PDO::FETCH_ASSOC);

    echo json_encode(respuestaJSON(true, [
        'tienda' => [
            'idTienda' => (int)$out['id'],
            'id' => (int)$out['id'],
            'store_id' => (int)$out['id'],
            'owner_user_id' => (int)$out['owner_user_id'],
            'nombre' => $out['name'],
            'slug' => $out['slug'],
            'color' => $out['color'],
            'whatsapp' => $out['whatsapp'],
            'logo' => $out['logo'],
            'updatedAt' => $out['updated_at'],
        ],
    ], 'Tienda actualizada correctamente'));
} catch (Throwable $e) {
    if (isset($conexionPrincipal) && $conexionPrincipal instanceof PDO && $conexionPrincipal->inTransaction()) {
        $conexionPrincipal->rollBack();
    }
    http_response_code(500);
    echo json_encode(respuestaJSON(false, [], $e->getMessage()));
}
?>
