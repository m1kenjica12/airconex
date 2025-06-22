<?php


header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Database configuration
    $host = 'localhost';
    $username = 'root';
    $password = '';
    $database = 'alpha0.2_airconex';

    $mysqli = new mysqli($host, $username, $password, $database);

    if ($mysqli->connect_error) {
        throw new Exception("Database connection failed: " . $mysqli->connect_error);
    }

    $mysqli->set_charset("utf8mb4");

    // Get sample data to see what's actually in the database
    $query = "SELECT 
                po.po_number,
                poi.indoor_model,
                poi.outdoor_model,
                poi.received_serial,
                poi.unit_description,
                poi.brand,
                poi.horsepower
              FROM purchase_order_items poi
              JOIN purchase_orders po ON poi.purchase_order_id = po.id
              WHERE poi.received_serial IS NOT NULL 
              AND poi.received_serial != ''
              AND poi.received_serial LIKE 'RECEIVED%'
              ORDER BY po.po_number DESC
              LIMIT 10";

    $result = $mysqli->query($query);
    $sampleData = [];
    
    while ($row = $result->fetch_assoc()) {
        $sampleData[] = $row;
    }

    $mysqli->close();

    echo json_encode([
        'success' => true,
        'message' => 'Sample received serials data',
        'count' => count($sampleData),
        'data' => $sampleData,
        'format_expected' => 'RECEIVED - X units: indoor1 / outdoor1; indoor2 / outdoor2; ...'
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>