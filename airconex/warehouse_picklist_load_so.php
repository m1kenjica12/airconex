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

    // Get installation date parameter
    $installationDate = $_GET['installation_date'] ?? '';
    
    if (empty($installationDate)) {
        throw new Exception('Installation date is required');
    }

    // Get pick list data for the specified installation date
    $sql = "SELECT 
                so.id as so_id,
                so.so_number,
                so.client_name,
                so.address,
                so.city_province,
                so.installation_date,
                sou.id as sou_id,
                sou.quantity,
                sou.assigned_serial,
                p.id as product_id,
                p.brand,
                p.model,
                p.unit_description,
                p.horsepower,
                p.unit_type,
                p.has_outdoor_unit,
                p.indoor_model,
                p.outdoor_model,
                p.series
            FROM sales_orders so
            JOIN sales_orders_units sou ON so.id = sou.sales_order_id
            JOIN products p ON (
                sou.indoor_model = p.indoor_model AND 
                sou.outdoor_model = p.outdoor_model AND
                sou.brand = p.brand
            )
            WHERE DATE(so.installation_date) = ?
            ORDER BY so.so_number, sou.id, p.id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$installationDate]);
    $results = $stmt->fetchAll();

    // Process results to create pick list items
    $pickListItems = [];
    $itemId = 1;

    foreach ($results as $row) {
        // Parse assigned_serial if exists (format: "indoor_serial / outdoor_serial")
        $indoor_serial = '';
        $outdoor_serial = '';
        
        if (!empty($row['assigned_serial']) && strpos($row['assigned_serial'], ' / ') !== false) {
            $serial_parts = explode(' / ', $row['assigned_serial']);
            if (count($serial_parts) == 2) {
                $indoor_serial = trim($serial_parts[0]);
                $outdoor_serial = trim($serial_parts[1]);
            }
        }

        // Create item for indoor unit if exists
        if (!empty($row['indoor_model'])) {
            for ($i = 1; $i <= $row['quantity']; $i++) {
                $pickListItems[] = [
                    'id' => $itemId++,
                    'so_id' => $row['so_id'],
                    'so_number' => $row['so_number'],
                    'client_name' => $row['client_name'],
                    'location' => $row['address'] . ', ' . $row['city_province'],
                    'product_id' => $row['product_id'],
                    'brand' => $row['brand'],
                    'model' => $row['indoor_model'],
                    'unit_description' => $row['unit_description'],
                    'unit_type' => 'Indoor Unit',
                    'horsepower' => $row['horsepower'],
                    'series' => $row['series'],
                    'assigned_serial' => $indoor_serial,
                    'quantity' => 1,
                    'picked' => false,
                    'installation_date' => $row['installation_date'],
                    'has_outdoor_unit' => $row['has_outdoor_unit']
                ];
            }
        }

        // Create item for outdoor unit if exists
        if (!empty($row['outdoor_model'])) {
            for ($i = 1; $i <= $row['quantity']; $i++) {
                $pickListItems[] = [
                    'id' => $itemId++,
                    'so_id' => $row['so_id'],
                    'so_number' => $row['so_number'],
                    'client_name' => $row['client_name'],
                    'location' => $row['address'] . ', ' . $row['city_province'],
                    'product_id' => $row['product_id'],
                    'brand' => $row['brand'],
                    'model' => $row['outdoor_model'],
                    'unit_description' => $row['unit_description'],
                    'unit_type' => 'Outdoor Unit',
                    'horsepower' => $row['horsepower'],
                    'series' => $row['series'],
                    'assigned_serial' => $outdoor_serial,
                    'quantity' => 1,
                    'picked' => false,
                    'installation_date' => $row['installation_date'],
                    'has_outdoor_unit' => $row['has_outdoor_unit']
                ];
            }
        }
    }

    // Format the response
    $response = [
        'success' => true,
        'data' => $pickListItems,
        'installation_date' => $installationDate,
        'summary' => [
            'total_items' => count($pickListItems),
            'total_orders' => count(array_unique(array_column($pickListItems, 'so_number'))),
            'items_with_serial' => count(array_filter($pickListItems, function($item) {
                return !empty($item['assigned_serial']);
            })),
            'items_without_serial' => count(array_filter($pickListItems, function($item) {
                return empty($item['assigned_serial']);
            }))
        ]
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log("PICK LIST API ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}
?>