<?php
/**
 * NEXUS BRIDGE v2 - HOSTINGER COMPATIBLE
 * Este script actúa como proxy para la API de IGDB.
 */

// 1. Configuración de CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Client-ID, Authorization, X-Requested-With, Accept");
header("Content-Type: application/json");

// 2. Manejo de Preflight (Petición OPTIONS que hace el navegador antes del POST)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// 3. Obtener parámetros y cabeceras
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : 'games';
$url = "https://api.igdb.com/v4/" . $endpoint;

// PHP transforma guiones en guiones bajos y añade HTTP_
$clientId = isset($_SERVER['HTTP_CLIENT_ID']) ? $_SERVER['HTTP_CLIENT_ID'] : '';
$authorization = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';

// 4. Capturar el cuerpo de la petición (el query de IGDB)
$postData = file_get_contents('php://input');

// 5. Ejecutar cURL hacia IGDB
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Client-ID: $clientId",
    "Authorization: $authorization",
    "Content-Type: text/plain", // IGDB acepta esto como query string
    "Accept: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Manejo de errores de red
if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode([
        "error" => "cURL Error",
        "message" => curl_error($ch)
    ]);
} else {
    // Devolver la respuesta de IGDB tal cual
    http_response_code($httpCode);
    echo $response;
}

curl_close($ch);
?>