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
        throw new Exception("Database connection failed: " . $mysqli->connect_error);
    }

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!isset($data['id'])) {
        throw new Exception("Purchase Order ID is required");
    }

    $poId = $data['id']; // This is purchase_orders.id

    // Get current status of ALL items in this Purchase Order
    // FIX: Add table alias to status column to resolve ambiguity
    $checkStmt = $mysqli->prepare("
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN poi.status = 'Released' THEN 1 END) as released_items,
            po.po_number
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        WHERE poi.purchase_order_id = ?
        GROUP BY po.po_number
    ");
    $checkStmt->bind_param("i", $poId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $statusCheck = $result->fetch_assoc();
    $checkStmt->close();

    if (!$statusCheck || $statusCheck['total_items'] == 0) {
        throw new Exception("No items found for Purchase Order ID: " . $poId);
    }

    // Determine new status based on current state
    $allReleased = ($statusCheck['released_items'] == $statusCheck['total_items']);
    $newStatus = $allReleased ? 'Unreleased' : 'Released';

    // Update ALL items in this Purchase Order to the new status
    $updateStmt = $mysqli->prepare("
        UPDATE purchase_order_items 
        SET status = ? 
        WHERE purchase_order_id = ?
    ");
    $updateStmt->bind_param("si", $newStatus, $poId);

    if ($updateStmt->execute()) {
        $affectedRows = $updateStmt->affected_rows;
        
        echo json_encode([
            'success' => true, 
            'message' => "All {$affectedRows} items in PO {$statusCheck['po_number']} updated to {$newStatus}",
            'new_status' => $newStatus,
            'affected_items' => $affectedRows,
            'po_id' => $poId,
            'po_number' => $statusCheck['po_number']
        ]);
    } else {
        throw new Exception("Failed to update Purchase Order items status");
    }

    $updateStmt->close();
    $mysqli->close();

} catch (Exception $e) {
    error_log("PO RELEASE ERROR: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage(),
        'po_id' => $data['id'] ?? 'unknown'
    ]);
}
?>