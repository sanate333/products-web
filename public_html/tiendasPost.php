<?php
/**
 * CREAR NUEVA TIENDA (Multi-store)
 * POST /tiendasPost.php
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

function ensureTiendasCompatibilityTable(PDO $conexionPrincipal): void {
    $conexionPrincipal->exec("CREATE TABLE IF NOT EXISTS `tiendas` (
        idTienda INT(11) AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(20) NULL,
        whatsapp VARCHAR(30) NULL,
        logo VARCHAR(900) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function ensureStoreUserColumns(PDO $conexionPrincipal): void {
    $columns = [
        'store_id' => 'BIGINT UNSIGNED NULL',
        'email_display' => 'VARCHAR(120) NULL',
        'force_password_change' => 'TINYINT(1) NOT NULL DEFAULT 0',
    ];

    foreach ($columns as $column => $definition) {
        $check = $conexionPrincipal->prepare("
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'usuarios'
              AND COLUMN_NAME = :column
        ");
        $check->execute([':column' => $column]);
        if ((int)$check->fetchColumn() === 0) {
            $conexionPrincipal->exec("ALTER TABLE `usuarios` ADD COLUMN `$column` $definition");
        }
    }
}

function normalizeSlugStrict(string $slug): string {
    $normalized = strtolower(trim($slug));
    if ($normalized === '') {
        return '';
    }
    if (!preg_match('/^[a-z0-9-]{2,30}$/', $normalized)) {
        return '';
    }
    return $normalized;
}

function deriveSlugFromName(string $name): string {
    $slug = strtolower(trim($name));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    $slug = trim((string)$slug, '-');
    $slug = substr($slug, 0, 30);
    if (!preg_match('/^[a-z0-9-]{2,30}$/', $slug)) {
        return '';
    }
    return $slug;
}

function buildAliasEmail(string $baseEmail, string $slug, int $attempt = 0): string {
    $parts = explode('@', $baseEmail);
    $local = $parts[0] ?? 'admin';
    $domain = $parts[1] ?? 'gmail.com';
    $suffix = $attempt > 0 ? ('-' . $attempt) : '';
    return "{$local}+{$slug}{$suffix}@{$domain}";
}

function resolveStoreAdminCredentials(string $slug): ?array {
    $defaultEmail = trim((string)($_ENV['DEFAULT_STORE_ADMIN_EMAIL'] ?? getenv('DEFAULT_STORE_ADMIN_EMAIL') ?? ''));
    $defaultPassword = trim((string)($_ENV['DEFAULT_STORE_ADMIN_PASSWORD'] ?? getenv('DEFAULT_STORE_ADMIN_PASSWORD') ?? ''));

    if ($defaultEmail === '' || $defaultPassword === '') {
        return null;
    }

    return [
        'email' => strtolower($defaultEmail),
        'password' => $defaultPassword,
        'visual_email' => strtolower($defaultEmail),
        'slug' => $slug,
    ];
}

function createStoreAdminUser(PDO $conexionPrincipal, string $slug, string $storeName, int $storeId): ?array {
    $creds = resolveStoreAdminCredentials($slug);
    if ($creds === null) {
        return null;
    }

    $email = $creds['email'];
    $password = $creds['password'];
    $visualEmail = $creds['visual_email'];

    $check = $conexionPrincipal->prepare('SELECT idUsuario FROM usuarios WHERE email = :email LIMIT 1');
    $check->execute([':email' => $email]);
    if ($check->fetchColumn()) {
        $attempt = 0;
        do {
            $attempt++;
            $email = buildAliasEmail($creds['email'], $slug, $attempt > 1 ? $attempt - 1 : 0);
            $check->execute([':email' => $email]);
            $exists = (bool)$check->fetchColumn();
        } while ($exists && $attempt < 50);

        if ($exists) {
            throw new Exception('No fue posible generar un email admin unico para la tienda.');
        }
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    if (!$hash) {
        throw new Exception('No fue posible generar hash seguro para el admin.');
    }

    $nombreAdmin = 'Admin ' . $storeName;
    $stmtUser = $conexionPrincipal->prepare('
        INSERT INTO usuarios (store_id, nombre, email_display, email, contrasena, rol, force_password_change)
        VALUES (:store_id, :nombre, :email_display, :email, :contrasena, :rol, 1)
    ');
    $stmtUser->execute([
        ':store_id' => $storeId,
        ':nombre' => $nombreAdmin,
        ':email_display' => $visualEmail,
        ':email' => $email,
        ':contrasena' => $hash,
        ':rol' => 'admin',
    ]);

    return [
        'id' => (int)$conexionPrincipal->lastInsertId(),
        'email' => $email,
        'visual_email' => $visualEmail,
        'password_seeded' => true,
    ];
}

function collectTemplateImages(): array {
    $images = [];
    $templateDir = realpath(__DIR__ . '/../IMAGENES PLANTILLA');
    if ($templateDir && is_dir($templateDir)) {
        $patterns = ['*.jpg', '*.jpeg', '*.png', '*.webp'];
        foreach ($patterns as $pattern) {
            foreach (glob($templateDir . DIRECTORY_SEPARATOR . $pattern) ?: [] as $path) {
                if (is_file($path)) {
                    $images[] = $path;
                }
            }
        }
    }

    $images = array_values(array_unique($images));
    sort($images);
    return $images;
}

function copyTemplateAsset(string $sourcePath, string $storeSlug, string $bucket, string $prefix, array &$createdFiles): string {
    $dirRelative = "stores/{$storeSlug}/{$bucket}";
    $targetDir = __DIR__ . '/' . $dirRelative;
    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        throw new Exception('No se pudo crear carpeta de assets para tienda.');
    }

    $ext = pathinfo($sourcePath, PATHINFO_EXTENSION);
    $safeExt = $ext ? '.' . strtolower($ext) : '.jpg';
    $targetName = $prefix . '_' . uniqid('', true) . $safeExt;
    $targetPath = $targetDir . '/' . $targetName;
    if (!copy($sourcePath, $targetPath)) {
        throw new Exception('No se pudo copiar asset de plantilla.');
    }

    $createdFiles[] = $targetPath;
    return $dirRelative . '/' . $targetName;
}

function templateCategoryNames(string $template): array {
    $map = [
        'productos-naturales' => ['Productos Naturales'],
        'zapatos-ropa' => ['Calzado', 'Ropa'],
        'restaurante' => ['Platos', 'Bebidas'],
        'barberia' => ['Cortes', 'Barbas'],
        'blanco' => ['General'],
    ];
    $key = strtolower(trim($template));
    return $map[$key] ?? ['General'];
}

function resolvePrincipalCloneSourceStoreId(PDO $conexionPrincipal, int $excludeStoreId): int {
    $candidates = [];

    $stmtPreferred = $conexionPrincipal->query("
        SELECT id
        FROM stores
        WHERE slug IN ('principal', 'eco-commerce', 'default')
        ORDER BY FIELD(slug, 'principal', 'eco-commerce', 'default')
    ");
    $preferredRows = $stmtPreferred ? $stmtPreferred->fetchAll(PDO::FETCH_COLUMN) : [];
    foreach ($preferredRows as $rowId) {
        $id = (int)$rowId;
        if ($id > 0 && $id !== $excludeStoreId) {
            $candidates[] = $id;
        }
    }

    $stmtWithProducts = $conexionPrincipal->prepare("
        SELECT DISTINCT p.store_id
        FROM productos p
        INNER JOIN stores s ON s.id = p.store_id
        WHERE p.store_id IS NOT NULL
          AND p.store_id <> :exclude
        ORDER BY p.store_id ASC
    ");
    $stmtWithProducts->execute([':exclude' => $excludeStoreId]);
    $productRows = $stmtWithProducts->fetchAll(PDO::FETCH_COLUMN) ?: [];
    foreach ($productRows as $rowId) {
        $id = (int)$rowId;
        if ($id > 0 && !in_array($id, $candidates, true)) {
            $candidates[] = $id;
        }
    }

    return $candidates[0] ?? 0;
}

function fetchTemplateRows(PDO $conexionPrincipal, string $sqlScoped, string $sqlLegacy, int $sourceStoreId): array {
    if ($sourceStoreId > 0) {
        $stmtScoped = $conexionPrincipal->prepare($sqlScoped);
        $stmtScoped->execute([':source_store_id' => $sourceStoreId]);
        $scopedRows = $stmtScoped->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($scopedRows)) {
            return $scopedRows;
        }
    }

    $stmtLegacy = $conexionPrincipal->query($sqlLegacy);
    return $stmtLegacy ? ($stmtLegacy->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
}

function tableColumns(PDO $conexionPrincipal, string $table): array {
    static $cache = [];
    $key = strtolower(trim($table));
    if (isset($cache[$key])) {
        return $cache[$key];
    }
    try {
        $stmt = $conexionPrincipal->query("SHOW COLUMNS FROM `{$table}`");
        $rows = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
        $columns = [];
        foreach ($rows as $row) {
            $name = strtolower((string)($row['Field'] ?? ''));
            if ($name !== '') {
                $columns[$name] = true;
            }
        }
        $cache[$key] = $columns;
        return $columns;
    } catch (Throwable $e) {
        $cache[$key] = [];
        return [];
    }
}

function hasColumn(PDO $conexionPrincipal, string $table, string $column): bool {
    $columns = tableColumns($conexionPrincipal, $table);
    return isset($columns[strtolower(trim($column))]);
}

function clonePrincipalCatalogData(PDO $conexionPrincipal, int $storeId, string $template): void {
    $templateKey = strtolower(trim($template));
    if ($templateKey !== 'productos-naturales') {
        return;
    }

    $sourceStoreId = resolvePrincipalCloneSourceStoreId($conexionPrincipal, $storeId);

    $clearTargetProducts = $conexionPrincipal->prepare('DELETE FROM productos WHERE store_id = :store_id');
    $clearTargetCategories = $conexionPrincipal->prepare('DELETE FROM categorias WHERE store_id = :store_id');
    $clearTargetBanners = $conexionPrincipal->prepare('DELETE FROM banner WHERE store_id = :store_id');
    $clearTargetSub = $conexionPrincipal->prepare('DELETE FROM sub_banner WHERE store_id = :store_id');

    foreach ([$clearTargetProducts, $clearTargetCategories, $clearTargetBanners, $clearTargetSub] as $stmtClear) {
        $stmtClear->execute([':store_id' => $storeId]);
    }

    $catHasDescripcion = hasColumn($conexionPrincipal, 'categorias', 'descripcion');
    $catHasImagen = hasColumn($conexionPrincipal, 'categorias', 'imagen');
    $catHasOrden = hasColumn($conexionPrincipal, 'categorias', 'orden');

    $prodOptionalFields = [
        'descripcion',
        'brandColor',
        'masVendido',
        'imagen1',
        'imagen2',
        'imagen3',
        'imagen4',
        'item1',
        'item2',
        'item3',
        'item4',
        'item5',
        'item6',
        'item7',
        'item8',
        'item9',
        'item10',
        'precioAnterior',
        'gananciaAprox',
        'stock',
        'estadoProducto',
        'tieneVariantes',
        'product_sections',
    ];
    $prodExistingOptional = [];
    foreach ($prodOptionalFields as $field) {
        if (hasColumn($conexionPrincipal, 'productos', $field)) {
            $prodExistingOptional[] = $field;
        }
    }

    $bannerHasTipo = hasColumn($conexionPrincipal, 'banner', 'tipo');
    $subHasOrden = hasColumn($conexionPrincipal, 'sub_banner', 'orden');

    $categoryMap = [];
    $sourceCategorySelect = 'SELECT idCategoria, categoria';
    $sourceCategorySelect .= $catHasDescripcion ? ', descripcion' : ', NULL AS descripcion';
    $sourceCategorySelect .= $catHasImagen ? ', imagen' : ', NULL AS imagen';
    $sourceCategorySelect .= $catHasOrden ? ', orden' : ', NULL AS orden';
    $sourceCategorySelect .= ' FROM categorias';
    $sourceCategoryOrder = $catHasOrden ? 'ORDER BY COALESCE(orden, idCategoria) ASC' : 'ORDER BY idCategoria ASC';

    $sourceCategories = fetchTemplateRows(
        $conexionPrincipal,
        "{$sourceCategorySelect} WHERE store_id = :source_store_id {$sourceCategoryOrder}",
        "{$sourceCategorySelect} WHERE store_id IS NULL {$sourceCategoryOrder}",
        $sourceStoreId
    );

    $categoryInsertColumns = ['store_id', 'categoria'];
    if ($catHasDescripcion) $categoryInsertColumns[] = 'descripcion';
    if ($catHasImagen) $categoryInsertColumns[] = 'imagen';
    if ($catHasOrden) $categoryInsertColumns[] = 'orden';
    $categoryInsertParams = array_map(static fn($col) => ':' . $col, $categoryInsertColumns);
    $insertCategory = $conexionPrincipal->prepare(
        'INSERT INTO categorias (' . implode(', ', $categoryInsertColumns) . ') VALUES (' . implode(', ', $categoryInsertParams) . ')'
    );

    foreach ($sourceCategories as $sourceCat) {
        $catPayload = [
            ':store_id' => $storeId,
            ':categoria' => $sourceCat['categoria'] ?? 'General',
        ];
        if ($catHasDescripcion) $catPayload[':descripcion'] = $sourceCat['descripcion'] ?? null;
        if ($catHasImagen) $catPayload[':imagen'] = $sourceCat['imagen'] ?? null;
        if ($catHasOrden) $catPayload[':orden'] = isset($sourceCat['orden']) ? (int)$sourceCat['orden'] : null;

        $insertCategory->execute($catPayload);
        $categoryMap[(int)$sourceCat['idCategoria']] = (int)$conexionPrincipal->lastInsertId();
    }

    $sourceProductSelectFields = ['titulo', 'precio', 'idCategoria'];
    foreach ($prodExistingOptional as $field) {
        $sourceProductSelectFields[] = $field;
    }
    $sourceProductSelect = 'SELECT ' . implode(', ', $sourceProductSelectFields) . ' FROM productos';
    $sourceProducts = fetchTemplateRows(
        $conexionPrincipal,
        "{$sourceProductSelect} WHERE store_id = :source_store_id ORDER BY idProducto ASC",
        "{$sourceProductSelect} WHERE store_id IS NULL ORDER BY idProducto ASC",
        $sourceStoreId
    );

    $productInsertColumns = ['store_id', 'titulo', 'precio', 'idCategoria'];
    foreach ($prodExistingOptional as $field) {
        $productInsertColumns[] = $field;
    }
    $productInsertParams = array_map(static fn($col) => ':' . $col, $productInsertColumns);
    $insertProduct = $conexionPrincipal->prepare(
        'INSERT INTO productos (' . implode(', ', $productInsertColumns) . ') VALUES (' . implode(', ', $productInsertParams) . ')'
    );

    foreach ($sourceProducts as $product) {
        $sourceCategoryId = isset($product['idCategoria']) ? (int)$product['idCategoria'] : 0;
        $targetCategoryId = $sourceCategoryId > 0 && isset($categoryMap[$sourceCategoryId]) ? (int)$categoryMap[$sourceCategoryId] : null;

        $productPayload = [
            ':store_id' => $storeId,
            ':titulo' => $product['titulo'] ?? 'Producto',
            ':precio' => $product['precio'] ?? 0,
            ':idCategoria' => $targetCategoryId,
        ];

        foreach ($prodExistingOptional as $field) {
            if ($field === 'tieneVariantes') {
                $productPayload[':' . $field] = isset($product[$field]) ? (int)$product[$field] : 0;
                continue;
            }
            if ($field === 'estadoProducto') {
                $productPayload[':' . $field] = $product[$field] ?? 'Activo';
                continue;
            }
            $productPayload[':' . $field] = array_key_exists($field, $product) ? $product[$field] : null;
        }

        $insertProduct->execute($productPayload);
    }

    $sourceBannerSelect = 'SELECT imagen' . ($bannerHasTipo ? ', tipo' : ", 'principal' AS tipo") . ' FROM banner';
    $sourceBanners = fetchTemplateRows(
        $conexionPrincipal,
        "{$sourceBannerSelect} WHERE store_id = :source_store_id ORDER BY idBanner ASC",
        "{$sourceBannerSelect} WHERE store_id IS NULL ORDER BY idBanner ASC",
        $sourceStoreId
    );

    $bannerInsertCols = ['store_id', 'imagen'];
    if ($bannerHasTipo) $bannerInsertCols[] = 'tipo';
    $bannerInsertParams = array_map(static fn($col) => ':' . $col, $bannerInsertCols);
    $insertBanner = $conexionPrincipal->prepare(
        'INSERT INTO banner (' . implode(', ', $bannerInsertCols) . ') VALUES (' . implode(', ', $bannerInsertParams) . ')'
    );
    foreach ($sourceBanners as $bannerRow) {
        $bannerPayload = [
            ':store_id' => $storeId,
            ':imagen' => $bannerRow['imagen'] ?? '',
        ];
        if ($bannerHasTipo) {
            $bannerPayload[':tipo'] = $bannerRow['tipo'] ?? 'principal';
        }
        $insertBanner->execute($bannerPayload);
    }

    $sourceSubSelect = 'SELECT imagen' . ($subHasOrden ? ', orden' : ', NULL AS orden') . ' FROM sub_banner';
    $sourceSubOrder = $subHasOrden ? 'ORDER BY COALESCE(orden, idSubBanner) ASC' : 'ORDER BY idSubBanner ASC';
    $sourceSub = fetchTemplateRows(
        $conexionPrincipal,
        "{$sourceSubSelect} WHERE store_id = :source_store_id {$sourceSubOrder}",
        "{$sourceSubSelect} WHERE store_id IS NULL {$sourceSubOrder}",
        $sourceStoreId
    );

    $subInsertCols = ['store_id', 'imagen'];
    if ($subHasOrden) $subInsertCols[] = 'orden';
    $subInsertParams = array_map(static fn($col) => ':' . $col, $subInsertCols);
    $insertSub = $conexionPrincipal->prepare(
        'INSERT INTO sub_banner (' . implode(', ', $subInsertCols) . ') VALUES (' . implode(', ', $subInsertParams) . ')'
    );
    foreach ($sourceSub as $subRow) {
        $subPayload = [
            ':store_id' => $storeId,
            ':imagen' => $subRow['imagen'] ?? '',
        ];
        if ($subHasOrden) {
            $subPayload[':orden'] = isset($subRow['orden']) ? (int)$subRow['orden'] : null;
        }
        $insertSub->execute($subPayload);
    }

    if (empty($sourceCategories)) {
        $fallbackColumns = ['store_id', 'categoria'];
        $fallbackParams = [':store_id', ':categoria'];
        if ($catHasDescripcion) {
            $fallbackColumns[] = 'descripcion';
            $fallbackParams[] = 'NULL';
        }
        if ($catHasImagen) {
            $fallbackColumns[] = 'imagen';
            $fallbackParams[] = 'NULL';
        }
        if ($catHasOrden) {
            $fallbackColumns[] = 'orden';
            $fallbackParams[] = '1';
        }
        $insertFallbackCategory = $conexionPrincipal->prepare(
            'INSERT INTO categorias (' . implode(', ', $fallbackColumns) . ') VALUES (' . implode(', ', $fallbackParams) . ')'
        );
        $insertFallbackCategory->execute([
            ':store_id' => $storeId,
            ':categoria' => 'Productos Naturales',
        ]);
    }
}

function seedStoreTemplateData(PDO $conexionPrincipal, int $storeId, string $storeSlug, string $template, array &$createdFiles): void {
    $templateKey = strtolower(trim($template));
    if ($templateKey === 'productos-naturales') {
        clonePrincipalCatalogData($conexionPrincipal, $storeId, $template);
        $countStmt = $conexionPrincipal->prepare('SELECT COUNT(*) FROM productos WHERE store_id = :store_id');
        $countStmt->execute([':store_id' => $storeId]);
        if ((int)$countStmt->fetchColumn() === 0) {
            $templateKey = 'productos-naturales-fallback';
        } else {
            return;
        }
    }

    $catHasOrden = hasColumn($conexionPrincipal, 'categorias', 'orden');
    $bannerHasTipo = hasColumn($conexionPrincipal, 'banner', 'tipo');
    $subHasOrden = hasColumn($conexionPrincipal, 'sub_banner', 'orden');

    $insertCategories = function (array $categories) use ($conexionPrincipal, $storeId, $catHasOrden): array {
        $map = [];
        if (empty($categories)) {
            return $map;
        }

        if ($catHasOrden) {
            $insertCat = $conexionPrincipal->prepare('INSERT INTO categorias (store_id, categoria, orden) VALUES (:store_id, :categoria, :orden)');
        } else {
            $insertCat = $conexionPrincipal->prepare('INSERT INTO categorias (store_id, categoria) VALUES (:store_id, :categoria)');
        }

        foreach ($categories as $index => $nombreCategoria) {
            $payload = [
                ':store_id' => $storeId,
                ':categoria' => $nombreCategoria,
            ];
            if ($catHasOrden) {
                $payload[':orden'] = $index + 1;
            }
            $insertCat->execute($payload);
            $map[strtolower($nombreCategoria)] = (int)$conexionPrincipal->lastInsertId();
        }
        return $map;
    };

    $insertProducts = function (array $products, array $categoryMap) use ($conexionPrincipal, $storeId): void {
        if (empty($products)) {
            return;
        }

        $existing = [];
        foreach (['descripcion', 'precioAnterior', 'masVendido', 'imagen1', 'estadoProducto', 'stock'] as $field) {
            if (hasColumn($conexionPrincipal, 'productos', $field)) {
                $existing[] = $field;
            }
        }

        $columns = ['store_id', 'titulo', 'precio', 'idCategoria'];
        foreach ($existing as $field) {
            $columns[] = $field;
        }
        $params = array_map(static fn($column) => ':' . $column, $columns);
        $stmt = $conexionPrincipal->prepare(
            'INSERT INTO productos (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $params) . ')'
        );

        foreach ($products as $item) {
            $categoryName = strtolower((string)($item['categoria'] ?? ''));
            $payload = [
                ':store_id' => $storeId,
                ':titulo' => (string)($item['titulo'] ?? 'Producto'),
                ':precio' => (float)($item['precio'] ?? 0),
                ':idCategoria' => $categoryMap[$categoryName] ?? null,
            ];

            foreach ($existing as $field) {
                if ($field === 'estadoProducto') {
                    $payload[':' . $field] = $item[$field] ?? 'Activo';
                    continue;
                }
                $payload[':' . $field] = $item[$field] ?? null;
            }
            $stmt->execute($payload);
        }
    };

    if ($templateKey === 'blanco') {
        $insertCategories(templateCategoryNames($template));
        return;
    }

    $templateImages = collectTemplateImages();
    $fallbackLogo = __DIR__ . '/logo.png';
    if (empty($templateImages) && is_file($fallbackLogo)) {
        $templateImages[] = $fallbackLogo;
    }
    if (empty($templateImages)) {
        throw new Exception('No hay imagenes de plantilla para provisionar banners.');
    }

    $bannerSources = [];
    $bannerSources[] = $templateImages[0];
    $bannerSources[] = $templateImages[1] ?? $templateImages[0];

    $bannerPrincipal = copyTemplateAsset($bannerSources[0], $storeSlug, 'banners', 'home', $createdFiles);
    $bannerCatalogo = copyTemplateAsset($bannerSources[1], $storeSlug, 'banners', 'catalogo', $createdFiles);

    if ($bannerHasTipo) {
        $insertBanner = $conexionPrincipal->prepare('INSERT INTO banner (store_id, imagen, tipo) VALUES (:store_id, :imagen, :tipo)');
        $insertBanner->execute([
            ':store_id' => $storeId,
            ':imagen' => $bannerPrincipal,
            ':tipo' => 'principal',
        ]);
        $insertBanner->execute([
            ':store_id' => $storeId,
            ':imagen' => $bannerCatalogo,
            ':tipo' => 'catalogo',
        ]);
    } else {
        $insertBanner = $conexionPrincipal->prepare('INSERT INTO banner (store_id, imagen) VALUES (:store_id, :imagen)');
        $insertBanner->execute([
            ':store_id' => $storeId,
            ':imagen' => $bannerPrincipal,
        ]);
        $insertBanner->execute([
            ':store_id' => $storeId,
            ':imagen' => $bannerCatalogo,
        ]);
    }

    $subSources = array_slice($templateImages, 0, 6);
    if (count($subSources) < 2) {
        $subSources[] = $subSources[0];
    }

    if ($subHasOrden) {
        $insertSub = $conexionPrincipal->prepare('INSERT INTO sub_banner (store_id, imagen, orden) VALUES (:store_id, :imagen, :orden)');
    } else {
        $insertSub = $conexionPrincipal->prepare('INSERT INTO sub_banner (store_id, imagen) VALUES (:store_id, :imagen)');
    }
    foreach ($subSources as $index => $sourcePath) {
        $subPath = copyTemplateAsset($sourcePath, $storeSlug, 'subbanners', 'sub_' . ($index + 1), $createdFiles);
        $subPayload = [
            ':store_id' => $storeId,
            ':imagen' => $subPath,
        ];
        if ($subHasOrden) {
            $subPayload[':orden'] = $index + 1;
        }
        $insertSub->execute($subPayload);
    }

    $categoryNames = templateCategoryNames($template === 'productos-naturales-fallback' ? 'productos-naturales' : $template);
    $categoryMap = $insertCategories($categoryNames);

    $makeProductImage = function (int $offset = 0) use ($templateImages, $storeSlug, &$createdFiles): ?string {
        if (empty($templateImages)) {
            return null;
        }
        $source = $templateImages[$offset % count($templateImages)];
        return copyTemplateAsset($source, $storeSlug, 'productos', 'prod_' . ($offset + 1), $createdFiles);
    };

    $templateProducts = [];
    if ($templateKey === 'restaurante') {
        $templateProducts = [
            ['titulo' => 'Hamburguesa Angus Smoke', 'descripcion' => 'Carne premium, queso cheddar y salsa especial de la casa.', 'precio' => 23000, 'precioAnterior' => 28000, 'masVendido' => 'si', 'categoria' => 'Platos', 'estadoProducto' => 'Activo', 'stock' => 30, 'imagen1' => $makeProductImage(0)],
            ['titulo' => 'Pizza Artesanal Pepperoni', 'descripcion' => 'Masa madre, queso mozzarella y pepperoni italiano.', 'precio' => 32000, 'precioAnterior' => 36000, 'masVendido' => 'si', 'categoria' => 'Platos', 'estadoProducto' => 'Activo', 'stock' => 24, 'imagen1' => $makeProductImage(1)],
            ['titulo' => 'Limonada de Coco', 'descripcion' => 'Bebida fria natural con toque citrico y coco.', 'precio' => 9000, 'precioAnterior' => 11000, 'masVendido' => 'no', 'categoria' => 'Bebidas', 'estadoProducto' => 'Activo', 'stock' => 50, 'imagen1' => $makeProductImage(2)],
            ['titulo' => 'Combo Burger + Papas + Gaseosa', 'descripcion' => 'Combo recomendado para subir ticket promedio.', 'precio' => 29000, 'precioAnterior' => 34000, 'masVendido' => 'si', 'categoria' => 'Platos', 'estadoProducto' => 'Activo', 'stock' => 20, 'imagen1' => $makeProductImage(3)],
        ];
    } elseif ($templateKey === 'barberia') {
        $templateProducts = [
            ['titulo' => 'Corte Fade Premium', 'descripcion' => 'Corte moderno con acabado profesional y lavado.', 'precio' => 28000, 'precioAnterior' => 34000, 'masVendido' => 'si', 'categoria' => 'Cortes', 'estadoProducto' => 'Activo', 'stock' => 12, 'imagen1' => $makeProductImage(0)],
            ['titulo' => 'Perfilado de Barba', 'descripcion' => 'Diseño y perfilado para una imagen impecable.', 'precio' => 18000, 'precioAnterior' => 22000, 'masVendido' => 'si', 'categoria' => 'Barbas', 'estadoProducto' => 'Activo', 'stock' => 18, 'imagen1' => $makeProductImage(1)],
            ['titulo' => 'Combo Corte + Barba', 'descripcion' => 'Servicio completo con descuento especial.', 'precio' => 40000, 'precioAnterior' => 50000, 'masVendido' => 'si', 'categoria' => 'Cortes', 'estadoProducto' => 'Activo', 'stock' => 10, 'imagen1' => $makeProductImage(2)],
            ['titulo' => 'Tratamiento Capilar', 'descripcion' => 'Hidratacion profunda para fortalecer el cabello.', 'precio' => 35000, 'precioAnterior' => 42000, 'masVendido' => 'no', 'categoria' => 'Cortes', 'estadoProducto' => 'Activo', 'stock' => 8, 'imagen1' => $makeProductImage(3)],
        ];
    } elseif ($templateKey === 'productos-naturales-fallback') {
        $templateProducts = [
            ['titulo' => 'Omega 3 Natural', 'descripcion' => 'Suplemento diario para apoyar bienestar general.', 'precio' => 79000, 'precioAnterior' => 92000, 'masVendido' => 'si', 'categoria' => 'Productos Naturales', 'estadoProducto' => 'Activo', 'stock' => 25, 'imagen1' => $makeProductImage(0)],
            ['titulo' => 'Colageno Hidrolizado', 'descripcion' => 'Formula premium para piel, cabello y articulaciones.', 'precio' => 89000, 'precioAnterior' => 105000, 'masVendido' => 'si', 'categoria' => 'Productos Naturales', 'estadoProducto' => 'Activo', 'stock' => 20, 'imagen1' => $makeProductImage(1)],
            ['titulo' => 'Magnesio Plus', 'descripcion' => 'Apoyo diario para descanso y recuperacion muscular.', 'precio' => 64000, 'precioAnterior' => 76000, 'masVendido' => 'no', 'categoria' => 'Productos Naturales', 'estadoProducto' => 'Activo', 'stock' => 35, 'imagen1' => $makeProductImage(2)],
        ];
    }

    $insertProducts($templateProducts, $categoryMap);
}

function ensureUniqueCompatStoreName(PDO $conexionPrincipal, string $desiredName): string {
    $candidate = $desiredName;
    $counter = 0;
    do {
        $stmt = $conexionPrincipal->prepare('SELECT COUNT(*) FROM tiendas WHERE nombre = :nombre');
        $stmt->execute([':nombre' => $candidate]);
        $exists = (int)$stmt->fetchColumn() > 0;
        if (!$exists) {
            return $candidate;
        }
        $counter++;
        $candidate = substr($desiredName, 0, 80) . ' (' . $counter . ')';
    } while ($counter < 20);

    return substr($desiredName, 0, 70) . '-' . uniqid();
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo no permitido');
    }

    $nombre = trim((string)($_POST['nombre'] ?? ''));
    $slugInput = trim((string)($_POST['slug'] ?? ''));
    $template = trim((string)($_POST['template'] ?? 'productos-naturales'));
    $color = isset($_POST['color']) ? sanitizeString($_POST['color']) : null;
    $whatsapp = isset($_POST['whatsapp']) ? preg_replace('/\D+/', '', (string)$_POST['whatsapp']) : null;

    if ($nombre === '') {
        throw new Exception('El nombre de la tienda es requerido');
    }

    $slug = $slugInput !== '' ? normalizeSlugStrict($slugInput) : deriveSlugFromName($nombre);
    if ($slug === '') {
        throw new Exception('Slug invalido. Usa lowercase [a-z0-9-] y longitud de 2 a 30.');
    }

    $conexionPrincipal = conectarPrincipal();
    ensureStoresTables($conexionPrincipal);
    ensureTiendasCompatibilityTable($conexionPrincipal);
    ensureCoreTables($conexionPrincipal);
    ensureStoreUserColumns($conexionPrincipal);

    $stmtExists = $conexionPrincipal->prepare('SELECT COUNT(*) FROM stores WHERE slug = :slug');
    $stmtExists->execute([':slug' => $slug]);
    if ((int)$stmtExists->fetchColumn() > 0) {
        throw new Exception('Este slug ya existe');
    }

    $stmtExistsCompat = $conexionPrincipal->prepare('SELECT COUNT(*) FROM tiendas WHERE slug = :slug');
    $stmtExistsCompat->execute([':slug' => $slug]);
    if ((int)$stmtExistsCompat->fetchColumn() > 0) {
        throw new Exception('Este slug ya existe');
    }

    $logoUrl = null;
    $logoFilePath = null;
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
            $logoUrl = 'uploads/logos/' . $fileName;
            $logoFilePath = $filePath;
        }
    }

    $createdFiles = [];
    $conexionPrincipal->beginTransaction();
    $creatorUserId = isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 0;
    $hasSeedCredentials = resolveStoreAdminCredentials($slug) !== null;
    if (!$hasSeedCredentials && $creatorUserId <= 0) {
        throw new Exception('No hay credenciales seed en entorno y no hay usuario autenticado para asignar la nueva tienda.');
    }

    $stmtStore = $conexionPrincipal->prepare('
        INSERT INTO stores (owner_user_id, name, slug, template, color, whatsapp, logo)
        VALUES (:owner_user_id, :name, :slug, :template, :color, :whatsapp, :logo)
    ');
    $stmtStore->execute([
        ':owner_user_id' => max($creatorUserId, 1),
        ':name' => $nombre,
        ':slug' => $slug,
        ':template' => $template,
        ':color' => $color,
        ':whatsapp' => ($whatsapp !== '' ? $whatsapp : null),
        ':logo' => $logoUrl,
    ]);
    $storeId = (int)$conexionPrincipal->lastInsertId();

    $adminUser = createStoreAdminUser($conexionPrincipal, $slug, $nombre, $storeId);
    $ownerUserId = $creatorUserId > 0 ? $creatorUserId : (int)($adminUser['id'] ?? 0);
    if ($ownerUserId <= 0) {
        throw new Exception('No fue posible asignar owner_user_id para la tienda.');
    }

    $stmtUpdateOwner = $conexionPrincipal->prepare('UPDATE stores SET owner_user_id = :owner_user_id WHERE id = :id');
    $stmtUpdateOwner->execute([
        ':owner_user_id' => $ownerUserId,
        ':id' => $storeId,
    ]);

    $stmtMember = $conexionPrincipal->prepare('
        INSERT INTO store_members (store_id, user_id, role)
        VALUES (:store_id, :user_id, :role)
    ');
    $stmtMember->execute([
        ':store_id' => $storeId,
        ':user_id' => $ownerUserId,
        ':role' => 'owner',
    ]);

    if (!empty($adminUser['id'])) {
        $stmtMemberAdmin = $conexionPrincipal->prepare('
            INSERT INTO store_members (store_id, user_id, role)
            VALUES (:store_id, :user_id, :role)
            ON DUPLICATE KEY UPDATE role = VALUES(role)
        ');
        $stmtMemberAdmin->execute([
            ':store_id' => $storeId,
            ':user_id' => (int)$adminUser['id'],
            ':role' => 'admin',
        ]);
    }

    $compatName = ensureUniqueCompatStoreName($conexionPrincipal, $nombre);
    $stmtCompat = $conexionPrincipal->prepare('
        INSERT INTO tiendas (nombre, slug, color, whatsapp, logo)
        VALUES (:nombre, :slug, :color, :whatsapp, :logo)
    ');
    $stmtCompat->execute([
        ':nombre' => $compatName,
        ':slug' => $slug,
        ':color' => $color,
        ':whatsapp' => ($whatsapp !== '' ? $whatsapp : null),
        ':logo' => $logoUrl,
    ]);

    seedStoreTemplateData($conexionPrincipal, $storeId, $slug, $template, $createdFiles);

    $conexionPrincipal->commit();

    $_SESSION['tienda_slug'] = $slug;

    echo json_encode(respuestaJSON(true, [
        'tienda' => [
            'idTienda' => $storeId,
            'id' => $storeId,
            'store_id' => $storeId,
            'nombre' => $nombre,
            'name' => $nombre,
            'slug' => $slug,
            'color' => $color,
            'whatsapp' => ($whatsapp !== '' ? $whatsapp : null),
            'logo' => $logoUrl,
            'owner_user_id' => $ownerUserId,
            'template' => $template,
            'createdAt' => date('Y-m-d H:i:s'),
            'admin_seeded' => !empty($adminUser['id']),
            'admin_login_email' => $adminUser['email'] ?? null,
            'admin_visual_email' => $adminUser['visual_email'] ?? null,
            'force_password_change' => !empty($adminUser['id']),
        ],
    ], 'Tienda creada exitosamente'));
} catch (Throwable $e) {
    if (isset($conexionPrincipal) && $conexionPrincipal instanceof PDO && $conexionPrincipal->inTransaction()) {
        $conexionPrincipal->rollBack();
    }

    if (!empty($createdFiles) && is_array($createdFiles)) {
        foreach ($createdFiles as $createdPath) {
            if (is_file($createdPath)) {
                @unlink($createdPath);
            }
        }
    }
    if (!empty($logoFilePath) && is_file($logoFilePath)) {
        @unlink($logoFilePath);
    }

    http_response_code(500);
    echo json_encode(respuestaJSON(false, [], $e->getMessage()));
}
