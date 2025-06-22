<?php


header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Error handling
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    // Database configuration
    $config = [
        'host' => 'localhost',
        'username' => 'root',
        'password' => '',
        'database' => 'alpha0.2_airconex',
        'charset' => 'utf8mb4'
    ];

    $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset={$config['charset']}";
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);

    // Get all purchase order items with PO grouping information - Fixed ambiguous columns
    $sql = "SELECT 
                poi.id as item_id,
                po.id as po_id,
                po.po_number,
                po.supplier,
                po.po_date,
                po.remarks,
                po.created_at as po_created_at,
                po.status as po_status,
                po.dr_number,
                po.dr_date,
                poi.brand,
                poi.unit_description,
                poi.unit_type,
                poi.indoor_model,
                poi.outdoor_model,
                poi.horsepower,
                poi.quantity,
                poi.unit_price,
                poi.total_unit_price,
                poi.received_serial,
                poi.status as item_status,
                poi.created_at as item_created_at,
                -- Get the first item ID for this PO (for release button display)
                (SELECT MIN(poi2.id) 
                 FROM purchase_order_items poi2 
                 WHERE poi2.purchase_order_id = po.id
                ) as first_item_in_po,
                -- Calculate PO-level release status
                (SELECT 
                    CASE 
                        WHEN COUNT(CASE WHEN poi3.status != 'Released' THEN 1 END) = 0 THEN 'Released'
                        ELSE 'Unreleased'
                    END
                 FROM purchase_order_items poi3 
                 WHERE poi3.purchase_order_id = po.id
                ) as po_release_status,
                -- Count total items in this PO
                (SELECT COUNT(*) 
                 FROM purchase_order_items poi4 
                 WHERE poi4.purchase_order_id = po.id
                ) as total_items_in_po
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.purchase_order_id = po.id
            ORDER BY po.created_at DESC, poi.id ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $items = $stmt->fetchAll();

    // Process the data to match the expected format for the frontend
    $processedData = [];
    foreach ($items as $item) {
        // Combine indoor and outdoor models
        $combinedModel = '';
        if (!empty($item['indoor_model']) && !empty($item['outdoor_model'])) {
            $combinedModel = $item['indoor_model'] . ' / ' . $item['outdoor_model'];
        } elseif (!empty($item['indoor_model'])) {
            $combinedModel = $item['indoor_model'];
        } elseif (!empty($item['outdoor_model'])) {
            $combinedModel = $item['outdoor_model'];
        }

        $processedData[] = [
            'id' => $item['item_id'],
            'po_id' => $item['po_id'],
            'po_number' => $item['po_number'] ?? '',
            'po_date' => $item['po_date'] ?? '',
            'received_date' => $item['dr_date'] ?? '',
            'dr_number' => $item['dr_number'] ?? '',
            'supplier_name' => $item['supplier'] ?? '',
            'brand' => $item['brand'] ?? '',
            'horsepower' => $item['horsepower'] ?? '',
            'series' => $item['unit_description'] ?? '',
            'type' => $item['unit_type'] ?? '',
            'model' => $combinedModel,
            'serial' => $item['received_serial'] ?? '',
            'condition' => 'Brand New',
            'model_serials' => $combinedModel . ' - ' . ($item['received_serial'] ?? 'Not Assigned'),
            'unit_price' => floatval($item['unit_price'] ?? 0),
            'total_unit_price' => floatval($item['total_unit_price'] ?? 0),
            'status' => $item['po_status'] ?? 'Pending', // Keep using PO status, not item status
            'item_status' => $item['item_status'] ?? 'Unreleased',
            'po_release_status' => $item['po_release_status'],
            'total_items_in_po' => intval($item['total_items_in_po']),
            // Only show release button on the FIRST item of each Purchase Order
            'show_release_button' => ($item['item_id'] == $item['first_item_in_po']),
            'remarks' => $item['remarks'] ?? '',
            'quantity' => intval($item['quantity'] ?? 0),
            'created_at' => $item['item_created_at'] ?? '',
            'updated_at' => $item['item_created_at'] ?? ''
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $processedData,
        'total' => count($processedData),
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (PDOException $e) {
    error_log("DATABASE ERROR: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    error_log("GENERAL ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while loading purchase orders',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>