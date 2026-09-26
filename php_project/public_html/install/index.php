<?php
/**
 * سكربت التنصيب الذاتي لنظام الرواتب وإدارة الفروع
 * متوافق مع PHP 8.2+ و MySQL / MariaDB (Hostinger)
 * يقوم بإنشاء الجداول وحساب الأدمن وملف الاتصال وقفل نفسه تلقائياً
 */

declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');

$lockFile = __DIR__ . '/install.lock';
$configDir = dirname(__DIR__) . '/config';
$configFile = $configDir . '/db.php';
$schemaFile = __DIR__ . '/schema.sql';

// التحقق من قفل التنصيب مسبقاً
$isLocked = file_exists($lockFile);

$errors = [];
$successMessage = '';

// فحص المتطلبات التقنية
$requirements = [
    'php_version' => [
        'name' => 'إصدار PHP 8.0 أو أعلى (موصى به 8.2)',
        'status' => version_compare(PHP_VERSION, '8.0.0', '>='),
        'current' => PHP_VERSION,
    ],
    'pdo' => [
        'name' => 'إضافة PDO للمكتبات',
        'status' => extension_loaded('pdo'),
        'current' => extension_loaded('pdo') ? 'مفعل' : 'غير متوفر',
    ],
    'pdo_mysql' => [
        'name' => 'إضافة PDO MySQL',
        'status' => extension_loaded('pdo_mysql'),
        'current' => extension_loaded('pdo_mysql') ? 'مفعل' : 'غير متوفر',
    ],
    'mbstring' => [
        'name' => 'إضافة mbstring (للنصوص العربية)',
        'status' => extension_loaded('mbstring'),
        'current' => extension_loaded('mbstring') ? 'مفعل' : 'غير متوفر',
    ],
    'config_writable' => [
        'name' => 'صلاحية الكتابة في مجلد config/',
        'status' => is_writable(is_dir($configDir) ? $configDir : dirname(__DIR__)),
        'current' => is_writable(is_dir($configDir) ? $configDir : dirname(__DIR__)) ? 'قابلة للكتابة' : 'غير قابلة للكتابة',
    ],
];

$allRequirementsPassed = !in_array(false, array_column($requirements, 'status'), true);

// معالجة طلب التنصيب
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$isLocked && $allRequirementsPassed) {
    // 1. استقبال وتطهير البيانات
    $dbHost = trim($_POST['db_host'] ?? 'localhost');
    $dbName = trim($_POST['db_name'] ?? '');
    $dbUser = trim($_POST['db_user'] ?? '');
    $dbPass = $_POST['db_pass'] ?? '';

    $adminUser = trim($_POST['admin_user'] ?? '');
    $adminPass = $_POST['admin_pass'] ?? '';
    $adminName = trim($_POST['admin_name'] ?? '');

    $companyName = trim($_POST['company_name'] ?? 'شركة الأعمال الحديثة');
    $overtimeRate = (float)($_POST['overtime_rate'] ?? 1.25);
    $residenceAlertDays = (int)($_POST['residence_alert_days'] ?? 60);

    // التحقق من الحقول الإلزامية
    if (empty($dbName) || empty($dbUser)) {
        $errors[] = 'يرجى إدخال اسم قاعدة البيانات واسم المستخدم.';
    }
    if (empty($adminUser) || strlen($adminPass) < 6 || empty($adminName)) {
        $errors[] = 'يرجى إدخال بيانات المدير العام كاملة (كلمة المرور 6 خانات على الأقل).';
    }

    if (empty($errors)) {
        try {
            // محاولة الاتصال بخادم MySQL
            $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
            $pdoOptions = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            ];
            $pdo = new PDO($dsn, $dbUser, $dbPass, $pdoOptions);

            // قراءة ملف schema.sql وتشغيله
            if (!file_exists($schemaFile)) {
                throw new RuntimeException('ملف schema.sql غير موجود في مجلد install.');
            }

            $sqlContent = file_get_contents($schemaFile);
            if ($sqlContent === false) {
                throw new RuntimeException('تعذر قراءة ملف schema.sql.');
            }

            // تنفيذ استعلامات إنشاء الجداول
            $pdo->exec($sqlContent);

            // إدخال وتحديث الإعدادات الافتراضية للشركة بمرونة وتوافقية كاملة
            $settingsCols = [];
            try {
                $colsStmt = $pdo->query("SHOW COLUMNS FROM settings");
                while ($c = $colsStmt->fetch(PDO::FETCH_ASSOC)) {
                    $settingsCols[] = strtolower($c['Field']);
                }
            } catch (Throwable $ignore) {}

            // تحديد أسماء الحقول بدقة حسب بنية الجدول المنشأ
            $colOt = in_array('overtime_multiplier', $settingsCols, true) ? 'overtime_multiplier' : (in_array('overtime_rate', $settingsCols, true) ? 'overtime_rate' : 'overtime_multiplier');
            $colRes = in_array('residency_alert_days', $settingsCols, true) ? 'residency_alert_days' : (in_array('residence_alert_days', $settingsCols, true) ? 'residence_alert_days' : 'residency_alert_days');

            // إضافة الحقول في حال عدم وجودها لأي سبب
            if (!in_array($colOt, $settingsCols, true)) {
                try { $pdo->exec("ALTER TABLE settings ADD COLUMN `overtime_multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.25"); $colOt = 'overtime_multiplier'; } catch (Throwable $ignore) {}
            }
            if (!in_array($colRes, $settingsCols, true)) {
                try { $pdo->exec("ALTER TABLE settings ADD COLUMN `residency_alert_days` INT UNSIGNED NOT NULL DEFAULT 60"); $colRes = 'residency_alert_days'; } catch (Throwable $ignore) {}
            }

            $stmtSettings = $pdo->prepare("
                INSERT INTO settings (id, company_name, {$colOt}, {$colRes}, currency, rounding_step)
                VALUES (1, :company_name, :ot_val, :res_val, 'د.ك', 0.050)
                ON DUPLICATE KEY UPDATE 
                    company_name = VALUES(company_name),
                    {$colOt} = VALUES({$colOt}),
                    {$colRes} = VALUES({$colRes})
            ");
            $stmtSettings->execute([
                ':company_name' => $companyName,
                ':ot_val'       => $overtimeRate,
                ':res_val'      => $residenceAlertDays,
            ]);

            // تشفير كلمة مرور الأدمن عبر bcrypt
            $passwordHash = password_hash($adminPass, PASSWORD_BCRYPT, ['cost' => 12]);

            // إدخال حساب Super Admin
            $stmtAdmin = $pdo->prepare("
                INSERT INTO users (username, password, full_name, role)
                VALUES (:username, :password, :full_name, 'super_admin')
                ON DUPLICATE KEY UPDATE 
                    password = VALUES(password),
                    full_name = VALUES(full_name),
                    role = 'super_admin'
            ");
            $stmtAdmin->execute([
                ':username' => $adminUser,
                ':password' => $passwordHash,
                ':full_name' => $adminName,
            ]);

            $adminId = $pdo->lastInsertId() ?: 1;

            // تسجيل حدث التنصيب في audit_log
            $stmtAudit = $pdo->prepare("
                INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                VALUES (:user_id, 'SYSTEM_INSTALL', 'settings', 1, :new_values, :ip_address, :user_agent)
            ");
            $auditData = json_encode([
                'company_name' => $companyName,
                'admin_user' => $adminUser,
                'overtime_rate' => $overtimeRate,
                'php_version' => PHP_VERSION,
            ], JSON_UNESCAPED_UNICODE);
            $stmtAudit->execute([
                ':user_id' => $adminId,
                ':new_values' => $auditData,
                ':ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                ':user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'CLI/Install',
            ]);

            // إنشاء مجلد config إذا لم يكن موجوداً
            if (!is_dir($configDir)) {
                mkdir($configDir, 0755, true);
            }

            // إنشاء ملف config/db.php
            $escapedHost = addslashes($dbHost);
            $escapedName = addslashes($dbName);
            $escapedUser = addslashes($dbUser);
            $escapedPass = addslashes($dbPass);

            $dbPhpContent = "<?php\n" .
                "/**\n" .
                " * إعدادات الاتصال بقاعدة البيانات — تم إنشاؤه آلياً بواسطة سكربت التنصيب\n" .
                " * تاريخ الإنشاء: " . date('Y-m-d H:i:s') . "\n" .
                " */\n\n" .
                "declare(strict_types=1);\n\n" .
                "define('DB_HOST', '{$escapedHost}');\n" .
                "define('DB_NAME', '{$escapedName}');\n" .
                "define('DB_USER', '{$escapedUser}');\n" .
                "define('DB_PASS', '{$escapedPass}');\n" .
                "define('DB_CHARSET', 'utf8mb4');\n\n" .
                "/**\n" .
                " * إرجاع كائن اتصال PDO مشترك\n" .
                " */\n" .
                "function getDbConnection(): PDO {\n" .
                "    static \$pdo = null;\n" .
                "    if (\$pdo === null) {\n" .
                "        \$dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;\n" .
                "        \$options = [\n" .
                "            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n" .
                "            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n" .
                "            PDO::ATTR_EMULATE_PREPARES => false,\n" .
                "            PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES ' . DB_CHARSET . ' COLLATE utf8mb4_unicode_ci',\n" .
                "        ];\n" .
                "        try {\n" .
                "            \$pdo = new PDO(\$dsn, DB_USER, DB_PASS, \$options);\n" .
                "        } catch (PDOException \$e) {\n" .
                "            error_log('Database Connection Error: ' . \$e->getMessage());\n" .
                "            die('عذراً، حدث خطأ في الاتصال بقاعدة البيانات. يرجى مراجعة ملف السجلات.');\n" .
                "        }\n" .
                "    }\n" .
                "    return \$pdo;\n" .
                "}\n";

            if (file_put_contents($configFile, $dbPhpContent) === false) {
                throw new RuntimeException('تعذر إنشاء ملف config/db.php، يرجى فحص أذونات المجلد.');
            }

            // إنشاء ملف القفل install.lock لمنع إعادة التنصيب
            $lockContent = "INSTALLED_ON=" . date('c') . "\nADMIN=" . $adminUser . "\n";
            file_put_contents($lockFile, $lockContent);

            $isLocked = true;
            $successMessage = 'تم تنصيب النظام بنجاح، وتم إنشاء الجداول وحساب المدير وتأمين ملفات الإعداد.';

        } catch (PDOException $e) {
            $errors[] = 'فشل الاتصال بقاعدة البيانات: ' . $e->getMessage();
        } catch (Throwable $e) {
            $errors[] = 'خطأ أثناء التنصيب: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سكربت تنصيب نظام الرواتب — الخطوة الأولى</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Cairo', sans-serif;
            background: #f1f5f9;
            color: #1e293b;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
        }
        .install-card {
            background: #ffffff;
            border-radius: 1rem;
            border: 1px solid #e2e8f0;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
            max-width: 760px;
            width: 100%;
            overflow: hidden;
        }
        .header-bar {
            background: linear-gradient(135deg, #1e3a8a, #0f172a);
            color: #ffffff;
            padding: 2rem 2.5rem;
        }
        .form-section-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.5rem;
            margin-bottom: 1.25rem;
        }
        .form-control:focus, .form-select:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.15);
        }
    </style>
</head>
<body>

<div class="install-card">
    <div class="header-bar">
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <span class="badge bg-primary-subtle text-primary mb-2 px-3 py-1 fw-bold">المرحلة الأولى</span>
                <h3 class="fw-bold mb-1">معالج تنصيب نظام الرواتب والإدارة</h3>
                <p class="mb-0 text-slate-300 small">تهيئة قاعدة بيانات MySQL وحساب المسؤول الأول (Super Admin)</p>
            </div>
            <div class="text-start">
                <span class="badge bg-white text-dark p-2">PHP 8.2 &bull; KWD</span>
            </div>
        </div>
    </div>

    <div class="p-4 p-md-5">
        <?php if ($isLocked): ?>
            <div class="alert alert-success d-flex align-items-center mb-4" role="alert">
                <div class="flex-grow-1">
                    <h5 class="alert-heading fw-bold mb-1">النظام منصب ومقفل بالفعل</h5>
                    <p class="mb-0">تم اكتشاف ملف القفل (<code>install.lock</code>). حفاظاً على أمان بيانات الشركة تم إيقاف معالج التنصيب التلقائي.</p>
                </div>
            </div>
            <div class="text-center py-3">
                <p class="text-muted">يمكنك التوجه مباشرة لصفحة تسجيل الدخول:</p>
                <a href="../login.php" class="btn btn-primary btn-lg px-4 fw-bold">الانتقال إلى تسجيل الدخول</a>
            </div>
        <?php else: ?>

            <?php if (!empty($errors)): ?>
                <div class="alert alert-danger mb-4">
                    <h6 class="fw-bold mb-2">تنبيه أثناء التنصيب:</h6>
                    <ul class="mb-0 ps-3">
                        <?php foreach ($errors as $err): ?>
                            <li><?= htmlspecialchars($err, ENT_QUOTES, 'UTF-8') ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <!-- فحص المتطلبات -->
            <div class="mb-4">
                <h6 class="form-section-title">فحص بيئة الخادم والاستضافة (Hostinger)</h6>
                <div class="row g-2">
                    <?php foreach ($requirements as $req): ?>
                        <div class="col-sm-6">
                            <div class="p-2 border rounded d-flex justify-content-between align-items-center <?= $req['status'] ? 'bg-light' : 'bg-danger-subtle' ?>">
                                <span class="small fw-semibold"><?= htmlspecialchars($req['name']) ?></span>
                                <span class="badge <?= $req['status'] ? 'bg-success' : 'bg-danger' ?>"><?= $req['current'] ?></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                <?php if (!$allRequirementsPassed): ?>
                    <div class="alert alert-warning mt-2 small mb-0">
                        بعض متطلبات الخادم غير متحققة. يرجى تفعيل ملحقات PHP في لوحة تحكم الاستضافة (cPanel / hPanel).
                    </div>
                <?php endif; ?>
            </div>

            <form method="POST" action="">
                <!-- 1. بيانات قاعدة البيانات -->
                <div class="mb-4">
                    <h6 class="form-section-title">1. بيانات قاعدة بيانات MySQL</h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">خادم قاعدة البيانات (Host)</label>
                            <input type="text" name="db_host" class="form-control" value="localhost" required>
                            <div class="form-text">في استضافة Hostinger غالباً ما يكون <code>localhost</code></div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">اسم قاعدة البيانات (Database Name)</label>
                            <input type="text" name="db_name" class="form-control" placeholder="مثال: u123456_payroll" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">اسم مستخدم قاعدة البيانات (DB User)</label>
                            <input type="text" name="db_user" class="form-control" placeholder="مثال: u123456_admin" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">كلمة مرور قاعدة البيانات (DB Password)</label>
                            <input type="password" name="db_pass" class="form-control" placeholder="••••••••">
                        </div>
                    </div>
                </div>

                <!-- 2. بيانات حساب Super Admin -->
                <div class="mb-4">
                    <h6 class="form-section-title">2. حساب المدير العام (Super Admin)</h6>
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">الاسم الكامل</label>
                            <input type="text" name="admin_name" class="form-control" placeholder="المدير العام" value="المدير العام" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">اسم المستخدم (Username)</label>
                            <input type="text" name="admin_user" class="form-control" value="admin" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">كلمة المرور المشفرة</label>
                            <input type="password" name="admin_pass" class="form-control" placeholder="6 خانات على الأقل" required>
                        </div>
                    </div>
                </div>

                <!-- 3. إعدادات الشركة الافتراضية -->
                <div class="mb-4">
                    <h6 class="form-section-title">3. الإعدادات العامة للشركة</h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">اسم الشركة أو المؤسسة</label>
                            <input type="text" name="company_name" class="form-control" value="شركة الأعمال للتجارة والمقاولات" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold">معامل الإضافي</label>
                            <input type="number" step="0.05" name="overtime_rate" class="form-control" value="1.25" required>
                            <div class="form-text">افتراضي: 1.25</div>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold">أيام تنبيه الإقامة</label>
                            <input type="number" name="residence_alert_days" class="form-control" value="60" required>
                            <div class="form-text">افتراضي: 60 يوماً</div>
                        </div>
                    </div>
                </div>

                <div class="d-grid mt-4">
                    <button type="submit" class="btn btn-primary btn-lg fw-bold" <?= !$allRequirementsPassed ? 'disabled' : '' ?>>
                        بدء التنصيب التلقائي وإنشاء الجداول
                    </button>
                </div>
            </form>
        <?php endif; ?>
    </div>
    <div class="bg-light p-3 text-center border-top small text-muted">
        منظومة إدارة الرواتب المتعددة الفروع &bull; متوافق مع لوحة تحكم Hostinger &bull; الدينار الكويتي KWD
    </div>
</div>

</body>
</html>
