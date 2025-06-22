<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Disable HTML error output for JSON API
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Only POST requests are allowed");
    }

    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception("Invalid JSON data received");
    }

    // Log received data for debugging
    error_log("Warehouse Receiving Data: " . json_encode($data));

    // Validate required fields
    if (!isset($data['items']) || !is_array($data['items']) || empty($data['items'])) {
        throw new Exception("No items provided");
    }

    if (!isset($data['poNumber']) || empty($data['poNumber'])) {
        throw new Exception("PO Number is required");
    }

    if (!isset($data['drNumber']) || empty($data['drNumber'])) {
        throw new Exception("DR Number is required");
    }

    if (!isset($data['drDate']) || empty($data['drDate'])) {
        throw new Exception("DR Date is required");
    }

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

    // Check if dr_number and dr_date columns exist in purchase_orders table
    $checkColumnsQuery = "SHOW COLUMNS FROM purchase_orders LIKE 'dr_number'";
    $columnResult = $mysqli->query($checkColumnsQuery);
    
    if ($columnResult->num_rows == 0) {
        // Add dr_number column
        $addDRNumberQuery = "ALTER TABLE purchase_orders ADD COLUMN dr_number VARCHAR(50) NULL";
        if (!$mysqli->query($addDRNumberQuery)) {
            error_log("Failed to add dr_number column: " . $mysqli->error);
        }
    }

    $checkDateColumnQuery = "SHOW COLUMNS FROM purchase_orders LIKE 'dr_date'";
    $dateColumnResult = $mysqli->query($checkDateColumnQuery);
    
    if ($dateColumnResult->num_rows == 0) {
        // Add dr_date column
        $addDRDateQuery = "ALTER TABLE purchase_orders ADD COLUMN dr_date DATE NULL";
        if (!$mysqli->query($addDRDateQuery)) {
            error_log("Failed to add dr_date column: " . $mysqli->error);
        }
    }

    // Start transaction
    $mysqli->begin_transaction();

    // First check if the purchase order exists
    $checkPOQuery = "SELECT id FROM purchase_orders WHERE po_number = ?";
    $checkStmt = $mysqli->prepare($checkPOQuery);
    if (!$checkStmt) {
        throw new Exception("Prepare statement failed for PO check: " . $mysqli->error);
    }

    $checkStmt->bind_param("s", $data['poNumber']);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();

    if ($checkResult->num_rows === 0) {
        throw new Exception("Purchase Order not found: " . $data['poNumber']);
    }

    $purchaseOrderId = $checkResult->fetch_assoc()['id'];
    $checkStmt->close();

    error_log("Found Purchase Order ID: " . $purchaseOrderId);

    // Update the purchase_orders table with DR number and DR date
    $updatePOQuery = "UPDATE purchase_orders SET dr_number = ?, dr_date = ? WHERE po_number = ?";
    $updateStmt = $mysqli->prepare($updatePOQuery);
    if (!$updateStmt) {
        throw new Exception("Prepare statement failed for PO update: " . $mysqli->error);
    }

    $updateStmt->bind_param("sss", $data['drNumber'], $data['drDate'], $data['poNumber']);
    
    if (!$updateStmt->execute()) {
        throw new Exception("Failed to update PO with DR info: " . $updateStmt->error);
    }
    $updateStmt->close();

    $receivedItems = [];
    $updatedCount = 0;
    $stockUpdates = [];

    // Group items by item_id to collect all serials for each item type
    $itemGroups = [];
    foreach ($data['items'] as $item) {
        $itemId = $item['item_id'];
        if (!isset($itemGroups[$itemId])) {
            $itemGroups[$itemId] = [];
        }
        $itemGroups[$itemId][] = $item;
    }

    // Process each item group - save ALL serials in proper format
    foreach ($itemGroups as $itemId => $items) {
        $serialPairs = [];
        
        // Collect all serial pairs for this item_id
        foreach ($items as $item) {
            // Validate item data
            if (!isset($item['indoorSerial']) || !isset($item['outdoorSerial'])) {
                throw new Exception("Missing serial numbers for item ID: " . $itemId);
            }

            if (empty(trim($item['indoorSerial'])) || empty(trim($item['outdoorSerial']))) {
                throw new Exception("Serial numbers cannot be empty for item ID: " . $itemId);
            }

            $serialPairs[] = trim($item['indoorSerial']) . ' / ' . trim($item['outdoorSerial']);
            
            $receivedItems[] = [
                'item_id' => $itemId,
                'indoor_serial' => trim($item['indoorSerial']),
                'outdoor_serial' => trim($item['outdoorSerial']),
                'unit_description' => $item['unitDescription'] ?? '',
                'indoor_model' => $item['indoorModel'] ?? '',
                'outdoor_model' => $item['outdoorModel'] ?? ''
            ];

            $updatedCount++;
        }

        // Create the proper format: "RECEIVED - X units: serial1; serial2; serial3..."
        $serialString = implode('; ', $serialPairs);
        $receivedStatus = "RECEIVED - " . count($items) . " units: " . $serialString;

        // Update purchase_order_items with ALL serials
        $updateItemQuery = "UPDATE purchase_order_items SET received_serial = ? WHERE id = ?";
        $updateItemStmt = $mysqli->prepare($updateItemQuery);
        if (!$updateItemStmt) {
            throw new Exception("Prepare statement failed for item update: " . $mysqli->error);
        }

        $updateItemStmt->bind_param("si", $receivedStatus, $itemId);
        
        if (!$updateItemStmt->execute()) {
            throw new Exception("Failed to update item ID {$itemId}: " . $updateItemStmt->error);
        }
        $updateItemStmt->close();

        error_log("Updated item {$itemId} with received_serial: " . $receivedStatus);

        // Get item details for stock update
        $getItemQuery = "SELECT brand, unit_description, unit_type, horsepower, indoor_model, outdoor_model FROM purchase_order_items WHERE id = ?";
        $getItemStmt = $mysqli->prepare($getItemQuery);
        $getItemStmt->bind_param("i", $itemId);
        $getItemStmt->execute();
        $itemResult = $getItemStmt->get_result();
        
        if ($itemResult->num_rows > 0) {
            $itemData = $itemResult->fetch_assoc();
            
            // Find matching product in products table by exact model match first, then fallback
            $findProductQuery = "SELECT id, stocks, brand, unit_description, horsepower, unit_type, indoor_model, outdoor_model FROM products 
                                WHERE brand = ? 
                                AND indoor_model = ? 
                                AND outdoor_model = ?
                                LIMIT 1";
            
            $findStmt = $mysqli->prepare($findProductQuery);
            $findStmt->bind_param("sss", 
                $itemData['brand'], 
                $itemData['indoor_model'],
                $itemData['outdoor_model']
            );
            $findStmt->execute();
            $productResult = $findStmt->get_result();
            
            // Add detailed logging to see what's being searched vs what exists
            error_log("SEARCHING FOR PRODUCT (EXACT MODEL MATCH):");
            error_log("- Brand: " . $itemData['brand']);
            error_log("- Indoor Model: " . $itemData['indoor_model']);
            error_log("- Outdoor Model: " . $itemData['outdoor_model']);

            if ($productResult->num_rows > 0) {
                $product = $productResult->fetch_assoc();
                
                error_log("FOUND EXACT MODEL MATCH:");
                error_log("- Product ID: " . $product['id']);
                error_log("- Brand: " . $product['brand']);
                error_log("- Unit Description: " . $product['unit_description']);
                error_log("- Indoor Model: " . $product['indoor_model']);
                error_log("- Outdoor Model: " . $product['outdoor_model']);
                error_log("- Current Stock: " . $product['stocks']);
                
                $currentStock = intval($product['stocks']);
                $receivedCount = count($items);
                $newStock = $currentStock + $receivedCount;
                
                // Update the stock in products table
                $updateStockQuery = "UPDATE products SET stocks = ? WHERE id = ?";
                $updateStockStmt = $mysqli->prepare($updateStockQuery);
                $updateStockStmt->bind_param("ii", $newStock, $product['id']);
                
                if ($updateStockStmt->execute()) {
                    $stockUpdates[] = [
                        'product_id' => $product['id'],
                        'brand' => $itemData['brand'],
                        'unit_description' => $itemData['unit_description'],
                        'previous_stock' => $currentStock,
                        'received_count' => $receivedCount,
                        'new_stock' => $newStock
                    ];
                    error_log("STOCK UPDATED: Product ID {$product['id']}, {$itemData['brand']} exact model match: {$currentStock} + {$receivedCount} = {$newStock}");
                } else {
                    error_log("Failed to update stock for product ID: " . $product['id'] . " - Error: " . $updateStockStmt->error);
                }
                $updateStockStmt->close();
            } else {
                error_log("NO EXACT MODEL MATCH FOUND - Trying fallback search");
                
                // Fallback: Try to find by description similarity
                $findProductQuery2 = "SELECT id, stocks, brand, unit_description, horsepower, unit_type, indoor_model, outdoor_model FROM products 
                                     WHERE brand = ? 
                                     AND unit_description LIKE ?
                                     AND horsepower = ?
                                     AND unit_type = ?
                                     LIMIT 1";
                
                $likeDescription = '%' . $itemData['unit_description'] . '%';
                $findStmt2 = $mysqli->prepare($findProductQuery2);
                $findStmt2->bind_param("ssss", 
                    $itemData['brand'], 
                    $likeDescription,
                    $itemData['horsepower'],
                    $itemData['unit_type']
                );
                $findStmt2->execute();
                $productResult2 = $findStmt2->get_result();
                
                if ($productResult2->num_rows > 0) {
                    $product = $productResult2->fetch_assoc();
                    
                    error_log("FOUND FALLBACK MATCH:");
                    error_log("- Product ID: " . $product['id']);
                    error_log("- Brand: " . $product['brand']);
                    error_log("- Unit Description: " . $product['unit_description']);
                    error_log("- Current Stock: " . $product['stocks']);
                    
                    $currentStock = intval($product['stocks']);
                    $receivedCount = count($items);
                    $newStock = $currentStock + $receivedCount;
                    
                    // Update the stock in products table
                    $updateStockQuery = "UPDATE products SET stocks = ? WHERE id = ?";
                    $updateStockStmt = $mysqli->prepare($updateStockQuery);
                    $updateStockStmt->bind_param("ii", $newStock, $product['id']);
                    
                    if ($updateStockStmt->execute()) {
                        $stockUpdates[] = [
                            'product_id' => $product['id'],
                            'brand' => $itemData['brand'],
                            'unit_description' => $itemData['unit_description'],
                            'previous_stock' => $currentStock,
                            'received_count' => $receivedCount,
                            'new_stock' => $newStock
                        ];
                        error_log("STOCK UPDATED: Product ID {$product['id']}, {$itemData['brand']} fallback match: {$currentStock} + {$receivedCount} = {$newStock}");
                    } else {
                        error_log("Failed to update stock for product ID: " . $product['id'] . " - Error: " . $updateStockStmt->error);
                    }
                    $updateStockStmt->close();
                } else {
                    error_log("PRODUCT NOT FOUND IN INVENTORY: {$itemData['brand']} - {$itemData['unit_description']}");
                    
                    // Let's also check what products exist for this brand
                    $debugQuery = "SELECT id, brand, unit_description, horsepower, unit_type, indoor_model, outdoor_model, stocks FROM products WHERE brand = ?";
                    $debugStmt = $mysqli->prepare($debugQuery);
                    $debugStmt->bind_param("s", $itemData['brand']);
                    $debugStmt->execute();
                    $debugResult = $debugStmt->get_result();
                    
                    error_log("EXISTING PRODUCTS FOR BRAND '{$itemData['brand']}':");
                    while ($debugRow = $debugResult->fetch_assoc()) {
                        error_log("- ID: {$debugRow['id']}, Desc: {$debugRow['unit_description']}, HP: {$debugRow['horsepower']}, Type: {$debugRow['unit_type']}, Indoor: {$debugRow['indoor_model']}, Outdoor: {$debugRow['outdoor_model']}, Stock: {$debugRow['stocks']}");
                    }
                    $debugStmt->close();
                }
                $findStmt2->close();
            }
            $findStmt->close();
        }
        $getItemStmt->close();
    }

    // Commit transaction
    $mysqli->commit();
    $mysqli->close();

    echo json_encode([
        'success' => true,
        'message' => "Successfully received {$updatedCount} units for PO {$data['poNumber']}. All serials saved and stock levels updated.",
        'data' => [
            'po_number' => $data['poNumber'],
            'dr_number' => $data['drNumber'],
            'dr_date' => $data['drDate'],
            'received_items' => $receivedItems,
            'total_items' => count($receivedItems),
            'updated_count' => $updatedCount,
            'stock_updates' => $stockUpdates
        ]
    ]);

} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        $mysqli->rollback();
        $mysqli->close();
    }
    
    // Log error for debugging
    error_log("Warehouse Receiving Submit Error: " . $e->getMessage());
    error_log("Error trace: " . $e->getTraceAsString());
    
    // Always return JSON
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ]
    ]);
}
?>