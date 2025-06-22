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

    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(1000, intval($_GET['limit']))) : 1000; 
    $search = $_GET['search'] ?? '';
    $sort = $_GET['sort'] ?? 'brand';
    $order = $_GET['order'] ?? 'ASC';

    $allowedSorts = ['brand', 'model', 'unit_description', 'horsepower', 'unit_type', 'series', 'stocks'];
    if (!in_array($sort, $allowedSorts)) {
        $sort = 'brand';
    }

    $order = strtoupper($order) === 'DESC' ? 'DESC' : 'ASC';

    $offset = ($page - 1) * $limit;

    $whereClause = "WHERE 1=1";
    $params = [];

    if (!empty($search)) {
        $whereClause .= " AND (
            brand LIKE :search OR 
            model LIKE :search OR 
            unit_description LIKE :search OR 
            horsepower LIKE :search OR 
            unit_type LIKE :search OR 
            series LIKE :search OR
            CAST(COALESCE(stocks, 0) AS CHAR) LIKE :search
        )";
        $params[':search'] = "%$search%";
    }

    $countSql = "SELECT COUNT(*) as total FROM products $whereClause";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalRecords = $countStmt->fetch()['total'];

    $sql = "SELECT 
                id,
                brand,
                model,
                unit_description,
                horsepower,
                unit_type,
                has_outdoor_unit,
                indoor_model,
                outdoor_model,
                series,
                COALESCE(stocks, 0) as stocks
              
            FROM products 
            $whereClause 
            ORDER BY $sort $order 
            LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);
    
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    
    $stmt->execute();
    $products = $stmt->fetchAll();

    $totalPages = ceil($totalRecords / $limit);
    $hasNext = $page < $totalPages;
    $hasPrev = $page > 1;

    error_log("INVENTORY API: Found $totalRecords total products, returning " . count($products) . " products");

    $response = [
        'success' => true,
        'data' => $products,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $limit,
            'total_records' => $totalRecords,
            'total_pages' => $totalPages,
            'has_next' => $hasNext,
            'has_prev' => $hasPrev
        ],
        'search' => $search,
        'sort' => $sort,
        'order' => $order
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log("INVENTORY API ERROR: " . $e->getMessage());
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