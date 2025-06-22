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

    $columnsCheck = $pdo->query("DESCRIBE sales_orders");
    $columns = $columnsCheck->fetchAll();
    
    error_log("Available columns: " . print_r(array_column($columns, 'Field'), true));

    $possibleStatusColumns = ['status', 'project_status', 'order_status', 'so_status'];
    $statusColumn = 'status'; 
    
    foreach ($possibleStatusColumns as $col) {
        $found = false;
        foreach ($columns as $column) {
            if ($column['Field'] === $col) {
                $statusColumn = $col;
                $found = true;
                break;
            }
        }
        if ($found) break;
    }

 
    $sql = "
        SELECT 
            so_number,
            store,
            store_code,
            account,
            {$statusColumn} as status,
            book_date,
            installation_date,
            month,
            client_type,
            client_name,
            address,
            city_province,
            contact_number,
            application_type,
            scope_of_work,
            mode_of_payment,
            scheme,
            remarks
        FROM sales_orders
        ORDER BY so_number DESC
    ";
    
    $stmt = $pdo->query($sql);
    $salesLogs = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'data' => $salesLogs,
        'debug' => [
            'status_column_used' => $statusColumn,
            'available_columns' => array_column($columns, 'Field')
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>