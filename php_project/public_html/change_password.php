<?php
/**
 * صفحة تغيير كلمة المرور للمستخدم الحالي
 */

declare(strict_types=1);

$pageTitle = 'تغيير كلمة المرور';
$activeNav = '';

$lockFile = __DIR__ . '/install/install.lock';
$configFile = __DIR__ . '/config/db.php';

if (!file_exists($configFile) || !file_exists($lockFile)) {
    header('Location: install/index.php');
    exit;
}

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/core/auth.php';
require_once __DIR__ . '/core/audit.php';
require_once __DIR__ . '/core/helpers.php';

requireAuth();

$pdo = getDbConnection();
$currentUser = getCurrentUser();
$errorMsg = '';
$successMsg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();

    $currentPass = $_POST['current_password'] ?? '';
    $newPass = $_POST['new_password'] ?? '';
    $confirmPass = $_POST['confirm_password'] ?? '';

    if (empty($currentPass) || empty($newPass) || empty($confirmPass)) {
        $errorMsg = 'جميع الحقول مطلوبة.';
    } elseif ($newPass !== $confirmPass) {
        $errorMsg = 'كلمة المرور الجديدة وتأكيدها غير متطابقين.';
    } elseif (strlen($newPass) < 6) {
        $errorMsg = 'يجب ألا تقل كلمة المرور الجديدة عن 6 خانات.';
    } else {
        try {
            $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = :id");
            $stmt->execute([':id' => $currentUser['id']]);
            $userRow = $stmt->fetch();

            if (!$userRow || !password_verify($currentPass, $userRow['password_hash'])) {
                $errorMsg = 'كلمة المرور الحالية غير صحيحة.';
            } else {
                $newHash = password_hash($newPass, PASSWORD_DEFAULT);
                $upd = $pdo->prepare("UPDATE users SET password_hash = :hash, is_default_password = 0 WHERE id = :id");
                $upd->execute([':hash' => $newHash, ':id' => $currentUser['id']]);

                // تحديث الجلسة
                if (isset($_SESSION['user'])) {
                    $_SESSION['user']['is_default_password'] = 0;
                }

                logAuditEvent($pdo, (int)$currentUser['id'], 'PASSWORD_CHANGE', 'users', (int)$currentUser['id'], null, [
                    'username' => $currentUser['username']
                ]);

                $successMsg = 'تم تغيير كلمة المرور بنجاح.';
            }
        } catch (Throwable $e) {
            $errorMsg = 'حدث خطأ أثناء تغيير كلمة المرور: ' . $e->getMessage();
        }
    }
}

require_once __DIR__ . '/core/header.php';
?>

<div class="row justify-content-center">
    <div class="col-md-6 col-lg-5">
        <div class="card shadow-sm border-0">
            <div class="card-header bg-primary text-white py-3">
                <h5 class="card-title mb-0 fw-bold">🔑 تغيير كلمة المرور</h5>
            </div>
            <div class="card-body p-4">
                <?php if (!empty($errorMsg)): ?>
                    <div class="alert alert-danger py-2 small mb-3"><?= e($errorMsg) ?></div>
                <?php endif; ?>
                <?php if (!empty($successMsg)): ?>
                    <div class="alert alert-success py-2 small mb-3"><?= e($successMsg) ?></div>
                <?php endif; ?>

                <form method="POST" action="">
                    <?= csrfField() ?>
                    <div class="mb-3">
                        <label class="form-label fw-bold small">كلمة المرور الحالية</label>
                        <input type="password" name="current_password" class="form-control" required autocomplete="current-password">
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold small">كلمة المرور الجديدة</label>
                        <input type="password" name="new_password" class="form-control" required minlength="6" autocomplete="new-password">
                        <div class="form-text text-muted small">6 خانات على الأقل.</div>
                    </div>
                    <div class="mb-4">
                        <label class="form-label fw-bold small">تأكيد كلمة المرور الجديدة</label>
                        <input type="password" name="confirm_password" class="form-control" required minlength="6" autocomplete="new-password">
                    </div>
                    <div class="d-flex justify-content-between">
                        <a href="index.php" class="btn btn-outline-secondary">إلغاء وعودة</a>
                        <button type="submit" class="btn btn-primary fw-bold px-4">حفظ كلمة المرور</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<?php
require_once __DIR__ . '/core/footer.php';
