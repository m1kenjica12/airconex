<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
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

    $soNumber = $_GET['so_number'] ?? '';
    
    if (empty($soNumber)) {
        throw new Exception('SO number is required');
    }

    $sql = "SELECT 
                so.id as so_id,
                so.so_number,
                so.store,
                so.store_code,
                so.account,
                so.status,
                so.book_date,
                so.installation_date,
                so.month,
                so.client_type,
                so.client_name,
                so.address,
                so.city_province,
                so.contact_number,
                so.application_type,
                so.scope_of_work,
                so.mode_of_payment,
                so.scheme,
                so.remarks,
                so.created_at
            FROM sales_orders so
            WHERE so.so_number = ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$soNumber]);
    $salesOrder = $stmt->fetch();

    if (!$salesOrder) {
        throw new Exception('Sales order not found');
    }

    $itemsSql = "SELECT 
                    sou.id as sou_id,
                    sou.brand,
                    sou.unit_description,
                    sou.unit_type,
                    sou.indoor_model,
                    sou.outdoor_model,
                    sou.horsepower,
                    sou.quantity,
                    sou.assigned_serial
                 FROM sales_orders_units sou
                 WHERE sou.sales_order_id = ?
                 ORDER BY sou.id";

    $itemsStmt = $pdo->prepare($itemsSql);
    $itemsStmt->execute([$salesOrder['so_id']]);
    $items = $itemsStmt->fetchAll();

    $year = date('y');
    $randomNum = str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT);
    $drNumber = "DR#{$year}-T-{$randomNum}";

    $formattedDate = date('F j, Y');
    if (!empty($salesOrder['book_date'])) {
        $bookDate = new DateTime($salesOrder['book_date']);
        $formattedDate = $bookDate->format('F j, Y');
    }

    $receiptData = [
        'so_number' => $salesOrder['so_number'],
        'store' => $salesOrder['store'],
        'store_code' => $salesOrder['store_code'],
        'account' => $salesOrder['account'],
        'status' => $salesOrder['status'],
        'book_date' => $salesOrder['book_date'],
        'installation_date' => $salesOrder['installation_date'],
        'month' => $salesOrder['month'],
        'client_type' => $salesOrder['client_type'],
        'client_name' => $salesOrder['client_name'],
        'address' => $salesOrder['address'],
        'city_province' => $salesOrder['city_province'],
        'contact_number' => $salesOrder['contact_number'],
        'application_type' => $salesOrder['application_type'],
        'scope_of_work' => $salesOrder['scope_of_work'] ?: 'Supply',
        'mode_of_payment' => $salesOrder['mode_of_payment'],
        'scheme' => $salesOrder['scheme'],
        'remarks' => $salesOrder['remarks'],
        'created_at' => $salesOrder['created_at'],
        'dr_number' => $drNumber,
        'date' => $formattedDate,
        'items' => []
    ];

    foreach ($items as $item) {
        $indoor_serial = '';
        $outdoor_serial = '';
        
        if (!empty($item['assigned_serial']) && strpos($item['assigned_serial'], ' / ') !== false) {
            $serial_parts = explode(' / ', $item['assigned_serial']);
            if (count($serial_parts) == 2) {
                $indoor_serial = trim($serial_parts[0]);
                $outdoor_serial = trim($serial_parts[1]);
            }
        }

        $horsepower = $item['horsepower'] ? $item['horsepower'] . '' : '';
        $brand = $item['brand'] ?: '';
        $unitType = $item['unit_type'] ?: '';
        $year = date('Y');

        if (!empty($item['indoor_model'])) {
            $indoorDescription = "{$horsepower} {$brand} {$unitType} - {$year} {$item['indoor_model']} Indoor Unit";
            
            $receiptData['items'][] = [
                'description' => $indoorDescription,
                'assigned_serial' => $indoor_serial ?: 'Not Assigned',
                'quantity' => $item['quantity'],
                'unit_description' => $item['unit_description']
            ];
        }

        if (!empty($item['outdoor_model'])) {
            $outdoorDescription = "{$horsepower} {$brand} {$unitType} - {$year} {$item['outdoor_model']} Outdoor Unit";
            
            $receiptData['items'][] = [
                'description' => $outdoorDescription,
                'assigned_serial' => $outdoor_serial ?: 'Not Assigned',
                'quantity' => $item['quantity'],
                'unit_description' => $item['unit_description']
            ];
        }

        if (empty($item['indoor_model']) && empty($item['outdoor_model']) && !empty($item['unit_description'])) {
            $fullDescription = "{$horsepower} {$brand} {$unitType} {$item['unit_description']}";
            
            $receiptData['items'][] = [
                'description' => $fullDescription,
                'assigned_serial' => $item['assigned_serial'] ?: 'Not Assigned',
                'quantity' => $item['quantity'],
                'unit_description' => $item['unit_description']
            ];
        }
    }

    if (empty($receiptData['items'])) {
        $receiptData['items'][] = [
            'description' => 'Air Conditioning Unit',
            'serial_number' => 'Not Assigned',
            'quantity' => 1,
            'unit_description' => 'Standard Unit'
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $receiptData
    ]);

} catch (Exception $e) {
    error_log("DELIVERY RECEIPT API ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ]);
}
?>