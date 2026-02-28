<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Metodo no permitido']);
    exit;
}

function resolveDataFiles(): array {
    $candidates = [
        __DIR__ . '/../../../data/co_registrations.json',
        __DIR__ . '/../../../../data/co_registrations.json',
    ];

    $normalized = [];
    foreach ($candidates as $path) {
        $normalized[] = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
    }
    return $normalized;
}

try {
    $filePath = null;
    foreach (resolveDataFiles() as $candidate) {
        if (is_file($candidate)) {
            $filePath = $candidate;
            break;
        }
    }

    if ($filePath === null) {
        echo json_encode(['ok' => true, 'items' => []], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $raw = file_get_contents($filePath);
    $decoded = json_decode((string)$raw, true);
    $items = is_array($decoded) ? $decoded : [];

    echo json_encode([
        'ok' => true,
        'items' => $items,
        'total' => count($items),
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
