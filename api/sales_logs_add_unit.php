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

    if (empty($data['so_number']) || empty($data['brand']) || empty($data['unit_description'])) {
        throw new Exception('SO number, brand, and unit description are required');
    }

    $sql = "SELECT id FROM sales_orders WHERE so_number = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$data['so_number']]);
    $salesOrder = $stmt->fetch();
    
    if (!$salesOrder) {
        throw new Exception('Sales order not found');
    }
    
    $salesOrderId = $salesOrder['id'];

    $sql = "SELECT unit_type, indoor_model, outdoor_model FROM products WHERE brand = ? AND unit_description = ? LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$data['brand'], $data['unit_description']]);
    $productDetails = $stmt->fetch();

    $sql = "INSERT INTO sales_orders_units (
                sales_order_id, 
                brand, 
                unit_description, 
                unit_type,
                indoor_model,
                outdoor_model,
                quantity,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $salesOrderId,
        $data['brand'],
        $data['unit_description'],
        $productDetails['unit_type'] ?? null,
        $productDetails['indoor_model'] ?? null,
        $productDetails['outdoor_model'] ?? null,
        $data['quantity']
    ]);

    $newUnitId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Unit added successfully',
        'unit_id' => $newUnitId,
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

