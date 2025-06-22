<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database connection
$host = 'localhost';
$dbname = 'alpha0.2_airconex';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo, $input);
        break;
    case 'PUT':
        handlePut($pdo, $input);
        break;
    case 'DELETE':
        handleDelete($pdo, $input);
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}

function handleGet($pdo) {
    try {
        $sql = "SELECT * FROM materials ORDER BY id ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $materials,
            'count' => count($materials)
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to fetch materials: ' . $e->getMessage()]);
    }
}

function handlePost($pdo, $input) {
    try {
        $sql = "INSERT INTO materials (
            description, 
            beg_inv, 
            uom, 
            material_receipt, 
            material_issued, 
            material_returned, 
            scrap_in, 
            scrap_out, 
            reserved,
            ending_inv, 
            jan, feb, mar, apr, may, jun, 
            jul, aug, sep, oct, nov, dec, 
            unit_cost, 
            amount
        ) VALUES (
            :description, 
            :beg_inv, 
            :uom, 
            :material_receipt, 
            :material_issued, 
            :material_returned, 
            :scrap_in, 
            :scrap_out, 
            :reserved,
            :ending_inv, 
            :jan, :feb, :mar, :apr, :may, :jun, 
            :jul, :aug, :sep, :oct, :nov, :dec, 
            :unit_cost, 
            :amount
        )";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':description' => $input['description'] ?? '',
            ':beg_inv' => $input['beg_inv'] ?? 0,
            ':uom' => $input['uom'] ?? '',
            ':material_receipt' => $input['material_receipt'] ?? 0,
            ':material_issued' => $input['material_issued'] ?? 0,
            ':material_returned' => $input['material_returned'] ?? 0,
            ':scrap_in' => $input['scrap_in'] ?? 0,
            ':scrap_out' => $input['scrap_out'] ?? 0,
            ':reserved' => $input['reserved'] ?? 0,
            ':ending_inv' => $input['ending_inv'] ?? 0,
            ':jan' => $input['jan'] ?? 0,
            ':feb' => $input['feb'] ?? 0,
            ':mar' => $input['mar'] ?? 0,
            ':apr' => $input['apr'] ?? 0,
            ':may' => $input['may'] ?? 0,
            ':jun' => $input['jun'] ?? 0,
            ':jul' => $input['jul'] ?? 0,
            ':aug' => $input['aug'] ?? 0,
            ':sep' => $input['sep'] ?? 0,
            ':oct' => $input['oct'] ?? 0,
            ':nov' => $input['nov'] ?? 0,
            ':dec' => $input['dec'] ?? 0,
            ':unit_cost' => $input['unit_cost'] ?? 0,
            ':amount' => $input['amount'] ?? 0
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Material added successfully',
            'id' => $pdo->lastInsertId()
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to add material: ' . $e->getMessage()]);
    }
}

function handlePut($pdo, $input) {
    try {
        if (!isset($input['id'])) {
            echo json_encode(['success' => false, 'error' => 'Material ID is required']);
            return;
        }
        
        $sql = "UPDATE materials SET 
            description = :description,
            beg_inv = :beg_inv,
            uom = :uom,
            material_receipt = :material_receipt,
            material_issued = :material_issued,
            material_returned = :material_returned,
            scrap_in = :scrap_in,
            scrap_out = :scrap_out,
            reserved = :reserved,
            ending_inv = :ending_inv,
            jan = :jan, feb = :feb, mar = :mar, apr = :apr, may = :may, jun = :jun,
            jul = :jul, aug = :aug, sep = :sep, oct = :oct, nov = :nov, dec = :dec,
            unit_cost = :unit_cost,
            amount = :amount
        WHERE id = :id";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $input['id'],
            ':description' => $input['description'] ?? '',
            ':beg_inv' => $input['beg_inv'] ?? 0,
            ':uom' => $input['uom'] ?? '',
            ':material_receipt' => $input['material_receipt'] ?? 0,
            ':material_issued' => $input['material_issued'] ?? 0,
            ':material_returned' => $input['material_returned'] ?? 0,
            ':scrap_in' => $input['scrap_in'] ?? 0,
            ':scrap_out' => $input['scrap_out'] ?? 0,
            ':reserved' => $input['reserved'] ?? 0,
            ':ending_inv' => $input['ending_inv'] ?? 0,
            ':jan' => $input['jan'] ?? 0,
            ':feb' => $input['feb'] ?? 0,
            ':mar' => $input['mar'] ?? 0,
            ':apr' => $input['apr'] ?? 0,
            ':may' => $input['may'] ?? 0,
            ':jun' => $input['jun'] ?? 0,
            ':jul' => $input['jul'] ?? 0,
            ':aug' => $input['aug'] ?? 0,
            ':sep' => $input['sep'] ?? 0,
            ':oct' => $input['oct'] ?? 0,
            ':nov' => $input['nov'] ?? 0,
            ':dec' => $input['dec'] ?? 0,
            ':unit_cost' => $input['unit_cost'] ?? 0,
            ':amount' => $input['amount'] ?? 0
        ]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Material updated successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Material not found or no changes made']);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to update material: ' . $e->getMessage()]);
    }
}

function handleDelete($pdo, $input) {
    try {
        if (!isset($input['id'])) {
            echo json_encode(['success' => false, 'error' => 'Material ID is required']);
            return;
        }
        
        $sql = "DELETE FROM materials WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $input['id']]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Material deleted successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Material not found']);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to delete material: ' . $e->getMessage()]);
    }
}
?>