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

    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'brands':
            $sql = "SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != '' AND stocks > 0 ORDER BY brand ASC";
            $stmt = $pdo->query($sql);
            $brands = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            echo json_encode([
                'success' => true,
                'data' => $brands
            ]);
            break;

        case 'units':
            $brand = $_GET['brand'] ?? '';
            
            if (empty($brand)) {
                $sql = "SELECT id, brand, model, unit_description, horsepower, unit_type, 
                               has_outdoor_unit, indoor_model, outdoor_model, series, stocks 
                        FROM products 
                        WHERE unit_description IS NOT NULL AND unit_description != '' 
                        AND stocks > 0
                        ORDER BY brand ASC, unit_description ASC";
                $stmt = $pdo->query($sql);
            } else {
                $sql = "SELECT id, brand, model, unit_description, horsepower, unit_type, 
                               has_outdoor_unit, indoor_model, outdoor_model, series, stocks 
                        FROM products 
                        WHERE brand = :brand 
                        AND unit_description IS NOT NULL AND unit_description != '' 
                        AND stocks > 0
                        ORDER BY unit_description ASC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':brand' => $brand]);
            }
            
            $units = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $units
            ]);
            break;

        case 'all':
            $sql = "SELECT id, brand, model, unit_description, horsepower, unit_type, 
                           has_outdoor_unit, indoor_model, outdoor_model, series, stocks 
                    FROM products 
                    WHERE brand IS NOT NULL AND brand != '' 
                    AND unit_description IS NOT NULL AND unit_description != '' 
                    AND stocks > 0
                    ORDER BY brand ASC, unit_description ASC";
            $stmt = $pdo->query($sql);
            $products = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $products
            ]);
            break;

        default:
            throw new Exception('Invalid action specified');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>