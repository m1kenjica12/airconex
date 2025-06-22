<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

try {
    $host = 'localhost';
    $username = 'root';
    $password = '';
    $database = 'alpha0.2_airconex';

    $mysqli = new mysqli($host, $username, $password, $database);
    if ($mysqli->connect_error) {
        throw new Exception("Connection failed");
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $so_number = $input['so_number'];

    error_log("SCHEDULE UPDATE: Processing SO Number: " . $so_number);

 
    $updateSOStatusQuery = "UPDATE sales_orders SET status = 'In Transit' WHERE so_number = ?";
    $stmt = $mysqli->prepare($updateSOStatusQuery);
    $stmt->bind_param("s", $so_number);
    if ($stmt->execute()) {
        error_log("UPDATED SO STATUS: {$so_number} set to 'In Transit'");
    } else {
        error_log("FAILED TO UPDATE SO STATUS: {$so_number}");
    }
    $stmt->close();

    
    $sql = "SELECT 
                sou.brand,
                sou.horsepower,
                sou.unit_type,
                sou.indoor_model,
                sou.outdoor_model,
                sou.quantity
            FROM sales_orders_units sou
            JOIN sales_orders so ON sou.sales_order_id = so.id
            WHERE so.so_number = ? 
            AND sou.assigned_serial IS NOT NULL 
            AND sou.assigned_serial != ''";

    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param("s", $so_number);
    $stmt->execute();
    $units = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    error_log("SCHEDULE UPDATE: Found " . count($units) . " units with assigned serials");

    $updated = 0;

    foreach ($units as $unit) {
        error_log("SCHEDULE UPDATE: Processing unit - Brand: {$unit['brand']}, HP: {$unit['horsepower']}, Type: {$unit['unit_type']}, Indoor: {$unit['indoor_model']}, Outdoor: {$unit['outdoor_model']}");

        
        if (!empty($unit['indoor_model'])) {
            
            $findIndoorSql = "SELECT id, allocated, `for schedule` FROM products 
                            WHERE brand = ? 
                            AND horsepower = ? 
                            AND unit_type = ?
                            AND indoor_model = ?
                            LIMIT 1";
            
            $findStmt = $mysqli->prepare($findIndoorSql);
            $findStmt->bind_param("ssss", $unit['brand'], $unit['horsepower'], $unit['unit_type'], $unit['indoor_model']);
            $findStmt->execute();
            $indoorProduct = $findStmt->get_result()->fetch_assoc();

            if ($indoorProduct) {
                $currentAllocated = intval($indoorProduct['allocated']);
                $currentForSchedule = intval($indoorProduct['for schedule']);
                $quantity = intval($unit['quantity']);
                
                $transferAmount = min($quantity, $currentAllocated); 
                $newAllocated = $currentAllocated - $transferAmount;
                $newForSchedule = $currentForSchedule + $transferAmount;
                
                $updateSql = "UPDATE products SET allocated = ?, `for schedule` = ? WHERE id = ?";
                $updateStmt = $mysqli->prepare($updateSql);
                $updateStmt->bind_param("iii", $newAllocated, $newForSchedule, $indoorProduct['id']);
                
                if ($updateStmt->execute()) {
                    $updated++;
                    error_log("FIXED INDOOR UNIT: Product ID {$indoorProduct['id']}, {$unit['brand']} {$unit['horsepower']} {$unit['indoor_model']}: allocated {$currentAllocated} → {$newAllocated}, for_schedule {$currentForSchedule} → {$newForSchedule} (transferred: {$transferAmount})");
                }
                $updateStmt->close();
            } else {
                error_log("INDOOR UNIT NOT FOUND: {$unit['brand']} {$unit['horsepower']} {$unit['indoor_model']}");
            }
            $findStmt->close();
        }

        if (!empty($unit['outdoor_model'])) {
            $findOutdoorSql = "SELECT id, allocated, `for schedule` FROM products 
                             WHERE brand = ? 
                             AND horsepower = ? 
                             AND unit_type = ?
                             AND outdoor_model = ?
                             LIMIT 1";
            
            $findStmt = $mysqli->prepare($findOutdoorSql);
            $findStmt->bind_param("ssss", $unit['brand'], $unit['horsepower'], $unit['unit_type'], $unit['outdoor_model']);
            $findStmt->execute();
            $outdoorProduct = $findStmt->get_result()->fetch_assoc();

            if ($outdoorProduct) {
                $currentAllocated = intval($outdoorProduct['allocated']);
                $currentForSchedule = intval($outdoorProduct['for schedule']);
                $quantity = intval($unit['quantity']);
                
                $transferAmount = min($quantity, $currentAllocated); 
                $newAllocated = $currentAllocated - $transferAmount;
                $newForSchedule = $currentForSchedule + $transferAmount;
                
                $updateSql = "UPDATE products SET allocated = ?, `for schedule` = ? WHERE id = ?";
                $updateStmt = $mysqli->prepare($updateSql);
                $updateStmt->bind_param("iii", $newAllocated, $newForSchedule, $outdoorProduct['id']);
                
                if ($updateStmt->execute()) {
                    $updated++;
                    error_log("FIXED OUTDOOR UNIT: Product ID {$outdoorProduct['id']}, {$unit['brand']} {$unit['horsepower']} {$unit['outdoor_model']}: allocated {$currentAllocated} → {$newAllocated}, for_schedule {$currentForSchedule} → {$newForSchedule} (transferred: {$transferAmount})");
                }
                $updateStmt->close();
            } else {
                error_log("OUTDOOR UNIT NOT FOUND: {$unit['brand']} {$unit['horsepower']} {$unit['outdoor_model']}");
            }
            $findStmt->close();
        }
    }

    echo json_encode([
        'success' => true, 
        'message' => "SO {$so_number} set to 'In Transit'. Transferred {$updated} specific products: allocated → for schedule",
        'updated_count' => $updated,
        'so_number' => $so_number,
        'status' => 'In Transit'
    ]);

} catch (Exception $e) {
    error_log("SCHEDULE UPDATE ERROR: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>