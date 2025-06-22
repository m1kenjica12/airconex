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
    $delivery_date = $input['delivery_date'];
    $delivery_notes = $input['delivery_notes'] ?? '';

    
    $updateSOQuery = "UPDATE sales_orders SET status = 'Delivered' WHERE so_number = ?";
    $stmt = $mysqli->prepare($updateSOQuery);
    $stmt->bind_param("s", $so_number);
    $stmt->execute();

    
    $getUnitsQuery = "SELECT sou.brand, sou.horsepower, sou.unit_type, sou.quantity 
                     FROM sales_orders_units sou 
                     JOIN sales_orders so ON sou.sales_order_id = so.id 
                     WHERE so.so_number = ?";
    
    $stmt = $mysqli->prepare($getUnitsQuery);
    $stmt->bind_param("s", $so_number);
    $stmt->execute();
    $units = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    foreach ($units as $unit) {
        
        $updateInventoryQuery = "UPDATE products 
                               SET `for schedule` = GREATEST(0, `for schedule` - ?),
                                   installed = installed + ?
                               WHERE brand = ? AND horsepower = ? AND unit_type = ?";
        
        $stmt = $mysqli->prepare($updateInventoryQuery);
        $stmt->bind_param("iisss", 
            $unit['quantity'], 
            $unit['quantity'], 
            $unit['brand'], 
            $unit['horsepower'], 
            $unit['unit_type']
        );
        $stmt->execute();
    }

    echo json_encode([
        'success' => true,
        'message' => "Order {$so_number} marked as delivered successfully"
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>