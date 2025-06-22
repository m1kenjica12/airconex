Inventory Management System
Stack
HTML/CSS/JS, PHP, MySQL
XAMPP local, tunnelmole for deployment naman

Critical Issues
Serial persistence: received_serial yung first batch lang nakastore, parang array iteration bug
Unit assignment: Multiple unit logic is nagiging sira, check mo yung foreign key constraints
Count discrepancy: Wrong yung warehouse inventory query on assigned serial joins
Immediate Priority
Materials receiving module (purchasing dept is waiting na eh)
I-complete yung engineer workflow process
Role-based authentication
Session management lang
Architecture
auth -> departments -> inventory -> transactions
Database Schema
sql
users: id, username, hash, role, timestamp
inventory: id, item, serials, qty, location
transactions: id, inventory_id, action, qty, user_id, timestamp  
departments: id, name, workflow_stage
Implementation Notes
Sanitize all inputs ha, use parameterized queries
Session-based auth with role middleware
Transaction logging for audit trail purposes
Batch serial number processing with proper validation
Testing Focus
Serial number edge cases (bulk insert, duplicates ganyan)
Cross-department workflow integrity
Role permission boundaries
Data consistency under concurrent access
Est. completion: 3-4 weeks siguro

