<?php
/**
 * OBTENER TIENDAS
 * GET /tiendasGet.php
 */

require __DIR__ . '/config.php';

function ensureStoresTables(PDO $conexionPrincipal): void {
    $conexionPrincipal->exec("CREATE TABLE IF NOT EXISTS `stores` (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        owner_user_id INT(11) NOT NULL,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        template VARCHAR(60) NULL DEFAULT NULL,
        color VARCHAR(20) NULL,
        whatsapp VARCHAR(30) NULL,
        logo VARCHAR(900) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_owner_user (owner_user_id),
        INDEX idx_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexionPrincipal->exec("CREATE TABLE IF NOT EXISTS `store_members` (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        store_id BIGINT UNSIGNED NOT NULL,
        user_id INT(11) NOT NULL,
        role VARCHAR(30) NOT NULL DEFAULT 'owner',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_store_user (store_id, user_id),
        INDEX idx_user_id (user_id),
        INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $checkTemplate = $conexionPrincipal->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'stores'
          AND COLUMN_NAME = 'template'
    ");
    $checkTemplate->execute();
    if ((int)$checkTemplate->fetchColumn() === 0) {
        $conexionPrincipal->exec("ALTER TABLE `stores` ADD COLUMN `template` VARCHAR(60) NULL DEFAULT NULL AFTER `slug`");
    }
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Metodo no permitido');
    }

    $conexionPrincipal = conectarPrincipal();
    ensureStoresTables($conexionPrincipal);

    $sql = "
        SELECT s.id, s.owner_user_id, s.name, s.slug, s.template, s.color, s.whatsapp, s.logo, s.created_at, s.updated_at,
               COALESCE(pstats.total_productos, 0) AS total_productos,
               pstats.preview_image
        FROM stores s
        LEFT JOIN (
            SELECT store_id, COUNT(*) AS total_productos, MAX(imagen1) AS preview_image
            FROM productos
            GROUP BY store_id
        ) pstats ON pstats.store_id = s.id
        ORDER BY s.created_at DESC
    ";
    $stmt = $conexionPrincipal->query($sql);
    $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

    if (!$rows) {
        $compat = $conexionPrincipal->query('SELECT idTienda, nombre, slug, color, whatsapp, logo, createdAt, updatedAt FROM tiendas ORDER BY createdAt DESC');
        $compatRows = $compat ? $compat->fetchAll(PDO::FETCH_ASSOC) : [];
        foreach ($compatRows as $item) {
            $rows[] = [
                'id' => (int)$item['idTienda'],
                'owner_user_id' => 0,
                'name' => $item['nombre'],
                'slug' => $item['slug'],
                'template' => $item['template'] ?? null,
                'color' => $item['color'],
                'whatsapp' => $item['whatsapp'] ?? null,
                'logo' => $item['logo'],
                'total_productos' => 0,
                'preview_image' => null,
                'created_at' => $item['createdAt'],
                'updated_at' => $item['updatedAt'],
            ];
        }
    }

    $tiendas = array_map(static function ($store) {
        return [
            'idTienda' => (int)$store['id'],
            'id' => (int)$store['id'],
            'store_id' => (int)$store['id'],
            'owner_user_id' => (int)$store['owner_user_id'],
            'nombre' => $store['name'],
            'name' => $store['name'],
            'slug' => $store['slug'],
            'template' => $store['template'] ?? null,
            'color' => $store['color'],
            'whatsapp' => $store['whatsapp'] ?? null,
            'logo' => $store['logo'],
            'products_count' => (int)($store['total_productos'] ?? 0),
            'preview_image' => $store['preview_image'] ?? null,
            'role' => 'owner',
            'createdAt' => $store['created_at'],
            'updatedAt' => $store['updated_at'],
        ];
    }, $rows);

    echo json_encode(respuestaJSON(true, [
        'tiendas' => $tiendas,
    ], 'Tiendas obtenidas correctamente'));
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(respuestaJSON(false, [], $e->getMessage()));
}
