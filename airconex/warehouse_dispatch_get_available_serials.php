<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Helper function to create a consistent serial entry object
function createSerialEntry($item, $serialNumber, $componentType) {
    return [
        'id' => $item['id'],
        'serial' => $serialNumber,
        'brand' => $item['brand'] ?? '',
        'horsepower' => $item['horsepower'] ?? '',
        'model' => $componentType === 'Indoor' ? $item['indoor_model'] : $item['outdoor_model'],
        'po_number' => $item['po_number'] ?? '',
        'supplier' => $item['supplier'] ?? '',
        'component_type' => $componentType
    ];
}

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
    $model = $_GET['model'] ?? '';
    $unit_type = $_GET['unit_type'] ?? '';

    if (empty($model)) {
        throw new Exception("Model parameter is required");
    }

    error_log("=== SERIAL SEARCH DEBUG ===");
    error_log("Looking for Model: '$model'");
    error_log("Unit Type: '$unit_type'");

    // Get available serials from purchase_order_items where status = 'Released'
    $sql = "SELECT 
                poi.id,
                poi.received_serial,
                poi.brand,
                poi.horsepower,
                poi.indoor_model,
                poi.outdoor_model,
                poi.status as item_status,
                po.po_number,
                po.supplier
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.purchase_order_id = po.id
            WHERE poi.status = 'Released'
            AND poi.received_serial IS NOT NULL 
            AND poi.received_serial != ''
            AND (
                (poi.indoor_model = ? AND ? = 'Indoor Unit') OR
                (poi.outdoor_model = ? AND ? = 'Outdoor Unit')
            )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$model, $unit_type, $model, $unit_type]);
    $serials = $stmt->fetchAll();
    
    error_log("Found " . count($serials) . " matching records");

    $availableSerials = [];
    
    foreach ($serials as $serial) {
        $serialNumber = trim($serial['received_serial']);
        error_log("Processing: '$serialNumber'");
        
        // Parse the exact format: "RECEIVED - 2 units: aaa / 111; bbb / 222"
        if (preg_match('/RECEIVED\s*-\s*\d+\s*units?\s*:\s*(.+)/i', $serialNumber, $matches)) {
            $serialContent = trim($matches[1]);
            error_log("Extracted content: '$serialContent'");
            
            // Split by semicolon to get pairs
            $serialPairs = explode(';', $serialContent);
            error_log("Found " . count($serialPairs) . " pairs");
            
            foreach ($serialPairs as $pairIndex => $pair) {
                $pair = trim($pair);
                error_log("Processing pair $pairIndex: '$pair'");
                
                // Split by slash - remove extra spaces
                $parts = array_map('trim', explode('/', $pair));
                
                if (count($parts) == 2) {
                    $firstSerial = $parts[0];   // This is indoor (aaa)
                    $secondSerial = $parts[1];  // This is outdoor (111)
                    
                    error_log("Split - First: '$firstSerial', Second: '$secondSerial'");
                    
                    // Add based on requested unit type
                    if ($unit_type === 'Indoor Unit' && !empty($firstSerial)) {
                        $availableSerials[] = createSerialEntry($serial, $firstSerial, 'Indoor');
                        error_log("Added Indoor serial: '$firstSerial'");
                    } 
                    else if ($unit_type === 'Outdoor Unit' && !empty($secondSerial)) {
                        $availableSerials[] = createSerialEntry($serial, $secondSerial, 'Outdoor');
                        error_log("Added Outdoor serial: '$secondSerial'");
                    }
                } else {
                    error_log("WARNING: Could not split pair properly: '$pair' - got " . count($parts) . " parts");
                    error_log("Parts: " . json_encode($parts));
                }
            }
        } else {
            error_log("WARNING: Pattern did not match: '$serialNumber'");
            
            // Try simple format as fallback
            if (strpos($serialNumber, '/') !== false) {
                $parts = array_map('trim', explode('/', $serialNumber));
                if (count($parts) == 2) {
                    if ($unit_type === 'Indoor Unit' && !empty($parts[0])) {
                        $availableSerials[] = createSerialEntry($serial, $parts[0], 'Indoor');
                        error_log("Added fallback Indoor serial: '{$parts[0]}'");
                    } else if ($unit_type === 'Outdoor Unit' && !empty($parts[1])) {
                        $availableSerials[] = createSerialEntry($serial, $parts[1], 'Outdoor');
                        error_log("Added fallback Outdoor serial: '{$parts[1]}'");
                    }
                }
            }
        }
    }

    error_log("Final result: " . count($availableSerials) . " available serials");
    
    echo json_encode([
        'success' => true,
        'data' => $availableSerials,
        'total' => count($availableSerials),
        'model' => $model,
        'unit_type' => $unit_type,
        'debug' => [
            'total_records_found' => count($serials),
            'processed_serials' => count($availableSerials),
            'search_model' => $model,
            'search_unit_type' => $unit_type
        ]
    ]);

} catch (Exception $e) {
    error_log("SERIAL API ERROR: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'model' => $model ?? 'undefined',
            'unit_type' => $unit_type ?? 'undefined',
            'error' => $e->getMessage()
        ]
    ]);
}
?>