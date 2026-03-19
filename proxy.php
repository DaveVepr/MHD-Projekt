<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$apiKey = "xxx";

if (!isset($_GET['linka'])) {
    echo json_encode(["error" => "Chybi parametr linka (např. ?linka=A)"]);
    exit;
}

$Linka = $_GET['linka'];
$cacheFile = "cache/data_" . $Linka . ".json";
$url = "https://api.golemio.cz/v2/vehiclepositions?routeShortName=$Linka&limit=100";

// Pokud je cache živá (mladší 10 sekund)
if(file_exists($cacheFile)){
    if(time() - filemtime($cacheFile) < 10 && filesize($cacheFile) > 10){
        readfile($cacheFile);
        exit;
    }
}

$opts = [
    "http" => [
        "method" => "GET",
        "header" => "X-Access-Token: " . $apiKey . "\r\n",
        "timeout" => 5
    ]
];

$context = stream_context_create($opts);
$data = @file_get_contents($url, false, $context);

// Pokud se stahování povedlo a přišla nějaká reálná data
if ($data !== false && strlen($data) > 20) {
    file_put_contents($cacheFile, $data);
    echo $data;
} else {
    // Kdyby Golemio spadlo (timeout)
    if (file_exists($cacheFile) && filesize($cacheFile) > 10) {
        readfile($cacheFile);
    } else {
        echo json_encode(["error" => "Golemio momentalne neodpovida a cache je prazdna."]);
    }
}
?>