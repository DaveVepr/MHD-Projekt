<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$apiKey = "xxx";

// Kontrola
if (!isset($_GET['id'])) {
    echo json_encode(["error" => "Chybi ID vlaku"]);
    exit;
}

$tripId = $_GET['id'];
$url = "https://api.golemio.cz/v2/gtfs/trips/" . urlencode($tripId) . "?includeStops=true&includeStopTimes=true";

$opts = [
    "http" => [
        "method" => "GET",
        "header" => "X-Access-Token: " . $apiKey . "\r\n",
        "timeout" => 5
    ]
];

$context = stream_context_create($opts);
$data = @file_get_contents($url, false, $context);

if ($data !== false && strlen($data) > 20) {
    echo $data;
} else {
    echo json_encode(["error" => "Golemio momentalne neodpovida."]);
}
?>