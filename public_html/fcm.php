<?php

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function getFirebaseServiceAccount() {
    $path = $_ENV['FIREBASE_SERVICE_ACCOUNT'] ?? 'server/firebase-adminsdk.json';
    if (!preg_match('/^[A-Za-z]:\\\\/i', $path)) {
        $path = __DIR__ . '/' . ltrim($path, '/');
    }
    if (!file_exists($path)) {
        throw new Exception('Service account JSON no encontrado.');
    }
    $json = json_decode(file_get_contents($path), true);
    if (!$json || empty($json['private_key']) || empty($json['client_email'])) {
        throw new Exception('Service account JSON invalido.');
    }
    return $json;
}

function getFirebaseAccessToken() {
    $serviceAccount = getFirebaseServiceAccount();
    $now = time();
    $header = ['alg' => 'RS256', 'typ' => 'JWT'];
    $payload = [
        'iss' => $serviceAccount['client_email'],
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ];

    $base64Header = base64UrlEncode(json_encode($header));
    $base64Payload = base64UrlEncode(json_encode($payload));
    $signatureInput = $base64Header . '.' . $base64Payload;
    $signature = '';
    $privateKey = $serviceAccount['private_key'];
    $ok = openssl_sign($signatureInput, $signature, $privateKey, 'sha256');
    if (!$ok) {
        throw new Exception('No se pudo firmar JWT.');
    }
    $jwt = $signatureInput . '.' . base64UrlEncode($signature);

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ]));
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode < 200 || $httpCode >= 300) {
        throw new Exception('Error al obtener token OAuth: ' . $response);
    }

    $data = json_decode($response, true);
    if (empty($data['access_token'])) {
        throw new Exception('Token OAuth no encontrado.');
    }
    return $data['access_token'];
}

function sendFcmNotification($projectId, $tokens, $title, $body, $data = []) {
    if (!$projectId) {
        return ['ok' => false, 'error' => 'FIREBASE_PROJECT_ID faltante'];
    }
    $tokens = array_values(array_unique(array_filter($tokens)));
    if (!$tokens || count($tokens) === 0) {
        return ['ok' => false, 'error' => 'Sin tokens'];
    }

    $accessToken = getFirebaseAccessToken();
    $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";
    $icon = $data['icon'] ?? '/logo192.png';
    $targetUrl = $data['url'] ?? '/dashboard/pedidos';
    $sent = 0;
    $errors = [];

    foreach ($tokens as $token) {
        $payload = [
            'message' => [
                'token' => $token,
                'data' => array_merge($data, [
                    'title' => $title,
                    'body' => $body,
                    'url' => $targetUrl,
                    'icon' => $icon,
                ]),
                'webpush' => [
                    'fcm_options' => [
                        'link' => $targetUrl,
                    ],
                ],
            ],
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json; charset=utf-8',
            'Authorization: Bearer ' . $accessToken,
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            $sent += 1;
        } else {
            $errors[] = $response;
        }
    }

    return [
        'ok' => $sent > 0,
        'sent' => $sent,
        'errors' => $errors,
    ];
}
