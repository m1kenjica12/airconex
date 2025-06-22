<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    $host = 'localhost';
    $username = 'root';
    $password = '';
    $database = 'alpha0.2_airconex';

    $mysqli = new mysqli($host, $username, $password, $database);

    if ($mysqli->connect_error) {
        throw new Exception("Database connection failed: " . $mysqli->connect_error);
    }

    $mysqli->set_charset("utf8mb4");

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception("Invalid JSON data received");
    }

    if (empty($data['poDate']) || empty($data['supplier']) || empty($data['materials'])) {
        throw new Exception("Missing required fields");
    }

    $mysqli->begin_transaction();

    $pmoStmt = $mysqli->prepare("INSERT INTO purchase_material_orders (po_date, supplier, remarks) VALUES (?, ?, ?)");
    
    if (!$pmoStmt) {
        throw new Exception("Prepare failed: " . $mysqli->error);
    }

    $remarks = isset($data['remarks']) ? $data['remarks'] : '';
    $pmoStmt->bind_param("sss", $data['poDate'], $data['supplier'], $remarks);

    if (!$pmoStmt->execute()) {
        throw new Exception("Failed to insert purchase material order: " . $pmoStmt->error);
    }

    $purchaseMaterialOrderId = $mysqli->insert_id;
    $pmoStmt->close();

    $pmoiStmt = $mysqli->prepare("INSERT INTO purchase_material_order_items (purchase_material_order_id, category, material, unit, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    if (!$pmoiStmt) {
        throw new Exception("Prepare failed for items: " . $mysqli->error);
    }

    $totalItems = 0;
    foreach ($data['materials'] as $material) {
        if (empty($material['category']) || empty($material['material']) || empty($material['unit']) || !isset($material['quantity']) || $material['quantity'] <= 0) {
            throw new Exception("Invalid material data");
        }

        if (!isset($material['unit_price']) || $material['unit_price'] <= 0) {
            throw new Exception("Invalid material data - missing or invalid unit price");
        }

        $quantity = intval($material['quantity']);
        $unitPrice = floatval($material['unit_price']);
        $total = $quantity * $unitPrice;

        $pmoiStmt->bind_param("isssidd",
            $purchaseMaterialOrderId,
            $material['category'],
            $material['material'],
            $material['unit'],
            $quantity,
            $unitPrice,
            $total
        );

        if (!$pmoiStmt->execute()) {
            throw new Exception("Failed to insert material item: " . $pmoiStmt->error);
        }

        $totalItems += $quantity;
    }

    $pmoiStmt->close();
    $mysqli->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Material order created successfully',
        'data' => [
            'po_id' => $purchaseMaterialOrderId,
            'po_number' => 'MAT-' . str_pad($purchaseMaterialOrderId, 4, '0', STR_PAD_LEFT),
            'po_date' => $data['poDate'],
            'supplier' => $data['supplier'],
            'total_items' => $totalItems,
            'total_materials' => count($data['materials']),
            'remarks' => $remarks
        ]
    ]);

    $mysqli->close();

} catch (Exception $e) {
    if (isset($mysqli)) {
        $mysqli->rollback();
    }
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => 'Failed to create material order'
    ]);
}
?>