<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    $host = 'localhost';
    $username = 'root';
    $password = '';
    $database = 'alpha0.2_airconex';

    $mysqli = new mysqli($host, $username, $password, $database);

    if ($mysqli->connect_error) {
        throw new Exception("Database connection failed: " . $mysqli->connect_error);
    }

    $mysqli->set_charset("utf8mb4");

    $query = "SELECT 
                po.id as po_id,
                po.po_number,
                po.supplier,
                po.po_date,
                poi.id as item_id,
                poi.brand,
                poi.horsepower,
                poi.unit_type,
                poi.unit_description,
                poi.indoor_model,
                poi.outdoor_model,
                poi.quantity,
                poi.received_serial
              FROM purchase_orders po
              LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
              WHERE poi.id IS NOT NULL
              ORDER BY po.po_date DESC, po.po_number DESC, poi.id ASC";

    $result = $mysqli->query($query);

    if (!$result) {
        throw new Exception("Query failed: " . $mysqli->error);
    }

    $purchaseOrders = [];
    
    while ($row = $result->fetch_assoc()) {
        $poNumber = $row['po_number'];
        
        if (!isset($purchaseOrders[$poNumber])) {
            $purchaseOrders[$poNumber] = [
                'po_id' => $row['po_id'],
                'po_number' => $row['po_number'],
                'supplier' => $row['supplier'],
                'po_date' => $row['po_date'],
                'items' => []
            ];
        }
        
        $quantity = intval($row['quantity']);
        for ($i = 1; $i <= $quantity; $i++) {
            $purchaseOrders[$poNumber]['items'][] = [
                'item_id' => $row['item_id'],
                'unit_number' => $i,
                'total_quantity' => $quantity,
                'brand' => $row['brand'],
                'horsepower' => $row['horsepower'],
                'unit_type' => $row['unit_type'],
                'unit_description' => $row['unit_description'],
                'indoor_model' => $row['indoor_model'],
                'outdoor_model' => $row['outdoor_model'],
                'received_serial' => $row['received_serial']
            ];
        }
    }

    $poList = array_values($purchaseOrders);

    error_log("Purchase Orders API Response: " . json_encode($poList));

    echo json_encode([
        'success' => true,
        'data' => $poList,
        'count' => count($poList),
        'debug' => [
            'total_rows' => $result->num_rows,
            'query' => $query
        ]
    ]);

    $mysqli->close();

} catch (Exception $e) {
    error_log("Purchase Orders API Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'data' => [],
        'debug' => [
            'error_details' => $e->getTraceAsString()
        ]
    ]);
}
?>