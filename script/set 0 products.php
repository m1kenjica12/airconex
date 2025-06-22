<?php

$servername = "localhost";
$username = "root";
$password = "wrong pass"; // palitan bago iexec
$dbname = "alpha_airconex";

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Starting duplicate removal process...\n";
    

    $pdo->beginTransaction();
    
    $findDuplicatesSQL = "
        SELECT brand, unit_description, 
               GROUP_CONCAT(id ORDER BY id) as ids,
               COUNT(*) as count
        FROM products 
        GROUP BY brand, unit_description 
        HAVING COUNT(*) > 1
    ";
    
    $stmt = $pdo->prepare($findDuplicatesSQL);
    $stmt->execute();
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $totalDuplicates = 0;
    $removedCount = 0;
    
    foreach ($duplicates as $duplicate) {
        $ids = explode(',', $duplicate['ids']);
        $keepId = array_shift($ids); 
        $removeIds = $ids; 
        
        echo "Found {$duplicate['count']} duplicates for: {$duplicate['brand']} - {$duplicate['unit_description']}\n";
        echo "Keeping ID: $keepId, Removing IDs: " . implode(', ', $removeIds) . "\n";
       
        if (!empty($removeIds)) {
            $placeholders = str_repeat('?,', count($removeIds) - 1) . '?';
            $deleteSQL = "DELETE FROM products WHERE id IN ($placeholders)";
            $deleteStmt = $pdo->prepare($deleteSQL);
            $deleteStmt->execute($removeIds);
            
            $removedCount += count($removeIds);
        }
        
        $totalDuplicates += $duplicate['count'] - 1;
    }
    
   
    $pdo->commit();
    
    echo "\nDuplicate removal completed!\n";
    echo "Total duplicate records removed: $removedCount\n";
    echo "Unique products retained: " . (count($duplicates)) . "\n";
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage() . "\n";
}
?>
