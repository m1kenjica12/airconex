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

    // Get parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(1000, intval($_GET['limit']))) : 50;
    $search = $_GET['search'] ?? '';
    $sort = $_GET['sort'] ?? 'created_at';
    $order = $_GET['order'] ?? 'DESC';

    // Validate sort column
    $allowedSorts = ['created_at', 'so_number', 'client_name', 'book_date'];
    if (!in_array($sort, $allowedSorts)) {
        $sort = 'created_at';
    }

    // Validate order
    $order = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';
    $offset = ($page - 1) * $limit;

    // Build WHERE clause for search
    $whereClause = "WHERE 1=1";
    $params = [];

    if (!empty($search)) {
        $whereClause .= " AND (
            so.so_number LIKE :search OR 
            so.client_name LIKE :search OR 
            so.address LIKE :search OR
            so.city_province LIKE :search
        )";
        $params[':search'] = "%$search%";
    }

    // Get total count for pagination
    $countSql = "SELECT COUNT(*) as total FROM sales_orders so $whereClause";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalRecords = $countStmt->fetch()['total'];

    // Get sales orders data with units
    $sql = "SELECT 
                so.id,
                so.so_number,
                so.client_name,
                so.address,
                so.city_province,
                so.contact_number,
                so.book_date,
                so.installation_date,
                so.status as so_status,
                so.created_at
            FROM sales_orders so
            $whereClause
            ORDER BY so.$sort $order 
            LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);
    
    // Bind search parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    
    // Bind pagination parameters
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    
    $stmt->execute();
    $orders = $stmt->fetchAll();

    // Process each order to create dispatch records
    $dispatchRecords = [];
    $recordId = 1;
    
    foreach ($orders as $order) {
        // Get detailed units for this order including assigned_serial
        $unitsSql = "SELECT 
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
        
        $unitsStmt = $pdo->prepare($unitsSql);
        $unitsStmt->execute([$order['id']]);
        $units = $unitsStmt->fetchAll();

        // Create dispatch records for each unit (considering quantity)
        foreach ($units as $unit) {
            // Parse assigned_serial (format: "indoor_serial / outdoor_serial")
            $indoor_assigned_serial = '';
            $outdoor_assigned_serial = '';
            
            if (!empty($unit['assigned_serial']) && strpos($unit['assigned_serial'], ' / ') !== false) {
                $serial_parts = explode(' / ', $unit['assigned_serial']);
                if (count($serial_parts) == 2) {
                    $indoor_assigned_serial = trim($serial_parts[0]);
                    $outdoor_assigned_serial = trim($serial_parts[1]);
                }
            }

            for ($i = 1; $i <= $unit['quantity']; $i++) {
                // Create record for INDOOR unit if indoor_model exists
                if (!empty($unit['indoor_model'])) {
                    $indoorSerialAssigned = !empty($indoor_assigned_serial);
                    
                    // GET PO STATUS FOR INDOOR MODEL
                    $poStatusSql = "SELECT po.status 
                                   FROM purchase_orders po
                                   JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
                                   WHERE poi.indoor_model = ?
                                   ORDER BY po.created_at DESC
                                   LIMIT 1";
                    $poStatusStmt = $pdo->prepare($poStatusSql);
                    $poStatusStmt->execute([$unit['indoor_model']]);
                    $poStatusResult = $poStatusStmt->fetch();
                    $poStatus = $poStatusResult ? $poStatusResult['status'] : 'No PO';
                    
                    $dispatchRecords[] = [
                        'id' => $recordId++,
                        'date' => $order['book_date'] ?: $order['created_at'],
                        'so_number' => $order['so_number'],
                        'client' => $order['client_name'],
                        'unit_description' => $unit['unit_description'],
                        'model' => $unit['indoor_model'],
                        'unit_type' => 'Indoor Unit',
                        'assigned_serial' => $indoor_assigned_serial,
                        'serial_assignment' => $indoorSerialAssigned ? 'Assigned' : 'Not Assigned',
                        'status' => $poStatus, // DIRECT PO STATUS
                        'dispatch' => 'Not Ready',
                        'order_status' => $order['so_status'],
                        'address' => $order['address'],
                        'city_province' => $order['city_province'],
                        'contact_number' => $order['contact_number'],
                        'installation_date' => $order['installation_date'],
                        'unit_details' => [
                            'brand' => $unit['brand'],
                            'unit_type' => $unit['unit_type'],
                            'horsepower' => $unit['horsepower'],
                            'indoor_model' => $unit['indoor_model'],
                            'outdoor_model' => $unit['outdoor_model'],
                            'component_type' => 'Indoor'
                        ]
                    ];
                }

                // Create record for OUTDOOR unit if outdoor_model exists
                if (!empty($unit['outdoor_model'])) {
                    $outdoorSerialAssigned = !empty($outdoor_assigned_serial);
                    
                    // GET PO STATUS FOR OUTDOOR MODEL
                    $poStatusSql = "SELECT po.status 
                                   FROM purchase_orders po
                                   JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
                                   WHERE poi.outdoor_model = ?
                                   ORDER BY po.created_at DESC
                                   LIMIT 1";
                    $poStatusStmt = $pdo->prepare($poStatusSql);
                    $poStatusStmt->execute([$unit['outdoor_model']]);
                    $poStatusResult = $poStatusStmt->fetch();
                    $poStatus = $poStatusResult ? $poStatusResult['status'] : 'No PO';
                    
                    $dispatchRecords[] = [
                        'id' => $recordId++,
                        'date' => $order['book_date'] ?: $order['created_at'],
                        'so_number' => $order['so_number'],
                        'client' => $order['client_name'],
                        'unit_description' => $unit['unit_description'],
                        'model' => $unit['outdoor_model'],
                        'unit_type' => 'Outdoor Unit',
                        'assigned_serial' => $outdoor_assigned_serial,
                        'serial_assignment' => $outdoorSerialAssigned ? 'Assigned' : 'Not Assigned',
                        'status' => $poStatus, // DIRECT PO STATUS
                        'dispatch' => 'Not Ready',
                        'order_status' => $order['so_status'],
                        'address' => $order['address'],
                        'city_province' => $order['city_province'],
                        'contact_number' => $order['contact_number'],
                        'installation_date' => $order['installation_date'],
                        'unit_details' => [
                            'brand' => $unit['brand'],
                            'unit_type' => $unit['unit_type'],
                            'horsepower' => $unit['horsepower'],
                            'indoor_model' => $unit['indoor_model'],
                            'outdoor_model' => $unit['outdoor_model'],
                            'component_type' => 'Outdoor'
                        ]
                    ];
                }
            }
        }
    }

    // Calculate pagination info
    $totalPages = ceil($totalRecords / $limit);
    $hasNext = $page < $totalPages;
    $hasPrev = $page > 1;

    // Log for debugging
    error_log("DISPATCH API: Found $totalRecords sales orders, created " . count($dispatchRecords) . " dispatch records with PO status");

    // Format the response
    $response = [
        'success' => true,
        'data' => $dispatchRecords,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $limit,
            'total_records' => count($dispatchRecords),
            'total_orders' => $totalRecords,
            'total_pages' => $totalPages,
            'has_next' => $hasNext,
            'has_prev' => $hasPrev
        ],
        'search' => $search,
        'sort' => $sort,
        'order' => $order,
        'debug_info' => [
            'total_orders' => $totalRecords,
            'total_dispatch_records' => count($dispatchRecords),
            'sample_record' => count($dispatchRecords) > 0 ? $dispatchRecords[0] : null
        ]
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log("DISPATCH API ERROR: " . $e->getMessage());
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