<?php
/**
 * صفحة تسجيل الدخول الآمنة — نظام إدارة الرواتب المتعدد الفروع
 * تعتمد Prepared Statements لمنع SQL Injection، وتشفير bcrypt، وحماية CSRF
 */

declare(strict_types=1);

// التحقق من وجود ملف التنصيب وقاعدة البيانات
$configFile = __DIR__ . '/config/db.php';
$lockFile = __DIR__ . '/install/install.lock';

if (!file_exists($configFile) || !file_exists($lockFile)) {
    header('Location: install/index.php');
    exit;
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/core/auth.php';
require_once __DIR__ . '/core/audit.php';
require_once __DIR__ . '/core/helpers.php';

// إذا كان مسجل دخوله بالفعل، نقله للوحة التحكم
if (isAuthenticated()) {
    header('Location: index.php');
    exit;
}

$error = '';
$redirect = $_GET['redirect'] ?? 'index.php';

// جلب إعدادات الشركة للشعار والاسم
$companyName = 'نظام إدارة الرواتب';
$companyLogo = null;
$pdo = null;

try {
    $pdo = getDbConnection();
    $stmtSettings = $pdo->query("SELECT company_name, logo_path FROM settings WHERE id = 1 LIMIT 1");
    if ($row = $stmtSettings->fetch()) {
        $companyName = !empty($row['company_name']) ? $row['company_name'] : $companyName;
        $companyLogo = $row['logo_path'] ?? null;
    }
} catch (Throwable $e) {
    // تجاوز في حال لم توجد بيانات بعد
}

// معالجة إرسال النموذج
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $csrfToken = $_POST['csrf_token'] ?? '';

    // التحقق من رمز CSRF
    if (!verifyCsrfToken($csrfToken)) {
        $error = 'انتهت صلاحية الجلسة، يرجى إعادة المحاولة.';
    } elseif (empty($username) || empty($password)) {
        $error = 'يرجى إدخال اسم المستخدم وكلمة المرور.';
    } else {
        try {
            // استعلام آمن عبر Prepared Statement
            $stmt = $pdo->prepare("
                SELECT id, username, password, full_name, role 
                FROM users 
                WHERE username = :username 
                LIMIT 1
            ");
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password'])) {
                // تحديث تاريخ آخر دخول
                $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
                $updateStmt->execute([':id' => $user['id']]);

                // تسجيل الحدث في سجل التدقيق
                logAuditEvent($pdo, (int)$user['id'], 'LOGIN', 'users', (int)$user['id'], null, [
                    'username' => $user['username'],
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
                ]);

                // بدء جلسة المستخدم
                loginUser($user);

                // التحقق من وجهة التحويل لمنع هجمات Open Redirect
                $target = (filter_var($redirect, FILTER_VALIDATE_URL) === false && substr($redirect, 0, 2) !== '//') 
                    ? $redirect 
                    : 'index.php';

                header('Location: ' . $target);
                exit;
            } else {
                $error = 'اسم المستخدم أو كلمة المرور غير صحيحة.';

                // تسجيل محاولة الفشل
                logAuditEvent($pdo, null, 'LOGIN_FAILED', 'users', null, null, [
                    'attempted_username' => $username,
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
                ]);
            }
        } catch (Throwable $e) {
            error_log('Login Error: ' . $e->getMessage());
            $error = 'حدث خطأ في النظام، يرجى المحاولة لاحقاً.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسجيل الدخول — <?= e($companyName) ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Cairo', sans-serif;
            background-color: #0f172a;
            color: #334155;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }
        .login-card {
            background: #ffffff;
            border-radius: 1.25rem;
            max-width: 440px;
            width: 100%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
            overflow: hidden;
            border: 1px solid #334155;
        }
        .login-header {
            background: #1e293b;
            color: #ffffff;
            padding: 2.25rem 2rem;
            text-align: center;
            border-bottom: 3px solid #2563eb;
        }
        .brand-icon {
            width: 54px;
            height: 54px;
            background: #2563eb;
            color: #ffffff;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.6rem;
            margin-bottom: 0.85rem;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }
        .form-control {
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            border-color: #cbd5e1;
        }
        .form-control:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.15);
        }
        .btn-submit {
            background: #2563eb;
            border-color: #2563eb;
            border-radius: 0.5rem;
            padding: 0.8rem;
            font-weight: 700;
            font-size: 1.05rem;
        }
        .btn-submit:hover {
            background: #1d4ed8;
            border-color: #1d4ed8;
        }
    </style>
</head>
<body>

<div class="login-card">
    <div class="login-header">
        <div class="brand-icon">
            <span>💼</span>
        </div>
        <h4 class="fw-bold mb-1"><?= e($companyName) ?></h4>
        <p class="text-slate-400 small mb-0">نظام إدارة الرواتب وشؤون الموظفين</p>
    </div>

    <div class="p-4 p-md-4">
        <?php if (!empty($error)): ?>
            <div class="alert alert-danger d-flex align-items-center mb-4 py-2" role="alert">
                <span class="me-2">⚠️</span>
                <div class="small fw-semibold"><?= e($error) ?></div>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <?= csrfField() ?>

            <div class="mb-3">
                <label class="form-label small fw-bold text-slate-700">اسم المستخدم</label>
                <div class="input-group">
                    <input type="text" 
                           name="username" 
                           class="form-control" 
                           placeholder="أدخل اسم المستخدم" 
                           value="<?= e($_POST['username'] ?? '') ?>" 
                           autocomplete="username" 
                           required 
                           autofocus>
                </div>
            </div>

            <div class="mb-4">
                <label class="form-label small fw-bold text-slate-700">كلمة المرور</label>
                <input type="password" 
                       name="password" 
                       class="form-control" 
                       placeholder="••••••••" 
                       autocomplete="current-password" 
                       required>
            </div>

            <div class="d-grid mb-3">
                <button type="submit" class="btn btn-primary btn-submit">
                    تسجيل الدخول إلى النظام
                </button>
            </div>

            <div class="text-center">
                <span class="badge bg-light text-muted border px-3 py-1 small">
                    جلسة مشفرة محمية بـ CSRF &bull; د.ك KWD
                </span>
            </div>
        </form>
    </div>

    <div class="bg-light px-4 py-3 border-top text-center small text-muted">
        المرحلة 1: سكربت التنصيب وجلسات تسجيل الدخول &bull; Hostinger PHP 8.2
    </div>
</div>

</body>
</html>
