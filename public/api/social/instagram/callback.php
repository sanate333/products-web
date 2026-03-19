<?php
// Instagram OAuth callback redirect to Supabase Edge Function
// This file receives the OAuth callback from Instagram/Facebook
// and forwards it to the Supabase social-api edge function

$supabase_fn = 'https://lvmeswlvszsmvgaasazs.supabase.co/functions/v1/social-api';

// Get all query parameters
$query = $_SERVER['QUERY_STRING'];

// If there's a code parameter, forward to Supabase
if (isset($_GET['code'])) {
    $code = $_GET['code'];
    
    // Call Supabase edge function to exchange code for token
    $data = json_encode([
        'code' => $code,
        'redirect_uri' => 'https://sanate.store/api/social/instagram/callback.php',
        'platform' => 'instagram',
        'store_id' => 'default'
    ]);
    
    $ch = curl_init($supabase_fn);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $result = json_decode($response, true);
    
    if ($result && isset($result['connected']) && $result['connected']) {
        $username = isset($result['username']) ? $result['username'] : $result['userId'];
        echo '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">';
        echo '<h2 style="color:#22c55e">Instagram conectado: @' . htmlspecialchars($username) . '</h2>';
        echo '<p>Token: ' . htmlspecialchars($result['tokenType'] ?? 'ok') . '</p>';
        echo '<script>setTimeout(function(){if(window.opener){window.opener.postMessage({type:"ig_connected",username:"' . htmlspecialchars($username) . '"},"*");window.opener.location.reload();}window.close();},2000);</script>';
        echo '</body></html>';
    } else {
        $error = isset($result['message']) ? $result['message'] : 'Error desconocido';
        echo '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">';
        echo '<h2 style="color:#ef4444">Error al conectar Instagram</h2>';
        echo '<p>' . htmlspecialchars($error) . '</p>';
        echo '<pre style="text-align:left;max-width:600px;margin:20px auto;background:#f3f4f6;padding:16px;border-radius:8px;overflow:auto">' . htmlspecialchars($response) . '</pre>';
        echo '<script>setTimeout(function(){window.close();},8000);</script>';
        echo '</body></html>';
    }
} elseif (isset($_GET['error'])) {
    $error = isset($_GET['error_reason']) ? $_GET['error_reason'] : $_GET['error'];
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">';
    echo '<h2 style="color:#ef4444">Error: ' . htmlspecialchars($error) . '</h2>';
    echo '<p>' . htmlspecialchars($_GET['error_description'] ?? 'No se pudo conectar Instagram.') . '</p>';
    echo '<script>setTimeout(function(){if(window.opener){window.opener.postMessage({type:"ig_error",error:"' . htmlspecialchars($error) . '"},"*");}window.close();},3000);</script>';
    echo '</body></html>';
} else {
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">';
    echo '<h2>Instagram OAuth Callback</h2>';
    echo '<p>Redirigiendo...</p>';
    echo '</body></html>';
}
