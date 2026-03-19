<?php
$apiKey = "xxx";

$stopId = $_GET['ids']; 
$cacheFile = "cache/data_stanice_" . $stopId . ".json";

$spravnyFormatProGolemio = str_replace(",", "&ids=", $stopId);

$url = "https://api.golemio.cz/v2/pid/departureboards?ids=" . $spravnyFormatProGolemio . "&limit=10";

if(file_exists($cacheFile)){
    if(time() - filemtime($cacheFile) < 10){
        readfile($cacheFile);
        exit;
    }
}

$opts = [
    "http" => [
        "method" => "GET",
        "header" => "X-Access-Token: " . $apiKey . "\r\n" ,
        "timeout" => 5
    ]
];

$context = stream_context_create($opts);
$data = @file_get_contents($url, false, $context);

if ($data !== false) {
    file_put_contents($cacheFile, $data);
    echo $data;
} else {
    if (file_exists($cacheFile)) {
        readfile($cacheFile);
    } else {
        echo json_encode(["error" => "Nelze načíst data z Golemia"]);
    }
}
?>