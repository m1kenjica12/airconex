<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

ini_set('display_errors', 1);
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

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }

    if (empty($data['so_number']) || !isset($data['row_index'])) {
        throw new Exception('SO number and row index are required');
    }

    $sql = "SELECT id FROM sales_orders WHERE so_number = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$data['so_number']]);
    $salesOrder = $stmt->fetch();
    
    if (!$salesOrder) {
        throw new Exception('Sales order not found');
    }
    
    $salesOrderId = $salesOrder['id'];

    $sql = "SELECT id FROM sales_orders_units WHERE sales_order_id = ? ORDER BY id LIMIT 1 OFFSET ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$salesOrderId, $data['row_index']]);
    $productRecord = $stmt->fetch();
    
    if (!$productRecord) {
        throw new Exception('Product record not found');
    }

    $sql = "SELECT unit_type, indoor_model, outdoor_model FROM products WHERE brand = ? AND unit_description = ? LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$data['brand'], $data['unit_description']]);
    $productDetails = $stmt->fetch();

    $sql = "UPDATE sales_orders_units SET 
                brand = ?, 
                unit_description = ?, 
                unit_type = ?,
                indoor_model = ?,
                outdoor_model = ?,
                quantity = ?
            WHERE id = ? AND sales_order_id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $data['brand'],
        $data['unit_description'],
        $productDetails['unit_type'] ?? null,
        $productDetails['indoor_model'] ?? null,
        $productDetails['outdoor_model'] ?? null,
        $data['quantity'],
        $productRecord['id'],
        $salesOrderId
    ]);

    if ($stmt->rowCount() === 0) {
        throw new Exception('No rows were updated');
    }

    echo json_encode([
        'success' => true,
        'message' => 'Product updated successfully',
        'updated_id' => $productRecord['id'],
        'product_details' => $productDetails
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>