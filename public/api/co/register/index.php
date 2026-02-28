<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function readJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function normalizeText($value, int $max = 180): string {
    $text = trim((string)$value);
    if ($text === '') return '';
    return mb_substr($text, 0, $max, 'UTF-8');
}

function ensureSlug(string $value): string {
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug) ?? '';
    $slug = preg_replace('/\s+/', '-', $slug) ?? '';
    $slug = preg_replace('/-+/', '-', $slug) ?? '';
    return substr(trim($slug, '-'), 0, 40);
}

function loadRecords(string $filePath): array {
    if (!is_file($filePath)) return [];
    $raw = file_get_contents($filePath);
    $decoded = json_decode((string)$raw, true);
    return is_array($decoded) ? $decoded : [];
}

function hasSlug(array $rows, string $slug): bool {
    foreach ($rows as $row) {
        if (!is_array($row)) continue;
        if (strtolower((string)($row['storeSlug'] ?? '')) === strtolower($slug)) {
            return true;
        }
    }
    return false;
}

function resolveWritableDataDir(): string {
    $candidates = [
        __DIR__ . '/../../../data',
        __DIR__ . '/../../../../data',
    ];

    foreach ($candidates as $candidate) {
        $normalized = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $candidate);
        if (is_dir($normalized) && is_writable($normalized)) {
            return $normalized;
        }
        if (!is_dir($normalized) && @mkdir($normalized, 0775, true) && is_writable($normalized)) {
            return $normalized;
        }
    }

    throw new RuntimeException('No se pudo preparar carpeta data para registros CO');
}

try {
    $recordsDir = resolveWritableDataDir();
    $filePath = $recordsDir . DIRECTORY_SEPARATOR . 'co_registrations.json';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $candidate = ensureSlug((string)($_GET['slug'] ?? ''));
        if ($candidate === '' || !preg_match('/^[a-z0-9-]{3,40}$/', $candidate)) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'Slug invalido']);
            exit;
        }
        $rows = loadRecords($filePath);
        echo json_encode([
            'ok' => true,
            'slug' => $candidate,
            'available' => !hasSlug($rows, $candidate),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Metodo no permitido']);
        exit;
    }

    $body = readJsonBody();
    $templateKey = normalizeText($body['templateKey'] ?? '', 60);
    $templateTitle = normalizeText($body['templateTitle'] ?? '', 120);
    $storeName = normalizeText($body['storeName'] ?? '', 120);
    $storeSlug = ensureSlug((string)($body['storeSlug'] ?? ''));
    $email = normalizeText($body['email'] ?? '', 160);
    $whatsapp = normalizeText($body['whatsapp'] ?? '', 40);

    if ($templateKey === '' || $templateTitle === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Plantilla requerida']);
        exit;
    }
    if ($storeName === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Nombre de tienda requerido']);
        exit;
    }
    if ($storeSlug === '') {
        $storeSlug = ensureSlug($storeName);
    }
    if (!preg_match('/^[a-z0-9-]{3,40}$/', $storeSlug)) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Slug invalido']);
        exit;
    }
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Correo invalido']);
        exit;
    }
    if ($whatsapp === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'WhatsApp requerido']);
        exit;
    }
    $normalizedWhatsapp = preg_replace('/\D+/', '', $whatsapp) ?? '';
    if (strlen($normalizedWhatsapp) < 10) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'WhatsApp invalido']);
        exit;
    }

    $current = loadRecords($filePath);
    if (hasSlug($current, $storeSlug)) {
        http_response_code(409);
        echo json_encode(['ok' => false, 'error' => 'Este slug ya existe']);
        exit;
    }

    $entry = [
        'id' => 'co_' . time() . '_' . bin2hex(random_bytes(3)),
        'createdAt' => gmdate('c'),
        'templateKey' => $templateKey,
        'templateTitle' => $templateTitle,
        'storeName' => $storeName,
        'storeSlug' => $storeSlug,
        'email' => $email,
        'whatsapp' => $normalizedWhatsapp,
        'status' => 'pendiente_pago',
        'source' => '/co',
    ];

    array_unshift($current, $entry);
    $json = json_encode($current, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        throw new RuntimeException('No se pudo serializar JSON');
    }
    if (file_put_contents($filePath, $json, LOCK_EX) === false) {
        throw new RuntimeException('No se pudo guardar registro');
    }

    echo json_encode(['ok' => true, 'lead' => $entry], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
