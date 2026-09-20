<?php
/**
 * إعدادات النظام والشركة — النواة المشتركة
 * اسم الشركة، الشعار، العنوان، الهاتف، معامل الإضافي، أيام تنبيه الإقامة، وخطوة التقريب
 */

declare(strict_types=1);

$pageTitle = 'إعدادات النظام والشركة';
$activeNav = 'settings';

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/audit.php';
require_once __DIR__ . '/helpers.php';

requireAuth();

$pdo = getDbConnection();
$currentUser = getCurrentUser();
$errorMsg = '';
$successMsg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();

    $companyName = trim($_POST['company_name'] ?? '');
    $companyAddress = trim($_POST['company_address'] ?? '');
    $companyPhone = trim($_POST['company_phone'] ?? '');
    $overtimeMultiplier = (float)($_POST['overtime_multiplier'] ?? 1.25);
    $residencyAlertDays = max(1, (int)($_POST['residency_alert_days'] ?? 60));
    $roundingStep = (float)($_POST['rounding_step'] ?? 0.050);

    if (empty($companyName)) {
        $errorMsg = 'اسم الشركة إلزامي.';
    } elseif ($overtimeMultiplier <= 0) {
        $errorMsg = 'معامل الإضافي يجب أن يكون أكبر من الصفر.';
    } else {
        try {
            $oldSettings = getCompanySettings($pdo);
            $logoPath = $oldSettings['logo_path'];

            // معالجة رفع الشعار إن وجد
            if (isset($_FILES['company_logo']) && $_FILES['company_logo']['error'] === UPLOAD_ERR_OK) {
                $fileTmp = $_FILES['company_logo']['tmp_name'];
                $fileName = $_FILES['company_logo']['name'];
                $fileSize = $_FILES['company_logo']['size'];
                $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

                $allowed = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
                if (!in_array($ext, $allowed, true)) {
                    $errorMsg = 'صيغة الشعار غير مسموحة. يرجى رفع صورة بصيغة (PNG, JPG, WEBP, SVG).';
                } elseif ($fileSize > 2 * 1024 * 1024) {
                    $errorMsg = 'حجم الشعار كبير جداً. الحد الأقصى المسموح هو 2 ميغابايت.';
                } else {
                    $uploadDir = dirname(__DIR__) . '/uploads/logos';
                    if (!is_dir($uploadDir)) {
                        mkdir($uploadDir, 0755, true);
                    }
                    $newLogoName = 'logo_' . time() . '.' . $ext;
                    $targetPath = $uploadDir . '/' . $newLogoName;
                    if (move_uploaded_file($fileTmp, $targetPath)) {
                        $logoPath = 'uploads/logos/' . $newLogoName;
                    }
                }
            }

            if (empty($errorMsg)) {
                $stmt = $pdo->prepare("
                    UPDATE settings SET 
                        company_name = :c_name,
                        logo_path = :logo,
                        company_address = :c_addr,
                        company_phone = :c_phone,
                        overtime_multiplier = :ot_mult,
                        residency_alert_days = :res_days,
                        currency = 'KWD',
                        rounding_step = :round_step
                    WHERE id = 1
                ");
                $stmt->execute([
                    ':c_name'     => $companyName,
                    ':logo'       => $logoPath,
                    ':c_addr'     => $companyAddress,
                    ':c_phone'    => $companyPhone,
                    ':ot_mult'    => $overtimeMultiplier,
                    ':res_days'   => $residencyAlertDays,
                    ':round_step' => $roundingStep,
                ]);

                logAuditEvent($pdo, $currentUser['id'], 'SETTINGS_UPDATE', 'settings', 1, $oldSettings, [
                    'company_name' => $companyName,
                    'overtime_multiplier' => $overtimeMultiplier,
                    'residency_alert_days' => $residencyAlertDays,
                ]);

                $successMsg = 'تم حفظ إعدادات النظام بنجاح.';
            }
        } catch (Throwable $e) {
            $errorMsg = 'خطأ أثناء حفظ الإعدادات: ' . $e->getMessage();
        }
    }
}

$settings = getCompanySettings($pdo);
require_once __DIR__ . '/header.php';
?>

<div class="mb-4">
    <h3 class="fw-bold mb-1">⚙️ إعدادات النظام والشركة</h3>
    <p class="text-muted small mb-0">تخصيص هوية المنشأة، المعاملات الحسابية للرواتب، ومهلة تنبيه الإقامات</p>
</div>

<?php if (!empty($errorMsg)): ?>
    <div class="alert alert-danger alert-dismissible fade show small fw-bold" role="alert">
        ⚠️ <?= e($errorMsg) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
    </div>
<?php endif; ?>

<?php if (!empty($successMsg)): ?>
    <div class="alert alert-success alert-dismissible fade show small fw-bold" role="alert">
        ✓ <?= e($successMsg) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
    </div>
<?php endif; ?>

<div class="card p-4">
    <form method="POST" enctype="multipart/form-data">
        <?= csrfField() ?>

        <div class="row g-4">
            <!-- هوية الشركة والشعار -->
            <div class="col-lg-6 border-end-lg">
                <h5 class="fw-bold text-primary mb-3">🏢 هوية المنشأة والترويسة</h5>

                <div class="mb-3">
                    <label class="form-label small fw-bold">اسم الشركة أو المؤسسة <span class="text-danger">*</span></label>
                    <input type="text" name="company_name" class="form-control" required value="<?= e($settings['company_name']) ?>" placeholder="اسم الشركة الرسمي">
                    <span class="form-text small">يظهر في أعلى كل قسائم الرواتب والتقارير المطبوعة</span>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold">شعار الشركة (Logo)</label>
                    <div class="d-flex align-items-center gap-3">
                        <?php if (!empty($settings['logo_path']) && file_exists(__DIR__ . '/../' . $settings['logo_path'])): ?>
                            <img src="../<?= e($settings['logo_path']) ?>" alt="Logo" class="rounded border p-1 bg-white" style="max-height: 50px;">
                        <?php endif; ?>
                        <input type="file" name="company_logo" class="form-control form-control-sm" accept="image/*">
                    </div>
                    <span class="form-text small">يُفضل ملف شفاف PNG أو WEBP بحد أقصى 2MB</span>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold">عنوان الشركة (الكويت)</label>
                    <input type="text" name="company_address" class="form-control" value="<?= e($settings['company_address'] ?? '') ?>" placeholder="المنطقة، الشارع، المبنى">
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold">هاتف التواصل</label>
                    <input type="text" name="company_phone" class="form-control" value="<?= e($settings['company_phone'] ?? '') ?>" placeholder="+965 XXXXXXXX">
                </div>
            </div>

            <!-- إعدادات الرواتب والإقامات -->
            <div class="col-lg-6">
                <h5 class="fw-bold text-primary mb-3">📊 المعاملات المالية وقواعد الحساب</h5>

                <div class="mb-3">
                    <label class="form-label small fw-bold">معامل ساعة العمل الإضافي (Multiplier) <span class="text-danger">*</span></label>
                    <div class="input-group">
                        <span class="input-group-text font-mono">&times;</span>
                        <input type="number" step="0.05" min="1.00" max="3.00" name="overtime_multiplier" class="form-control font-mono" required value="<?= (float)$settings['overtime_multiplier'] ?>">
                    </div>
                    <span class="form-text small">المعدل القياسي في الكويت هو 1.25 (يُضرب في قيمة ساعة الموظف)</span>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold">أيام التنبيه المبكر لانتهاء الإقامة (بالأيام) <span class="text-danger">*</span></label>
                    <div class="input-group">
                        <input type="number" min="7" max="180" name="residency_alert_days" class="form-control font-mono" required value="<?= (int)$settings['residency_alert_days'] ?>">
                        <span class="input-group-text">يوماً قبل الانتهاء</span>
                    </div>
                    <span class="form-text small">تظهر شارة تنبيهية في الهيدر والداشبورد عند بقاء هذه المدة أو أقل</span>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold">العملة الرسمية للنظام</label>
                    <input type="text" class="form-control font-mono bg-light" value="الدينار الكويتي (KWD) — 3 خانات عشرية" readonly>
                    <span class="form-text small">النظام مصمم خصيصاً للدينار الكويتي والتقريب بالفلس</span>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold">خطوة تقريب النقدي للأسفل (KWD Step)</label>
                    <input type="number" step="0.005" name="rounding_step" class="form-control font-mono" value="<?= (float)$settings['rounding_step'] ?>" readonly>
                    <span class="form-text small">ثابت: 0.050 د.ك (50 فلساً) للأسفل لصالح الشركة</span>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold">أيام العمل الافتراضية في الشهر</label>
                    <input type="text" class="form-control bg-light" value="حسب أيام الشهر الفعلية (28 أو 29 أو 30 أو 31)" readonly>
                    <span class="form-text small">يتم احتساب قيمة اليوم بدقة حسب تقويم الشهر الفعلي</span>
                </div>
            </div>
        </div>

        <div class="mt-4 pt-3 border-top d-flex justify-content-end">
            <button type="submit" class="btn btn-primary fw-bold px-4">
                💾 حفظ كافة الإعدادات
            </button>
        </div>
    </form>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
