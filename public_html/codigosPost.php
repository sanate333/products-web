<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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

function randomCode(int $len = 8): string {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $result = '';
    for ($i = 0; $i < $len; $i++) {
        $result .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $result;
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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo no permitido');
    }

    $tiendaSlug = getTiendaActual();
    $storeId = resolveStoreIdBySlugForCodes($tiendaSlug);
    $conexion = conectarTienda($tiendaSlug);
    ensureCoreTables($conexion);

    $codigoInput = (string)($_POST['codigo'] ?? '');
    $codigo = normalizeCode($codigoInput !== '' ? $codigoInput : randomCode(8));
    $descuento = isset($_POST['descuento']) ? (float)$_POST['descuento'] : 0;
    $descuento = max(0, min(100, $descuento));

    if ($codigo === '') {
        throw new Exception('Codigo invalido');
    }
    if ($descuento <= 0) {
        throw new Exception('El descuento debe ser mayor a 0%');
    }

    $check = $conexion->prepare('SELECT idCodigo FROM codigos WHERE codigo = :codigo AND store_id <=> :store_id LIMIT 1');
    $check->bindValue(':codigo', $codigo, PDO::PARAM_STR);
    $check->bindValue(':store_id', $storeId ?: null, $storeId ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $check->execute();

    if ($check->fetch(PDO::FETCH_ASSOC)) {
        throw new Exception('El codigo ya existe en esta tienda');
    }

    $insert = $conexion->prepare('INSERT INTO codigos (store_id, codigo, descuento) VALUES (:store_id, :codigo, :descuento)');
    $insert->bindValue(':store_id', $storeId ?: null, $storeId ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $insert->bindValue(':codigo', $codigo, PDO::PARAM_STR);
    $insert->bindValue(':descuento', $descuento, PDO::PARAM_STR);
    $insert->execute();

    echo json_encode([
        'mensaje' => 'Codigo creado exitosamente',
        'idCodigo' => (int)$conexion->lastInsertId(),
        'codigo' => $codigo,
        'descuento' => $descuento,
    ]);
} catch (Throwable $error) {
    http_response_code(400);
    echo json_encode(['error' => $error->getMessage()]);
}
?>
