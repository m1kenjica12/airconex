AirconEx

Stack:
HTML/CSS/JS, PHP, MySQL

XAMPP local, tunnelmole for deployment naman

Critical Issues

Serial persistence: received_serial yung first batch lang nakastore, parang array iteration bug
Unit assignment: Multiple unit logic is nagiging sira, check if yung foreign key constraints nga di ko rin sure 
Count discrepancy: Wrong yung warehouse inventory query on assigned serial joins

Immediate Priority

Materials receiving module 
I-complete yung project engineer workflow process
Role-based authentication
Session management lang

Architecture
auth - departments - inventory - transactions

Implementation Notes

Sanitize all inputs lng, use parameterized queries
Session-based auth with role 
Transaction logging for audit trail purposes
Batch serial number processing with proper validation

Testing Focus

Serial number edge cases (bulk insert, duplicates ganyan)
Cross-department workflow integrity
Role permission boundaries
Data consistency under concurrent access


Est. completion: 3-4 weeks siguro
