<?php
/**
 * أداة الفحص والتشخيص الذاتي لنظام الرواتب — سيرفر Hostinger
 * تتيح معرفة سبب أي خطأ 500 أو مشكلة في الاتصال أو الصلاحيات فوراً
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');

$phpVersion = PHP_VERSION;
$phpVersionOk = version_compare($phpVersion, '8.0.0', '>=');

$extensions = [
    'pdo' => extension_loaded('pdo'),
    'pdo_mysql' => extension_loaded('pdo_mysql'),
    'mbstring' => extension_loaded('mbstring'),
    'json' => extension_loaded('json'),
    'openssl' => extension_loaded('openssl'),
    'session' => extension_loaded('session'),
];

$configDir = __DIR__ . '/config';
$configFile = $configDir . '/db.php';
$lockFile = __DIR__ . '/install/install.lock';

$configWritable = is_writable(is_dir($configDir) ? $configDir : __DIR__);
$dbConfigExists = file_exists($configFile);
$installLocked = file_exists($lockFile);

$dbStatus = 'لم يتم إنشاء ملف الاتصال بعد';
$dbConnected = false;
$dbError = '';

if ($dbConfigExists) {
    try {
        require_once $configFile;
        if (function_exists('getDbConnection')) {
            $pdo = getDbConnection();
            $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()");
            $tableCount = (int)$stmt->fetchColumn();
            $dbConnected = true;
            $dbStatus = "متصل بنجاح! عدد الجداول الحالية: {$tableCount}";
        }
    } catch (Throwable $e) {
        $dbConnected = false;
        $dbError = $e->getMessage();
        $dbStatus = 'فشل الاتصال: ' . $dbError;
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تشخيص حالة السيرفر — نظام الرواتب</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Cairo', sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem 1rem; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; }
        .table { color: #f8fafc; }
        .badge-success { background: #10b981; }
        .badge-danger { background: #ef4444; }
        .badge-warning { background: #f59e0b; color: #000; }
    </style>
</head>
<body>
<div class="container" style="max-width: 760px;">
    <div class="card p-4 shadow-lg">
        <div class="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-secondary">
            <div>
                <h3 class="fw-bold mb-1">🛠️ تقرير الفحص والتشخيص الذاتي للسيرفر</h3>
                <p class="text-secondary small mb-0">نظام إدارة الرواتب الكويتي &bull; فحص بيئة Hostinger</p>
            </div>
            <a href="index.php" class="btn btn-outline-info btn-sm">الانتقال للرئيسية &larr;</a>
        </div>

        <h5 class="fw-bold mb-3 text-info">1. متطلبات بيئة PHP</h5>
        <div class="table-responsive mb-4">
            <table class="table table-bordered align-middle">
                <tbody>
                    <tr>
                        <td>إصدار PHP الحالي</td>
                        <td class="font-mono"><strong><?= $phpVersion ?></strong></td>
                        <td>
                            <?php if ($phpVersionOk): ?>
                                <span class="badge badge-success">✓ متوافق (<?= $phpVersion ?>)</span>
                            <?php else: ?>
                                <span class="badge badge-danger">✗ يحتاج تحديث إلى PHP 8.1 أو 8.2 من hPanel</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php foreach ($extensions as $ext => $loaded): ?>
                    <tr>
                        <td>إضافة <?= $ext ?></td>
                        <td><?= $loaded ? 'متوفرة ومفعلة' : 'غير متوفرة' ?></td>
                        <td>
                            <span class="badge <?= $loaded ? 'badge-success' : 'badge-danger' ?>">
                                <?= $loaded ? '✓ مفعل' : '✗ غير متوفر' ?>
                            </span>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <h5 class="fw-bold mb-3 text-info">2. حالة التثبيت وقاعدة البيانات</h5>
        <div class="table-responsive mb-4">
            <table class="table table-bordered align-middle">
                <tbody>
                    <tr>
                        <td>صلاحية الكتابة (config/ و install/)</td>
                        <td><?= $configWritable ? 'المجلد قابل للكتابة' : 'المجلد للقراءة فقط' ?></td>
                        <td>
                            <span class="badge <?= $configWritable ? 'badge-success' : 'badge-warning' ?>">
                                <?= $configWritable ? '✓ سليم (755)' : '⚠️ اضبط الصلاحية إلى 755 في hPanel' ?>
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td>ملف الإعدادات (config/db.php)</td>
                        <td><?= $dbConfigExists ? 'الملف موجود' : 'الملف غير موجود (يحتاج تنصيب)' ?></td>
                        <td>
                            <span class="badge <?= $dbConfigExists ? 'badge-success' : 'badge-warning' ?>">
                                <?= $dbConfigExists ? '✓ موجود' : 'غير منشأ' ?>
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td>ملف قفل التنصيب (install.lock)</td>
                        <td><?= $installLocked ? 'النظام مقفل (مكتمل التنصيب)' : 'النظام غير مقفل' ?></td>
                        <td>
                            <span class="badge <?= $installLocked ? 'badge-success' : 'badge-warning' ?>">
                                <?= $installLocked ? '✓ مقفل' : 'بانتظار التنصيب' ?>
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td>حالة الاتصال بقاعدة البيانات</td>
                        <td colspan="2" class="<?= $dbConnected ? 'text-success' : 'text-warning' ?>">
                            <?= htmlspecialchars($dbStatus, ENT_QUOTES, 'UTF-8') ?>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="d-flex flex-column flex-sm-row gap-2 justify-content-center pt-2">
            <?php if (!$installLocked || !$dbConfigExists): ?>
                <a href="install/index.php" class="btn btn-primary fw-bold px-4 py-2">
                    🚀 فتح معالج التنصيب الآن (/install/)
                </a>
            <?php else: ?>
                <a href="login.php" class="btn btn-success fw-bold px-4 py-2">
                    🔑 الانتقال لصفحة تسجيل الدخول (/login.php)
                </a>
                <a href="index.php" class="btn btn-outline-light px-4 py-2">
                    📊 لوحة التحكم الرئيسية (/index.php)
                </a>
            <?php endif; ?>
        </div>
    </div>
</div>
</body>
</html>
