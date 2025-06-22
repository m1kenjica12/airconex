<?php
// filepath: c:\xampp\htdocs\alpha0.2_airconex\api\purchasing_material_logs.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

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

    // First check if tables exist
    $tablesExist = true;
    $tableCheck = $mysqli->query("SHOW TABLES LIKE 'purchase_material_orders'");
    if ($tableCheck->num_rows === 0) {
        $tablesExist = false;
    }
    
    $tableCheck = $mysqli->query("SHOW TABLES LIKE 'purchase_material_order_items'");
    if ($tableCheck->num_rows === 0) {
        $tablesExist = false;
    }
    
    if (!$tablesExist) {
        // Return empty results if tables don't exist
        echo json_encode([
            'success' => true,
            'orders' => [],
            'total_orders' => 0,
            'message' => 'Tables do not exist or are empty',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }

    $orderId = $_GET['order_id'] ?? '';

    if ($orderId) {
        // Get order details
        $orderSql = "SELECT 
                        id,
                        CONCAT('MAT-', LPAD(id, 4, '0')) as po_number,
                        po_date,
                        supplier,
                        remarks
                     FROM purchase_material_orders 
                     WHERE id = ?";

        $orderStmt = $mysqli->prepare($orderSql);
        if (!$orderStmt) {
            throw new Exception("Prepare failed: " . $mysqli->error);
        }
        
        $orderStmt->bind_param("i", $orderId);
        $orderStmt->execute();
        $orderResult = $orderStmt->get_result();
        
        if ($orderResult->num_rows === 0) {
            throw new Exception('Order not found');
        }
        
        $order = $orderResult->fetch_assoc();

        // Get order items
        $itemsSql = "SELECT 
                        id,
                        purchase_material_order_id,
                        category,
                        material,
                        unit,
                        quantity,
                        unit_price,
                        total
                     FROM purchase_material_order_items 
                     WHERE purchase_material_order_id = ?
                     ORDER BY id";

        $itemsStmt = $mysqli->prepare($itemsSql);
        if (!$itemsStmt) {
            throw new Exception("Prepare failed for items: " . $mysqli->error);
        }
        
        $itemsStmt->bind_param("i", $orderId);
        $itemsStmt->execute();
        $itemsResult = $itemsStmt->get_result();
        
        $items = [];
        while ($row = $itemsResult->fetch_assoc()) {
            $items[] = [
                'id' => $row['id'],
                'purchase_material_order_id' => $row['purchase_material_order_id'],
                'category' => $row['category'],
                'material' => $row['material'],
                'unit' => $row['unit'],
                'quantity' => (int)$row['quantity'],
                'unit_price' => (float)$row['unit_price'],
                'total' => (float)$row['total']
            ];
        }

        echo json_encode([
            'success' => true,
            'order' => $order,
            'items' => $items,
            'total_items' => count($items),
            'timestamp' => date('Y-m-d H:i:s')
        ]);

    } else {
        // Check if purchase_material_orders table has any records
        $countCheck = $mysqli->query("SELECT COUNT(*) as total FROM purchase_material_orders");
        $countRow = $countCheck->fetch_assoc();
        $totalOrders = $countRow['total'];
        
        if ($totalOrders == 0) {
            // Return empty results if no orders exist
            echo json_encode([
                'success' => true,
                'orders' => [],
                'total_orders' => 0,
                'message' => 'No orders found in the database',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            exit;
        }

        // Get all orders
        $sql = "SELECT 
                    pmo.id,
                    CONCAT('MAT-', LPAD(pmo.id, 4, '0')) as po_number,
                    pmo.po_date,
                    pmo.supplier,
                    pmo.remarks,
                    COUNT(pmoi.id) as total_materials,
                    COALESCE(SUM(pmoi.quantity), 0) as total_items,
                    COALESCE(SUM(pmoi.total), 0) as total_amount
                FROM purchase_material_orders pmo
                LEFT JOIN purchase_material_order_items pmoi ON pmo.id = pmoi.purchase_material_order_id
                GROUP BY pmo.id, pmo.po_date, pmo.supplier, pmo.remarks
                ORDER BY pmo.id DESC";

        $result = $mysqli->query($sql);

        if (!$result) {
            throw new Exception("Query failed: " . $mysqli->error);
        }

        $orders = [];
        while ($row = $result->fetch_assoc()) {
            $orders[] = [
                'id' => (int)$row['id'],
                'po_number' => $row['po_number'],
                'po_date' => $row['po_date'],
                'supplier' => $row['supplier'],
                'remarks' => $row['remarks'],
                'total_items' => (int)$row['total_items'],
                'total_amount' => (float)$row['total_amount'],
                'total_materials' => (int)$row['total_materials']
            ];
        }

        echo json_encode([
            'success' => true,
            'orders' => $orders,
            'total_orders' => count($orders),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }

    $mysqli->close();

} catch (Exception $e) {
    error_log("MATERIAL LOGS ERROR: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_details' => [
            'file' => __FILE__,
            'line' => __LINE__,
            'trace' => $e->getTraceAsString()
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>