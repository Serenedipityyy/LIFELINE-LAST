<?php
// config.php - Configuration for Railway cloud deployment & local development

return [
    'db_host'    => getenv('MYSQLHOST') ?: getenv('DB_HOST') ?: '127.0.0.1',
    'db_name'    => getenv('MYSQLDATABASE') ?: getenv('DB_NAME') ?: 'lifeline',
    'db_user'    => getenv('MYSQLUSER') ?: getenv('DB_USER') ?: 'root',
    'db_pass'    => getenv('MYSQLPASSWORD') !== false ? getenv('MYSQLPASSWORD') : (getenv('DB_PASS') !== false ? getenv('DB_PASS') : ''),
    'db_port'    => getenv('MYSQLPORT') ?: getenv('DB_PORT') ?: '3306',
    'db_charset' => 'utf8mb4',

    'timezone_offset' => '+08:00',           // Philippines (Asia/Manila)

    'alert_cooldown_sec'      => 180,        // block a duplicate alert for the same room
    'max_active_per_reporter' => 3,          // max unresolved alerts one student may have
    'max_login_attempts'      => 5,
    'lockout_sec'             => 60,
];
