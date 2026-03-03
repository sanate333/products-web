<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

date_default_timezone_set('America/Bogota');

require __DIR__ . '/vendor/autoload.php';
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$servidor = $_ENV['DB_HOST'] . ':' . $_ENV['DB_PORT'];
$usuario = $_ENV['DB_USER'];
$contrasena = $_ENV['DB_PASS'];
$dbname = $_ENV['DB_NAME'];

$mailTo = $_ENV['MAIL_TO'] ?? 'sanate333@gmail.com';
$mailFrom = $_ENV['MAIL_FROM'] ?? 'no-reply@sanate.store';
$mailFromName = $_ENV['MAIL_FROM_NAME'] ?? 'Sanate';
require __DIR__ . '/fcm.php';
$firebaseProjectId = $_ENV['FIREBASE_PROJECT_ID'] ?? '';

function formatProductosEmail($productosRaw) {
    $productos = $productosRaw;
    if (is_string($productosRaw)) {
        $decoded = json_decode($productosRaw, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $productos = $decoded;
        }
    }
    if (!is_array($productos)) {
        return 'Sin productos';
    }
    $lines = [];
    foreach ($productos as $producto) {
        $titulo = $producto['titulo'] ?? 'Producto';
        $cantidad = $producto['cantidad'] ?? 1;
        $precio = $producto['precio'] ?? '';
        $lines[] = '- ' . $titulo . ' x' . $cantidad . ($precio !== '' ? ' - ' . $precio : '');
    }
    return implode("\n", $lines);
}

function resolveUrl($path) {
    if (!$path) {
        return '';
    }
    if (preg_match('/^https?:\/\//i', $path)) {
        return $path;
    }
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (!$host) {
        return $path;
    }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $path = '/' . ltrim($path, '/');
    return $scheme . '://' . $host . $path;
}


function ensurePedidoColumns($conexion) {
    $conexion->exec("CREATE TABLE IF NOT EXISTS `pedidos` (
        idPedido INT(11) AUTO_INCREMENT PRIMARY KEY,
        idMesa INT(11) NOT NULL,
        estado VARCHAR(50) NOT NULL,
        productos JSON NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        nota VARCHAR(255) NOT NULL,
        nombre VARCHAR(50) NOT NULL,
        codigo VARCHAR(50) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $columns = [
        'whatsapp' => 'VARCHAR(30) NULL',
        'direccion' => 'VARCHAR(255) NULL',
        'ciudad' => 'VARCHAR(100) NULL',
        'departamento' => 'VARCHAR(100) NULL',
        'adicionales' => 'VARCHAR(255) NULL',
        'formaPago' => 'VARCHAR(100) NULL',
        'ip' => 'VARCHAR(64) NULL',
        'userAgent' => 'VARCHAR(255) NULL',
    ];

    $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = :column");
    foreach ($columns as $column => $definition) {
        $stmt->execute([':dbname' => $GLOBALS['dbname'], ':column' => $column]);
        $exists = (int)$stmt->fetchColumn() > 0;
        if (!$exists) {
            $conexion->exec("ALTER TABLE `pedidos` ADD COLUMN {$column} {$definition}");
        }
    }
}

function ensureProductoStockColumn($conexion) {
    $stmt = $conexion->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbname AND TABLE_NAME = 'productos' AND COLUMN_NAME = 'stock'");
    $stmt->execute([':dbname' => $GLOBALS['dbname']]);
    if ((int)$stmt->fetchColumn() === 0) {
        $conexion->exec("ALTER TABLE `productos` ADD COLUMN stock INT(11) NULL DEFAULT NULL");
    }
}

function ensureClientesTable($conexion) {
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
    )");
}

try {
    $dsn = "mysql:host=$servidor;dbname=$dbname";
    $conexion = new PDO($dsn, $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    ensurePedidoColumns($conexion);
    ensureProductoStockColumn($conexion);
    ensureClientesTable($conexion);
    $conexion->exec("CREATE TABLE IF NOT EXISTS `push_tokens` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        userAgent VARCHAR(255) NULL,
        deviceInfo VARCHAR(100) NULL,
        deviceId VARCHAR(80) NULL,
        role VARCHAR(30) NULL,
        ip VARCHAR(64) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(["error" => "Metodo no permitido"]);
        exit;
    }

    $idMesa = $_POST['idMesa'] ?? 0;
    $estado = $_POST['estado'] ?? 'Pendiente';
    $productosRaw = $_POST['productos'] ?? '[]';
    $productosDecoded = json_decode($productosRaw, true);
    $total = $_POST['total'] ?? '';
    $nombre = $_POST['nombre'] ?? '';
    $nota = $_POST['nota'] ?? '';
    $codigo = $_POST['codigo'] ?? '';

    $whatsapp = $_POST['whatsapp'] ?? '';
    $direccion = $_POST['direccion'] ?? '';
    $ciudad = $_POST['ciudad'] ?? '';
    $departamento = $_POST['departamento'] ?? '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    $adicionales = $_POST['adicionales'] ?? '';
    $formaPago = $_POST['formaPago'] ?? '';

    if (empty($nombre) || empty($total) || empty($productosDecoded)) {
        echo json_encode(["error" => "Por favor, complete todos los campos correctamente"]);
        exit;
    }

    $createdAt = date('Y-m-d H:i:s');
    $sqlInsertPedido = "INSERT INTO `pedidos` (idMesa, estado, productos, total, nombre, nota, codigo, whatsapp, direccion, ciudad, departamento, adicionales, formaPago, ip, userAgent, createdAt)
                        VALUES (:idMesa, :estado, :productos, :total, :nombre, :nota, :codigo, :whatsapp, :direccion, :ciudad, :departamento, :adicionales, :formaPago, :ip, :userAgent, :createdAt)";
    $stmtPedido = $conexion->prepare($sqlInsertPedido);
    $stmtPedido->bindParam(':idMesa', $idMesa);
    $stmtPedido->bindParam(':estado', $estado);
    $stmtPedido->bindParam(':productos', $productosRaw);
    $stmtPedido->bindParam(':total', $total);
    $stmtPedido->bindParam(':nombre', $nombre);
    $stmtPedido->bindParam(':nota', $nota);
    $stmtPedido->bindParam(':codigo', $codigo);
    $stmtPedido->bindParam(':whatsapp', $whatsapp);
    $stmtPedido->bindParam(':direccion', $direccion);
    $stmtPedido->bindParam(':ciudad', $ciudad);
    $stmtPedido->bindParam(':departamento', $departamento);
    $stmtPedido->bindParam(':adicionales', $adicionales);
    $stmtPedido->bindParam(':formaPago', $formaPago);
    $stmtPedido->bindParam(':ip', $ip);
    $stmtPedido->bindParam(':userAgent', $userAgent);
    $stmtPedido->bindParam(':createdAt', $createdAt);
    $stmtPedido->execute();

    $lastPedidoId = $conexion->lastInsertId();

    if (!empty($idMesa) && $idMesa != 0) {
        $sqlUpdateMesa = "UPDATE `mesas` SET estado = 'ocupada' WHERE idMesa = :idMesa";
        $stmtUpdateMesa = $conexion->prepare($sqlUpdateMesa);
        $stmtUpdateMesa->bindParam(':idMesa', $idMesa);
        $stmtUpdateMesa->execute();
    }

    if (is_array($productosDecoded)) {
        $stmtStock = $conexion->prepare("UPDATE `productos` SET stock = GREATEST(stock - :cantidad, 0) WHERE idProducto = :idProducto AND stock IS NOT NULL");
        foreach ($productosDecoded as $producto) {
            $idProducto = $producto['idProducto'] ?? $producto['id'] ?? null;
            $cantidad = isset($producto['cantidad']) ? (int)$producto['cantidad'] : 0;
            if (!$idProducto || $cantidad <= 0) {
                continue;
            }
            $stmtStock->execute([
                ':cantidad' => $cantidad,
                ':idProducto' => $idProducto,
            ]);
        }
    }

    if (!empty($whatsapp)) {
        $stmtCliente = $conexion->prepare("
            INSERT INTO clientes (nombre, whatsapp, direccion, ciudad, departamento, totalPedidos, totalGastado, ultimoPedido)
            VALUES (:nombre, :whatsapp, :direccion, :ciudad, :departamento, 1, :totalGastado, :ultimoPedido)
            ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                direccion = VALUES(direccion),
                ciudad = VALUES(ciudad),
                departamento = VALUES(departamento),
                totalPedidos = totalPedidos + 1,
                totalGastado = totalGastado + VALUES(totalGastado),
                ultimoPedido = VALUES(ultimoPedido)
        ");
        $stmtCliente->execute([
            ':nombre' => $nombre,
            ':whatsapp' => $whatsapp,
            ':direccion' => $direccion,
            ':ciudad' => $ciudad,
            ':departamento' => $departamento,
            ':totalGastado' => $total ?: 0,
            ':ultimoPedido' => $createdAt,
        ]);
    }

    $productosEmail = formatProductosEmail($productosRaw);
    $detalle = [
        "Nuevo pedido #{$lastPedidoId}",
        "Fecha: {$createdAt}",
        "Nombre: " . ($nombre ?: '-'),
        "WhatsApp: " . ($whatsapp ?: '-'),
        "Direccion: " . ($direccion ?: '-'),
        "Departamento: " . ($departamento ?: '-'),
        "Ciudad: " . ($ciudad ?: '-'),
        "Adicionales: " . ($adicionales ?: '-'),
        "Codigo: " . ($codigo ?: '-'),
        "Nota: " . ($nota ?: '-'),
        "Forma de pago: " . ($formaPago ?: '-'),
        "Estado: " . ($estado ?: '-'),
        "Pedido: " . ($idMesa ?: '-'),
        "Total: " . ($total ?: '-'),
        "Productos:\n{$productosEmail}",
    ];
    $subject = "Nuevo pedido #{$lastPedidoId}";
    $message = implode("\n", $detalle);
    $headers = [
        "From: {$mailFromName} <{$mailFrom}>",
        "Content-Type: text/plain; charset=UTF-8",
    ];
    $emailSent = @mail($mailTo, $subject, $message, implode("\r\n", $headers));

    $itemsCount = is_array($productosDecoded) ? array_reduce($productosDecoded, function ($carry, $item) {
        return $carry + (isset($item['cantidad']) ? (int)$item['cantidad'] : 1);
    }, 0) : 0;

    $title = "Sanate - Nueva orden";
    $body = "{$nombre} - {$itemsCount} item(s) - {$total}";

    $rows = [];
    try {
        $stmtAdmin = $conexion->prepare("SELECT token, deviceId, lastSeen FROM push_tokens WHERE role = 'admin' ORDER BY lastSeen DESC");
        $stmtAdmin->execute();
        $rows = $stmtAdmin->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $error) {
        $rows = [];
    }
    if (!$rows || count($rows) === 0) {
        $stmtAll = $conexion->prepare("SELECT token, deviceId, lastSeen FROM push_tokens ORDER BY lastSeen DESC");
        $stmtAll->execute();
        $rows = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
    }
    $tokensByDevice = [];
    $adminTokens = [];
    foreach ($rows as $row) {
        $token = $row['token'] ?? '';
        if (!$token) {
            continue;
        }
        $deviceId = $row['deviceId'] ?? '';
        if ($deviceId) {
            if (!isset($tokensByDevice[$deviceId])) {
                $tokensByDevice[$deviceId] = $token;
            }
            continue;
        }
        $adminTokens[] = $token;
    }
    $adminTokens = array_values(array_unique(array_merge($adminTokens, array_values($tokensByDevice))));

    $pushResponse = sendFcmNotification(
        $firebaseProjectId,
        $adminTokens,
        $title,
        $body,
        [
            'idPedido' => (string)$lastPedidoId,
            'nombre' => (string)$nombre,
            'total' => (string)$total,
            'type' => 'order',
            'url' => resolveUrl('/dashboard/pedidos'),
            'icon' => resolveUrl('/logo192.png'),
        ]
    );

    echo json_encode([
        "mensaje" => "$nombre tu pedido es el N#$lastPedidoId",
        "idPedido" => $lastPedidoId,
        "email" => $emailSent ? "ok" : "fail",
        "push" => $pushResponse,
    ]);
} catch (PDOException $error) {
    echo json_encode(["error" => "Error de conexion: " . $error->getMessage()]);
}
?>
