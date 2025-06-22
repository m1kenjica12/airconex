<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

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

    if (isset($_GET['get_products'])) {
        $sql = "SELECT DISTINCT 
                    p.brand, 
                    p.unit_description,
                    COALESCE(p.stocks, 0) as stock_quantity
                FROM products p
                WHERE p.brand IS NOT NULL AND p.unit_description IS NOT NULL 
                AND p.stocks > 0
                ORDER BY p.brand, p.unit_description";
        
        $stmt = $pdo->query($sql);
        $products = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'products' => $products
        ]);
        return;
    }

    $soNumber = $_GET['so_number'] ?? '';
    
    if (empty($soNumber)) {
        throw new Exception('SO number is required');
    }

    $sql = "SELECT id FROM sales_orders WHERE so_number = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$soNumber]);
    $salesOrder = $stmt->fetch();
    
    if (!$salesOrder) {
        throw new Exception('Sales order not found');
    }
    
    $salesOrderId = $salesOrder['id'];

    $sql = "SELECT 
                sou.brand,
                sou.unit_description,
                sou.quantity
            FROM sales_orders_units sou
            WHERE sou.sales_order_id = ?
            ORDER BY sou.id";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$salesOrderId]);
    $orderProducts = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'data' => $orderProducts,
        'so_number' => $soNumber,
        'sales_order_id' => $salesOrderId
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>