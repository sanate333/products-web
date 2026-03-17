<?php
header('X-LiteSpeed-Purge: *');
header('Content-Type: application/json');
echo json_encode([
  'status' => 'purged',
  'time' => date('Y-m-d H:i:s'),
  'message' => 'LiteSpeed cache purge header sent'
]);
