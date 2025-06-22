<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Disable HTML error output for JSON API
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Database configuration
    $host = 'localhost';
    $username = 'root';
    $password = '';
    $database = 'alpha0.2_airconex';

    $mysqli = new mysqli($host, $username, $password, $database);

    if ($mysqli->connect_error) {
        throw new Exception("Database connection failed: " . $mysqli->connect_error);
    }

    $mysqli->set_charset("utf8mb4");

    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception("Invalid JSON data received");
    }

    // Check if tables exist
    $result = $mysqli->query("SHOW TABLES LIKE 'purchase_orders'");
    if ($result->num_rows == 0) {
        // Create tables if they don't exist
        $createPO = "CREATE TABLE purchase_orders (
            id INT PRIMARY KEY AUTO_INCREMENT,
            po_number VARCHAR(50) UNIQUE NOT NULL,
            supplier VARCHAR(255) NOT NULL,
            po_date DATE NOT NULL,
            remarks TEXT,
            status VARCHAR(50) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        
        if (!$mysqli->query($createPO)) {
            throw new Exception("Failed to create purchase_orders table: " . $mysqli->error);
        }
    }

    $result = $mysqli->query("SHOW TABLES LIKE 'purchase_order_items'");
    if ($result->num_rows == 0) {
        $createPOI = "CREATE TABLE purchase_order_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            purchase_order_id INT NOT NULL,
            brand VARCHAR(100) NOT NULL,
            unit_description VARCHAR(255),
            unit_type VARCHAR(100) NOT NULL,
            indoor_model VARCHAR(255),
            outdoor_model VARCHAR(255),
            horsepower VARCHAR(20) NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            total_unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
        )";
        
        if (!$mysqli->query($createPOI)) {
            throw new Exception("Failed to create purchase_order_items table: " . $mysqli->error);
        }
    }

    // Validate required fields
    if (empty($data['poDate']) || empty($data['supplier']) || empty($data['products'])) {
        throw new Exception("Missing required fields");
    }

    // Generate PO Number - Pattern: PO-25-0001, PO-25-0002, etc.
    $year = date('y'); // Get 2-digit year (25, 26, 27, etc.)
    $sequence = 1;
    
    $query = "SELECT po_number FROM purchase_orders 
              WHERE po_number LIKE 'PO-{$year}-%' 
              ORDER BY po_number DESC LIMIT 1";
    
    $result = $mysqli->query($query);
    if ($result && $result->num_rows > 0) {
        $lastPO = $result->fetch_assoc()['po_number'];
        // Extract sequence from PO-25-0001 format
        $parts = explode('-', $lastPO);
        if (count($parts) === 3) {
            $sequence = intval($parts[2]) + 1;
        }
    }
    
    $poNumber = sprintf("PO-%s-%04d", $year, $sequence);

    // Start transaction
    $mysqli->begin_transaction();

    // Insert main purchase order
    $poStmt = $mysqli->prepare("INSERT INTO purchase_orders (po_number, supplier, po_date, remarks, status) VALUES (?, ?, ?, ?, 'Pending')");
    
    if (!$poStmt) {
        throw new Exception("Prepare failed: " . $mysqli->error);
    }

    $remarks = isset($data['remarks']) ? $data['remarks'] : '';
    $poStmt->bind_param("ssss", $poNumber, $data['supplier'], $data['poDate'], $remarks);

    if (!$poStmt->execute()) {
        throw new Exception("Failed to insert purchase order: " . $poStmt->error);
    }

    $purchaseOrderId = $mysqli->insert_id;
    $poStmt->close();

    // Insert purchase order items
    $itemStmt = $mysqli->prepare("INSERT INTO purchase_order_items (purchase_order_id, brand, unit_description, unit_type, indoor_model, outdoor_model, horsepower, quantity, unit_price, total_unit_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    if (!$itemStmt) {
        throw new Exception("Prepare failed for items: " . $mysqli->error);
    }

    $totalItems = 0;
    foreach ($data['products'] as $product) {
        // Debug log the product data
        error_log("Product data: " . json_encode($product));
        
        if (empty($product['brand']) || empty($product['hp']) || !isset($product['quantity']) || $product['quantity'] <= 0) {
            throw new Exception("Invalid product data - missing brand, HP, or quantity. Product: " . json_encode($product));
        }

        // Check if unit_price exists and is valid
        if (!isset($product['unit_price']) || $product['unit_price'] <= 0) {
            throw new Exception("Invalid product data - missing or invalid unit price. Product: " . json_encode($product));
        }

        $unitDescription = "{$product['brand']} {$product['hp']} {$product['series']} {$product['type']}";
        $indoorModel = isset($product['indoor_model']) ? $product['indoor_model'] : '';
        $outdoorModel = isset($product['outdoor_model']) ? $product['outdoor_model'] : '';
        
        // Store values in variables before binding
        $quantity = intval($product['quantity']);
        $unitPrice = floatval($product['unit_price']);
        $totalUnitPrice = $quantity * $unitPrice;

        $itemStmt->bind_param("issssssidd",
            $purchaseOrderId,
            $product['brand'],
            $unitDescription,
            $product['type'],
            $indoorModel,
            $outdoorModel,
            $product['hp'],
            $quantity,
            $unitPrice,
            $totalUnitPrice
        );

        if (!$itemStmt->execute()) {
            throw new Exception("Failed to insert item: " . $itemStmt->error);
        }

        $totalItems += $quantity;
    }

    $itemStmt->close();
    $mysqli->commit();

    // Success response
    echo json_encode([
        'success' => true,
        'message' => 'Purchase order created successfully',
        'data' => [
            'po_id' => $purchaseOrderId,
            'po_number' => $poNumber,
            'po_date' => $data['poDate'],
            'supplier' => $data['supplier'],
            'total_items' => $totalItems,
            'total_products' => count($data['products']),
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
        'error' => 'Failed to create purchase order'
    ]);
}
?>