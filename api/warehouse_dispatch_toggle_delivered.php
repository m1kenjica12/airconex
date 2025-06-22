<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

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
    $is_delivered = $input['is_delivered'];

    error_log("DELIVERY TOGGLE: SO {$so_number}, Setting delivered: " . ($is_delivered ? 'true' : 'false'));

    
    $checkStatusQuery = "SELECT status FROM sales_orders WHERE so_number = ?";
    $stmt = $mysqli->prepare($checkStatusQuery);
    $stmt->bind_param("s", $so_number);
    $stmt->execute();
    $result = $stmt->get_result();
    $currentOrder = $result->fetch_assoc();
    $stmt->close();

    if (!$currentOrder) {
        throw new Exception("Sales order not found");
    }

    $currentStatus = $currentOrder['status'];

    if ($is_delivered) {
        if ($currentStatus !== 'In Transit') {
            throw new Exception("Cannot mark as delivered. Order must be 'In Transit' first. Current status: {$currentStatus}");
        }

        $newStatus = 'Delivered';
        
        $updateSOQuery = "UPDATE sales_orders SET status = ? WHERE so_number = ?";
        $stmt = $mysqli->prepare($updateSOQuery);
        $stmt->bind_param("ss", $newStatus, $so_number);
        $stmt->execute();
        $stmt->close();

        $getUnitsQuery = "SELECT 
                            sou.brand,
                            sou.horsepower,
                            sou.unit_type,
                            sou.indoor_model,
                            sou.outdoor_model,
                            sou.quantity
                         FROM sales_orders_units sou 
                         JOIN sales_orders so ON sou.sales_order_id = so.id 
                         WHERE so.so_number = ?";
        
        $stmt = $mysqli->prepare($getUnitsQuery);
        $stmt->bind_param("s", $so_number);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $quantity = intval($row['quantity']); 
            
         
          
            if (!empty($row['indoor_model'])) {
                $updateQuery = "UPDATE products 
                              SET `for schedule` = GREATEST(0, `for schedule` - ?),
                                  installed = installed + ?
                              WHERE brand = ? 
                              AND horsepower = ? 
                              AND unit_type = ? 
                              AND indoor_model = ?";
                
                $stmt2 = $mysqli->prepare($updateQuery);
                $stmt2->bind_param("iissss", $quantity, $quantity, $row['brand'], $row['horsepower'], $row['unit_type'], $row['indoor_model']);
                $stmt2->execute();
                $stmt2->close();
                
                error_log("DELIVERED SYSTEM: {$row['brand']} {$row['horsepower']} (Indoor: {$row['indoor_model']}) - moved {$quantity} complete systems from for_schedule to installed");
            }
        
        }
        $stmt->close();

        echo json_encode([
            'success' => true,
            'message' => "Order {$so_number} marked as delivered",
            'status' => 'Delivered',
            'action' => 'delivered'
        ]);

    } else {
        
        if ($currentStatus !== 'Delivered') {
            throw new Exception("Cannot unmark as delivered. Order is not currently delivered. Current status: {$currentStatus}");
        }

        $newStatus = 'In Transit';
        
        
        $updateSOQuery = "UPDATE sales_orders SET status = ? WHERE so_number = ?";
        $stmt = $mysqli->prepare($updateSOQuery);
        $stmt->bind_param("ss", $newStatus, $so_number);
        $stmt->execute();
        $stmt->close();

     
        $getUnitsQuery = "SELECT 
                            sou.brand,
                            sou.horsepower,
                            sou.unit_type,
                            sou.indoor_model,
                            sou.outdoor_model,
                            sou.quantity
                         FROM sales_orders_units sou 
                         JOIN sales_orders so ON sou.sales_order_id = so.id 
                         WHERE so.so_number = ?";
        
        $stmt = $mysqli->prepare($getUnitsQuery);
        $stmt->bind_param("s", $so_number);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $quantity = intval($row['quantity']); 
            

            if (!empty($row['indoor_model'])) {
                $updateQuery = "UPDATE products 
                              SET `for schedule` = `for schedule` + ?,
                                  installed = GREATEST(0, installed - ?)
                              WHERE brand = ? 
                              AND horsepower = ? 
                              AND unit_type = ? 
                              AND indoor_model = ?";
                
                $stmt2 = $mysqli->prepare($updateQuery);
                $stmt2->bind_param("iissss", $quantity, $quantity, $row['brand'], $row['horsepower'], $row['unit_type'], $row['indoor_model']);
                $stmt2->execute();
                $stmt2->close();
                
                error_log("UNDELIVERED SYSTEM: {$row['brand']} {$row['horsepower']} (Indoor: {$row['indoor_model']}) - moved {$quantity} complete systems from installed back to for_schedule");
            }
        
        }
        $stmt->close();

        echo json_encode([
            'success' => true,
            'message' => "Order {$so_number} set back to In Transit",
            'status' => $newStatus,
            'action' => 'undelivered'
        ]);
    }

} catch (Exception $e) {
    error_log("DELIVERY TOGGLE ERROR: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>