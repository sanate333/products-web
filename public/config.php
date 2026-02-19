<?php
/**
 * CONFIGURACION CENTRALIZADA PARA SISTEMA MULTI-TIENDA
 * Modo DB:
 * - single: todas las tiendas usan una sola BD
 * - multi: cada tienda usa su propia BD (tienda_<slug>)
 * - auto: intenta multi y hace fallback a single si no puede crear/usar BD
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    error_log("ENV MISSING: " . $envFile);
}

$autoloadPath = __DIR__ . '/vendor/autoload.php';
$phpVersionOk = version_compare(PHP_VERSION, '8.1.0', '>=');
if ($phpVersionOk && file_exists($autoloadPath)) {
    require $autoloadPath;
    if (class_exists('Dotenv\\Dotenv')) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__, '.env');
        $dotenv->safeLoad();
    }
} else {
    if (!$phpVersionOk) {
        error_log("PHP < 8.1 detected, skipping vendor autoload.");
    }
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }
            $pos = strpos($line, '=');
            if ($pos === false) {
                continue;
            }
            $key = trim(substr($line, 0, $pos));
            $value = trim(substr($line, $pos + 1));
            if ($value !== '' && (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === "'" && substr($value, -1) === "'"))) {
                $value = substr($value, 1, -1);
            }
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

$DB_HOST = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? '127.0.0.1';
$DB_PORT = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?? '3306';
$DB_USER = $_ENV['DB_USER'] ?? getenv('DB_USER') ?? 'root';
$DB_PASS = $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?? '';
$DB_MAIN = $_ENV['DB_NAME'] ?? $_ENV['DB_MAIN'] ?? getenv('DB_NAME') ?? '';
$DB_MODE = strtolower((string)($_ENV['DB_MODE'] ?? getenv('DB_MODE') ?? 'auto'));
$DB_PREFIX = $_ENV['DB_PREFIX'] ?? getenv('DB_PREFIX') ?? '';
$DB_SEED_TEMPLATES = strtolower((string)($_ENV['DB_SEED_TEMPLATES'] ?? getenv('DB_SEED_TEMPLATES') ?? '1'));
$DB_MAP_RAW = $_ENV['DB_MAP'] ?? getenv('DB_MAP') ?? '';

if ($DB_MAIN === '' || $DB_USER === '') {
    $DB_HOST = 'localhost';
    $DB_PORT = '3306';
    $DB_MAIN = 'u274689770_sanate';
    $DB_USER = 'u274689770_sanate';
    $DB_PASS = 'Sanate009';
    error_log("ENV FALLBACK APPLIED");
}

error_log("ENV READ DB_HOST={$DB_HOST} DB_PORT={$DB_PORT} DB_NAME={$DB_MAIN} DB_USER={$DB_USER}");

function parseDbMap($raw) {
    $map = [];
    if (!$raw) {
        return $map;
    }
    $pairs = explode(',', $raw);
    foreach ($pairs as $pair) {
        $pair = trim($pair);
        if ($pair === '' || strpos($pair, ':') === false) {
            continue;
        }
        [$slug, $dbname] = array_map('trim', explode(':', $pair, 2));
        if ($slug !== '' && $dbname !== '') {
            $map[strtolower($slug)] = $dbname;
        }
    }
    return $map;
}

if ($DB_MAIN === '') {
    throw new Exception('DB_NAME/DB_MAIN no esta definido en .env');
}

/**
 * Detecta la tienda actual desde header, query, session o URL.
 */
function getTiendaActual() {
    if (!empty($_SERVER['HTTP_X_TIENDA'])) {
        return sanitizeString($_SERVER['HTTP_X_TIENDA']);
    }

    if (!empty($_GET['tienda'])) {
        return sanitizeString($_GET['tienda']);
    }

    if (!empty($_SESSION['tienda_slug'])) {
        return sanitizeString($_SESSION['tienda_slug']);
    }

    if (!empty($_SERVER['REQUEST_URI'])) {
        $uri = $_SERVER['REQUEST_URI'];
        if (preg_match('#/dashboard/([a-z0-9-]+)(?:/|$)#i', $uri, $match)) {
            return strtolower($match[1]);
        }
        if (preg_match('/home\\.([a-z0-9-]+)/i', $uri, $match)) {
            return strtolower($match[1]);
        }
        if (preg_match('/dashboard-([a-z0-9-]+)/i', $uri, $match)) {
            return strtolower($match[1]);
        }
        if (preg_match('#^/([a-z0-9-]+)(?:/|$)#i', $uri, $match)) {
            $reserved = ['dashboard', 'producto', 'api', 'generated', 'static'];
            $candidate = strtolower($match[1]);
            if (!in_array($candidate, $reserved, true)) {
                return $candidate;
            }
        }
    }

    return getTiendaPorDefecto();
}

/**
 * Obtiene la tienda por defecto.
 * Prioridad: ENV DEFAULT_TIENDA_SLUG -> primera tienda en tabla tiendas -> principal.
 */
function getTiendaPorDefecto() {
    static $cachedSlug = null;

    if ($cachedSlug !== null) {
        return $cachedSlug;
    }

    $envDefault = $_ENV['DEFAULT_TIENDA_SLUG'] ?? getenv('DEFAULT_TIENDA_SLUG') ?? '';
    if ($envDefault !== '') {
        $cachedSlug = sanitizeString(strtolower($envDefault));
        return $cachedSlug;
    }

    try {
        $conexionPrincipal = conectarPrincipal();
        $stmtStores = $conexionPrincipal->query("SELECT slug FROM stores ORDER BY id ASC LIMIT 1");
        $slug = $stmtStores ? $stmtStores->fetchColumn() : null;
        if (empty($slug)) {
            $stmt = $conexionPrincipal->query("SELECT slug FROM tiendas ORDER BY idTienda ASC LIMIT 1");
            $slug = $stmt ? $stmt->fetchColumn() : null;
        }
        if (!empty($slug)) {
            $cachedSlug = sanitizeString(strtolower((string)$slug));
            return $cachedSlug;
        }
    } catch (Throwable $e) {
        // Ignora y usa fallback.
    }

    $cachedSlug = 'principal';
    return $cachedSlug;
}

/**
 * Convierte slug a nombre de BD.
 */
function getDBNameForTienda($tiendaSlug) {
    global $DB_MODE, $DB_MAIN, $DB_PREFIX, $DB_MAP_RAW;

    $mode = $DB_MODE ?: 'auto';
    if ($mode === 'single') {
        return $DB_MAIN;
    }

    $normalized = strtolower((string)$tiendaSlug);
    if ($normalized === '' || $normalized === 'principal' || $normalized === 'default' || $normalized === 'eco-commerce') {
        return $DB_MAIN;
    }

    $sanitized = preg_replace('/[^a-z0-9_]/', '_', strtolower($tiendaSlug));

    $map = parseDbMap($DB_MAP_RAW);
    if (isset($map[$sanitized])) {
        return $map[$sanitized];
    }

    $prefix = $DB_PREFIX;
    if ($prefix === '' && strpos($DB_MAIN, '_') !== false) {
        $pos = strrpos($DB_MAIN, '_');
        if ($pos !== false) {
            $prefix = substr($DB_MAIN, 0, $pos + 1);
        }
    }

    return $prefix . 'tienda_' . $sanitized;
}

/**
 * Genera candidatos de BD para una tienda.
 */
function getDBCandidatesForTienda($tiendaSlug) {
    global $DB_PREFIX, $DB_MAIN, $DB_MAP_RAW;
    $sanitized = preg_replace('/[^a-z0-9_]/', '_', strtolower($tiendaSlug));

    $map = parseDbMap($DB_MAP_RAW);
    $mapped = $map[$sanitized] ?? null;

    $normalized = strtolower((string)$tiendaSlug);
    if ($normalized === '' || $normalized === 'principal' || $normalized === 'default' || $normalized === 'eco-commerce') {
        return [$DB_MAIN];
    }

    $prefix = $DB_PREFIX;
    if ($prefix === '' && strpos($DB_MAIN, '_') !== false) {
        $pos = strrpos($DB_MAIN, '_');
        if ($pos !== false) {
            $prefix = substr($DB_MAIN, 0, $pos + 1);
        }
    }

    $candidates = [
        $mapped,
        $prefix . 'tienda_' . $sanitized,
        $prefix . $sanitized,
        'tienda_' . $sanitized,
        $sanitized
    ];

    return array_values(array_unique(array_filter($candidates)));
}

/**
 * Conectar a BD de tienda.
 */
function conectarTienda($tiendaSlug = null) {
    global $DB_HOST, $DB_PORT, $DB_USER, $DB_PASS, $DB_MAIN, $DB_MODE;

    if ($tiendaSlug === null) {
        $tiendaSlug = getTiendaActual();
    }

    $servidor = $DB_HOST . ':' . $DB_PORT;
    $mode = $DB_MODE ?: 'auto';
    $dbname = getDBNameForTienda($tiendaSlug);
    $candidates = getDBCandidatesForTienda($tiendaSlug);

    try {
        if ($mode === 'single') {
            $dsn = "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_MAIN;charset=utf8mb4";
            $conexion = new PDO($dsn, $DB_USER, $DB_PASS);
            $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            ensureCoreTables($conexion);
            crearTablaNotificaciones($conexion);
            return $conexion;
        }

        foreach ($candidates as $candidateDb) {
            try {
                $dsn = "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$candidateDb;charset=utf8mb4";
                $conexionTienda = new PDO($dsn, $DB_USER, $DB_PASS);
                $conexionTienda->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                ensureCoreTables($conexionTienda);
                crearTablaNotificaciones($conexionTienda);
                maybeSeedTemplates($conexionTienda);
                return $conexionTienda;
            } catch (PDOException $inner) {
                // Intenta el siguiente candidato
            }
        }

        // Si ninguna BD existe o conecta
        throw new PDOException("No se pudo conectar a la BD de tienda");
    } catch (PDOException $e) {
        try {
            if ($mode === 'auto') {
                $dsn = "mysql:host=$DB_HOST;port=$DB_PORT";
                $conexion = new PDO($dsn, $DB_USER, $DB_PASS);
                $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $conexion->exec("CREATE DATABASE IF NOT EXISTS $dbname
                    CHARACTER SET utf8mb4
                    COLLATE utf8mb4_unicode_ci");
                $dsn = "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$dbname;charset=utf8mb4";
                $conexionTienda = new PDO($dsn, $DB_USER, $DB_PASS);
                $conexionTienda->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                ensureCoreTables($conexionTienda);
                crearTablaNotificaciones($conexionTienda);
                maybeSeedTemplates($conexionTienda);
                return $conexionTienda;
            }
        } catch (PDOException $e2) {
            // Continua al fallback
        }

        // Fallback a BD principal (modo auto)
        if ($mode === 'auto') {
            $dsn = "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_MAIN;charset=utf8mb4";
            $conexionFallback = new PDO($dsn, $DB_USER, $DB_PASS);
            $conexionFallback->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            ensureCoreTables($conexionFallback);
            crearTablaNotificaciones($conexionFallback);
            return $conexionFallback;
        }

        throw new Exception("Error conectando a BD de tienda: " . $e->getMessage());
    }
}

/**
 * Conectar a BD principal (metadata de tiendas).
 */
function conectarPrincipal() {
    global $DB_HOST, $DB_PORT, $DB_USER, $DB_PASS, $DB_MAIN;

    $servidor = $DB_HOST . ':' . $DB_PORT;

    try {
        $dsn = "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_MAIN;charset=utf8mb4";
        $conexionPrincipal = new PDO($dsn, $DB_USER, $DB_PASS);
        $conexionPrincipal->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $conexionPrincipal->exec("CREATE TABLE IF NOT EXISTS `tiendas` (
            idTienda INT(11) AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            slug VARCHAR(100) NOT NULL UNIQUE,
            color VARCHAR(20) NULL,
            logo VARCHAR(900) NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $conexionPrincipal->exec("CREATE TABLE IF NOT EXISTS `stores` (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            owner_user_id INT(11) NOT NULL,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) NOT NULL UNIQUE,
            color VARCHAR(20) NULL,
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

        ensureCoreTables($conexionPrincipal);

        return $conexionPrincipal;
    } catch (PDOException $e) {
        throw new Exception("Error conectando a BD principal: " . $e->getMessage());
    }
}

/**
 * Crear tablas basicas si no existen.
 */
function ensureCoreTables($conexion) {
    $conexion->exec("CREATE TABLE IF NOT EXISTS `usuarios` (
        idUsuario INT(11) AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        contrasena VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'user',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `categorias` (
        idCategoria INT(11) AUTO_INCREMENT PRIMARY KEY,
        categoria VARCHAR(100) NOT NULL UNIQUE,
        descripcion LONGTEXT,
        imagen VARCHAR(900),
        orden INT(11) DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `banner` (
        idBanner INT(11) AUTO_INCREMENT PRIMARY KEY,
        store_id BIGINT UNSIGNED NULL,
        imagen VARCHAR(900) NOT NULL,
        tipo VARCHAR(30) NOT NULL DEFAULT 'principal',
        INDEX idx_banner_store (store_id),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `sub_banner` (
        idSubBanner INT(11) AUTO_INCREMENT PRIMARY KEY,
        store_id BIGINT UNSIGNED NULL,
        imagen VARCHAR(900) NOT NULL,
        orden INT(11) NULL,
        INDEX idx_subbanner_store (store_id),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `productos` (
        idProducto INT(11) AUTO_INCREMENT PRIMARY KEY,
        store_id BIGINT UNSIGNED NULL,
        descripcion LONGTEXT,
        titulo VARCHAR(255) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        idCategoria INT(11) NULL,
        masVendido VARCHAR(30) NULL,
        imagen1 VARCHAR(900),
        imagen2 VARCHAR(900),
        imagen3 VARCHAR(900),
        imagen4 VARCHAR(900),
        item1 VARCHAR(255),
        item2 VARCHAR(255),
        item3 VARCHAR(255),
        item4 VARCHAR(255),
        item5 VARCHAR(255),
        item6 VARCHAR(255),
        item7 VARCHAR(255),
        item8 VARCHAR(255),
        item9 VARCHAR(255),
        item10 VARCHAR(255),
        precioAnterior DECIMAL(10,2) NOT NULL DEFAULT 0,
        gananciaAprox DECIMAL(10,2) NULL DEFAULT NULL,
        stock INT(11) NULL DEFAULT NULL,
        estadoProducto VARCHAR(20) NULL DEFAULT 'Activo',
        tieneVariantes TINYINT(1) NULL DEFAULT 0,
        INDEX idx_productos_store (store_id),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `pedidos` (
        idPedido INT(11) AUTO_INCREMENT PRIMARY KEY,
        store_id BIGINT UNSIGNED NULL,
        idMesa INT(11) NOT NULL DEFAULT 0,
        estado VARCHAR(50) NOT NULL,
        productos JSON NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        nota VARCHAR(255) NULL,
        nombre VARCHAR(50) NOT NULL,
        codigo VARCHAR(50) NULL,
        whatsapp VARCHAR(30) NULL,
        direccion VARCHAR(255) NULL,
        ciudad VARCHAR(100) NULL,
        departamento VARCHAR(100) NULL,
        adicionales VARCHAR(255) NULL,
        formaPago VARCHAR(100) NULL,
        ip VARCHAR(64) NULL,
        userAgent VARCHAR(255) NULL,
        INDEX idx_pedidos_store (store_id),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `contacto` (
        idContacto INT(11) AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        asunto VARCHAR(200),
        mensaje TEXT NOT NULL,
        leido TINYINT(1) DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `codigos` (
        idCodigo INT(11) AUTO_INCREMENT PRIMARY KEY,
        store_id BIGINT UNSIGNED NULL,
        codigo VARCHAR(50) NOT NULL,
        descuento DECIMAL(10,2) NOT NULL,
        INDEX idx_codigos_store (store_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `mesas` (
        idMesa INT(11) AUTO_INCREMENT PRIMARY KEY,
        mesa VARCHAR(100) NOT NULL,
        estado VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `clientes` (
        idCliente INT(11) AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NULL,
        whatsapp VARCHAR(30) NOT NULL UNIQUE,
        direccion VARCHAR(255) NULL,
        ciudad VARCHAR(100) NULL,
        departamento VARCHAR(100) NULL,
        totalPedidos INT(11) NOT NULL DEFAULT 0,
        totalGastado DECIMAL(10,2) NOT NULL DEFAULT 0,
        ultimoPedido TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conexion->exec("CREATE TABLE IF NOT EXISTS `notificaciones` (
        idNotificacion INT(11) AUTO_INCREMENT PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        mensaje TEXT NOT NULL,
        datos JSON NULL,
        leida TINYINT(1) DEFAULT 0,
        usuarioId INT(11) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_leida (leida),
        INDEX idx_createdAt (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    ensureStoreScopedColumns($conexion);
}

function ensureStoreScopedColumns($conexion) {
    $tableColumns = [
        'productos' => [
            'store_id' => 'BIGINT UNSIGNED NULL',
        ],
        'banner' => [
            'store_id' => 'BIGINT UNSIGNED NULL',
            'tipo' => "VARCHAR(30) NOT NULL DEFAULT 'principal'",
        ],
        'sub_banner' => [
            'store_id' => 'BIGINT UNSIGNED NULL',
        ],
        'pedidos' => [
            'store_id' => 'BIGINT UNSIGNED NULL',
        ],
        'codigos' => [
            'store_id' => 'BIGINT UNSIGNED NULL',
        ],
    ];

    foreach ($tableColumns as $table => $columns) {
        foreach ($columns as $column => $definition) {
            $stmt = $conexion->prepare("
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = :table
                  AND COLUMN_NAME = :column
            ");
            $stmt->execute([
                ':table' => $table,
                ':column' => $column,
            ]);
            if ((int)$stmt->fetchColumn() === 0) {
                $conexion->exec("ALTER TABLE `$table` ADD COLUMN $column $definition");
            }
        }
    }

    $idx = $conexion->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'productos'
          AND INDEX_NAME = 'idx_productos_store'
    ");
    $idx->execute();
    if ((int)$idx->fetchColumn() === 0) {
        $conexion->exec("ALTER TABLE `productos` ADD INDEX idx_productos_store (store_id)");
    }

    $idxCodigos = $conexion->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'codigos'
          AND INDEX_NAME = 'idx_codigos_store'
    ");
    $idxCodigos->execute();
    if ((int)$idxCodigos->fetchColumn() === 0) {
        $conexion->exec("ALTER TABLE `codigos` ADD INDEX idx_codigos_store (store_id)");
    }
}

function getStoreBySlug($conexionPrincipal, $slug) {
    $sql = "SELECT id, owner_user_id, name, slug, color, logo, created_at, updated_at
            FROM stores
            WHERE slug = :slug
            LIMIT 1";
    $stmt = $conexionPrincipal->prepare($sql);
    $stmt->bindParam(':slug', $slug, PDO::PARAM_STR);
    $stmt->execute();
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Crear tabla de notificaciones en BD de tienda.
 */
function crearTablaNotificaciones($conexion) {
    try {
        $conexion->exec("CREATE TABLE IF NOT EXISTS `notificaciones` (
            idNotificacion INT(11) AUTO_INCREMENT PRIMARY KEY,
            tipo VARCHAR(50) NOT NULL COMMENT 'producto_nuevo, pedido_nuevo, orden_actualizada, etc',
            titulo VARCHAR(255) NOT NULL,
            mensaje TEXT NOT NULL,
            datos JSON NULL COMMENT 'Datos adicionales en JSON',
            leida TINYINT(1) DEFAULT 0,
            usuarioId INT(11) NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_leida (leida),
            INDEX idx_createdAt (createdAt),
            INDEX idx_usuarioId (usuarioId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {
        // Tabla ya existe, ignora error
    }
}

/**
 * Sanitizar string.
 */
function sanitizeString($string) {
    return htmlspecialchars(trim($string), ENT_QUOTES, 'UTF-8');
}

/**
 * Utilidades de seed de plantillas.
 */
function tablaExiste($conexion, $tabla) {
    $stmt = $conexion->prepare("SHOW TABLES LIKE :tabla");
    $stmt->bindParam(':tabla', $tabla, PDO::PARAM_STR);
    $stmt->execute();
    return $stmt->rowCount() > 0;
}

function tablaTieneDatos($conexion, $tabla) {
    $stmt = $conexion->query("SELECT COUNT(*) AS total FROM `$tabla`");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return intval($row['total'] ?? 0) > 0;
}

function copiarTablaPlantilla($conexionOrigen, $conexionDestino, $tabla) {
    if (!tablaExiste($conexionOrigen, $tabla) || !tablaExiste($conexionDestino, $tabla)) {
        return;
    }

    if (tablaTieneDatos($conexionDestino, $tabla)) {
        return;
    }

    $cols = [];
    $stmtCols = $conexionOrigen->query("SHOW COLUMNS FROM `$tabla`");
    while ($col = $stmtCols->fetch(PDO::FETCH_ASSOC)) {
        $cols[] = $col['Field'];
    }

    if (empty($cols)) {
        return;
    }

    $colList = '`' . implode('`,`', $cols) . '`';
    $placeholders = rtrim(str_repeat('?,', count($cols)), ',');
    $insertSql = "INSERT INTO `$tabla` ($colList) VALUES ($placeholders)";
    $insertStmt = $conexionDestino->prepare($insertSql);

    $stmtRows = $conexionOrigen->query("SELECT $colList FROM `$tabla`");
    while ($row = $stmtRows->fetch(PDO::FETCH_NUM)) {
        $insertStmt->execute($row);
    }
}

function seedTemplateDataForTienda($conexionPrincipal, $conexionTienda) {
    $templateTables = [
        'categorias',
        'banner',
        'subbanner',
        'subbanners',
        'sub_banner',
        'sub_banners'
    ];

    foreach ($templateTables as $tabla) {
        copiarTablaPlantilla($conexionPrincipal, $conexionTienda, $tabla);
    }
}

function maybeSeedTemplates($conexionTienda) {
    global $DB_SEED_TEMPLATES;
    if ($DB_SEED_TEMPLATES !== '1' && $DB_SEED_TEMPLATES !== 'true') {
        return;
    }

    try {
        $conexionPrincipal = conectarPrincipal();
        seedTemplateDataForTienda($conexionPrincipal, $conexionTienda);
    } catch (Exception $e) {
        // Evita romper si no se puede copiar plantilla
    }
}

/**
 * Respuesta JSON estandar.
 */
function respuestaJSON($success = true, $data = [], $mensaje = '') {
    $respuesta = [
        'success' => $success,
    ];

    if ($mensaje) {
        $respuesta['message'] = $mensaje;
    }

    if ($success && !empty($data)) {
        foreach ($data as $key => $value) {
            $respuesta[$key] = $value;
        }
    } elseif (!$success && empty($data['error'])) {
        $respuesta['error'] = $mensaje ?: 'Error desconocido';
    }

    return $respuesta;
}

header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Tienda');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
?>
