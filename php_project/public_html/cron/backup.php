<?php
/**
 * سكربت جدولة النسخ الاحتياطي التلقائي لقاعدة البيانات وصور الشيكات — Cron Job
 * يمكن تشغيله عبر لوحة تحكم هوستنجر (Hostinger Cron Jobs):
 * مثال: php -q /home/u123456789/public_html/cron/backup.php
 */

declare(strict_types=1);

// ضبط المنطقة الزمنية للكويت
date_default_timezone_set('Asia/Kuwait');

$baseDir = dirname(__DIR__);
$configFile = $baseDir . '/config/db.php';

if (!file_exists($configFile)) {
    die("النظام غير مثبت بعد.\n");
}

require_once $baseDir . '/config/config.php';
require_once $configFile;

try {
    $pdo = getDbConnection();
} catch (Throwable $e) {
    die("خطأ في الاتصال بقاعدة البيانات: " . $e->getMessage() . "\n");
}

$backupDir = $baseDir . '/backups';
if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0755, true);
    @file_put_contents($backupDir . '/.htaccess', "Options -Indexes\nRequire all denied\n");
}

$cfgFile = $baseDir . '/config/backup_config.json';
$cfg = file_exists($cfgFile) ? json_decode(file_get_contents($cfgFile), true) : [];
$retention = max(3, (int)($cfg['retentionCount'] ?? 14));

$tables = [
    'settings',
    'branches',
    'departments',
    'employees',
    'monthly_records',
    'payslips',
    'monthly_payrolls',
    'bank_accounts',
    'cheque_templates',
    'cheque_books',
    'beneficiaries',
    'issued_cheques',
    'cheque_print_settings',
    'reconciliation_settings',
    'reconciliation_sessions',
    'reconciliation_bank_tx',
    'reconciliation_ledger_tx',
    'reconciliation_diffs',
    'reconciliation_journal_entries',
    'users',
    'audit_log'
];

$backupData = [
    'version' => '1.0',
    'createdAt' => date('Y-m-d H:i:s'),
    'type' => 'scheduled',
    'notes' => 'نسخة احتياطية مجدولة تلقائياً عبر Cron Job',
    'tables' => [],
    'chequeImages' => [],
    'customPath' => $cfg['chequeImagesCustomPath'] ?? 'uploads/cheques',
];

$totalRecords = 0;
foreach ($tables as $tbl) {
    try {
        $stmt = $pdo->query("SELECT * FROM `{$tbl}`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $backupData['tables'][$tbl] = $rows;
        $totalRecords += count($rows);
    } catch (Throwable $te) {
        $backupData['tables'][$tbl] = [];
    }
}

// جمع صور الشيكات
$tplStmt = $pdo->query("SELECT id, name, cheque_image_url, cheque_image_name FROM cheque_templates WHERE cheque_image_url IS NOT NULL");
$chequeImages = [];
while ($r = $tplStmt->fetch(PDO::FETCH_ASSOC)) {
    $chequeImages[] = [
        'templateId' => $r['id'],
        'templateName' => $r['name'],
        'imageUrl' => $r['cheque_image_url'],
        'imageName' => $r['cheque_image_name'],
    ];
}
$backupData['chequeImages'] = $chequeImages;

$timestamp = date('Y-m-d_H-i-s');
$filename = "backup_payroll_db_{$timestamp}.json";
$filepath = $backupDir . '/' . $filename;
$jsonContent = json_encode($backupData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

file_put_contents($filepath, $jsonContent);

// تنظيف النسخ القديمة
$allBackups = glob($backupDir . '/backup_payroll_db_*.json');
if (count($allBackups) > $retention) {
    usort($allBackups, fn($a, $b) => filemtime($a) <=> filemtime($b));
    $toDelete = array_slice($allBackups, 0, count($allBackups) - $retention);
    foreach ($toDelete as $df) {
        @unlink($df);
    }
}

// تسجيل في audit_log
try {
    $stmt = $pdo->prepare("INSERT INTO audit_log (action, table_name, details, ip_address, created_at) VALUES ('CRON_BACKUP', 'system', :details, '127.0.0.1', NOW())");
    $stmt->execute([
        ':details' => "تم إنشاء نسخة احتياطية مجدولة: {$filename} ({$totalRecords} سجل، " . count($chequeImages) . " صور شيكات)"
    ]);
} catch (Throwable $e) {}

echo "SUCCESS: Backup created successfully: {$filename} ({$totalRecords} records)\n";
