<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Only POST requests are allowed");
    }

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception("Invalid JSON data received");
    }

    if (!isset($data['so_number']) || empty($data['so_number'])) {
        throw new Exception("SO Number is required");
    }

    if (!isset($data['model']) || empty($data['model'])) {
        throw new Exception("Model is required");
    }

    if (!isset($data['unit_type']) || empty($data['unit_type'])) {
        throw new Exception("Unit Type is required");
    }

    if (!isset($data['serial_number']) || empty($data['serial_number'])) {
        throw new Exception("Serial Number is required");
    }

    $host = 'localhost';
    $username = 'root';
    $password = '';
    $database = 'alpha0.2_airconex';

    $mysqli = new mysqli($host, $username, $password, $database);

    if ($mysqli->connect_error) {
        throw new Exception("Database connection failed: " . $mysqli->connect_error);
    }

    $mysqli->set_charset("utf8mb4");

    $mysqli->begin_transaction();

    $findQuery = "SELECT sou.id, sou.assigned_serial, sou.indoor_model, sou.outdoor_model
                  FROM sales_orders_units sou
                  JOIN sales_orders so ON sou.sales_order_id = so.id
                  WHERE so.so_number = ? 
                  AND (sou.indoor_model = ? OR sou.outdoor_model = ?)
                  LIMIT 1";

    $stmt = $mysqli->prepare($findQuery);
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $mysqli->error);
    }

    $stmt->bind_param("sss", $data['so_number'], $data['model'], $data['model']);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("No matching unit found for SO: {$data['so_number']} and Model: {$data['model']}");
    }

    $unit = $result->fetch_assoc();
    $stmt->close();

    $indoor_serial = '';
    $outdoor_serial = '';

    if (!empty($unit['assigned_serial']) && strpos($unit['assigned_serial'], ' / ') !== false) {
        $serial_parts = explode(' / ', $unit['assigned_serial']);
        if (count($serial_parts) == 2) {
            $indoor_serial = trim($serial_parts[0]);
            $outdoor_serial = trim($serial_parts[1]);
        }
    }

    if ($data['unit_type'] === 'Indoor Unit' && $unit['indoor_model'] === $data['model']) {
        $indoor_serial = $data['serial_number'];
    } elseif ($data['unit_type'] === 'Outdoor Unit' && $unit['outdoor_model'] === $data['model']) {
        $outdoor_serial = $data['serial_number'];
    } else {
        throw new Exception("Unit type and model mismatch");
    }

    $combined_serial = trim($indoor_serial) . ' / ' . trim($outdoor_serial);

    $updateQuery = "UPDATE sales_orders_units 
                   SET assigned_serial = ?
                   WHERE id = ?";

    $stmt = $mysqli->prepare($updateQuery);
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $mysqli->error);
    }

    $stmt->bind_param("si", $combined_serial, $unit['id']);

    if (!$stmt->execute()) {
        throw new Exception("Failed to update serial assignment: " . $stmt->error);
    }

    if ($stmt->affected_rows === 0) {
        throw new Exception("No rows were updated");
    }

    $stmt->close();

    if (!empty($indoor_serial) && !empty($outdoor_serial)) {
        $updatePOQuery = "UPDATE purchase_orders po
                         JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
                         SET po.status = 'Allocated'
                         WHERE (poi.indoor_model = ? OR poi.outdoor_model = ?)";

        $stmt = $mysqli->prepare($updatePOQuery);
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $mysqli->error);
        }

        $stmt->bind_param("ss", $data['model'], $data['model']);
        $stmt->execute();
        $stmt->close();
    }

    $mysqli->commit();
    $mysqli->close();

    echo json_encode([
        'success' => true,
        'message' => "Serial number assigned successfully",
        'data' => [
            'so_number' => $data['so_number'],
            'model' => $data['model'],
            'unit_type' => $data['unit_type'],
            'assigned_serial' => $data['serial_number'],
            'combined_serial' => $combined_serial,
            'unit_id' => $unit['id']
        ]
    ]);

} catch (Exception $e) {
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        $mysqli->rollback();
        $mysqli->close();
    }

    error_log("Dispatch Serial Assignment Error: " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>