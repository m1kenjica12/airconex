<?php
// filepath: c:\xampp\htdocs\alpha0.2_airconex\api\purchasing_material_order_form_load_dropdown.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    $host = 'localhost';
    $username = 'root';
    $password = '';
    $database = 'alpha0.2_airconex';

    $mysqli = new mysqli($host, $username, $password, $database);

    if ($mysqli->connect_error) {
        throw new Exception("Database connection failed: " . $mysqli->connect_error);
    }

    // Query to get Category, Material (description), and UOM from materials table
    $sql = "SELECT category, description, uom FROM materials ORDER BY category, description";
    $result = $mysqli->query($sql);

    if (!$result) {
        throw new Exception("Query failed: " . $mysqli->error);
    }

    $materialData = [];
    
    while ($row = $result->fetch_assoc()) {
        $category = $row['category'];
        $description = $row['description'];
        $uom = $row['uom'];
        
        if (!isset($materialData[$category])) {
            $materialData[$category] = [];
        }
        
        $materialData[$category][] = [
            'description' => $description,
            'uom' => $uom
        ];
    }

    // Query to get suppliers from material_suppliers table
    $supplierSql = "SELECT supplier_name FROM material_suppliers ORDER BY supplier_name";
    $supplierResult = $mysqli->query($supplierSql);

    if (!$supplierResult) {
        throw new Exception("Supplier query failed: " . $mysqli->error);
    }

    $suppliers = [];
    while ($row = $supplierResult->fetch_assoc()) {
        $suppliers[] = $row['supplier_name'];
    }

    echo json_encode([
        'success' => true,
        'data' => $materialData,
        'suppliers' => $suppliers,
        'total_categories' => count($materialData),
        'total_suppliers' => count($suppliers),
        'timestamp' => date('Y-m-d H:i:s')
    ]);

    $mysqli->close();

} catch (Exception $e) {
    error_log("MATERIAL DROPDOWN ERROR: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>