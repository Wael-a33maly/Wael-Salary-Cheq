<?php
/**
 * تقرير التحويلات البنكية والنقدية — المرحلة 4 (تقرير 4)
 * إجمالي التحويلات مجمعة باسم كل بنك + إجمالي النقد السائل المطلوب صرفه
 */

declare(strict_types=1);

$pageTitle = 'تقرير التحويلات البنكية والنقدية';
$activeNav = 'reports';

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';

requireAuth();

$pdo = getDbConnection();
$companySettings = getCompanySettings($pdo);

$currentMonth = (int)date('n');
$currentYear = (int)date('Y');
$month = isset($_GET['month']) ? (int)$_GET['month'] : $currentMonth;
$year = isset($_GET['year']) ? (int)$_GET['year'] : $currentYear;

// 1. جلب تحويلات البنوك مجمعة بالبنك
$bankStmt = $pdo->prepare("
    SELECT e.bank_name, COUNT(*) AS emp_count, SUM(p.bank_amount) AS total_amount
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    WHERE p.month = :m AND p.year = :y AND p.bank_amount > 0
    GROUP BY e.bank_name
    ORDER BY total_amount DESC
");
$bankStmt->execute([':m' => $month, ':y' => $year]);
$bankGroups = $bankStmt->fetchAll(PDO::FETCH_ASSOC);

// 2. جلب إجمالي النقدي المطلوب
$cashStmt = $pdo->prepare("
    SELECT COUNT(*) AS total_cash_employees, 
           SUM(p.final_cash) AS total_final_cash,
           SUM(p.raw_cash) AS total_raw_cash,
           SUM(p.rounding_diff) AS total_rounding_diff
    FROM payslips p
    WHERE p.month = :m AND p.year = :y AND p.final_cash > 0
");
$cashStmt->execute([':m' => $month, ':y' => $year]);
$cashSummary = $cashStmt->fetch(PDO::FETCH_ASSOC);

// 3. جلب تفاصيل كل موظفي التحويل البنكي
$empBankStmt = $pdo->prepare("
    SELECT p.bank_amount, e.civil_id, e.name AS emp_name, e.bank_name, e.iban, b.name AS branch_name
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    JOIN branches b ON b.id = e.branch_id
    WHERE p.month = :m AND p.year = :y AND p.bank_amount > 0
    ORDER BY e.bank_name ASC, e.name ASC
");
$empBankStmt->execute([':m' => $month, ':y' => $year]);
$empBankRows = $empBankStmt->fetchAll(PDO::FETCH_ASSOC);

$totalBankAmount = array_sum(array_column($bankGroups, 'total_amount'));

require_once __DIR__ . '/../core/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 no-print">
    <div>
        <h3 class="fw-bold mb-1">🏦 تقرير التحويلات البنكية والنقدية</h3>
        <p class="text-muted small mb-0">بيان مسيرات التحويل للبنوك المحلية وإجمالي النقد المطلوب توفيره في الخزينة</p>
    </div>
    <div class="d-flex gap-2">
        <a href="export.php?type=banking&month=<?= $month ?>&year=<?= $year ?>" class="btn btn-outline-success btn-sm fw-bold">
            📥 تصدير كشف البنك Excel
        </a>
        <button onclick="window.print()" class="btn btn-primary btn-sm fw-bold">
            🖨️ طباعة التقرير
        </button>
    </div>
</div>

<div class="card p-3 mb-4 no-print">
    <form method="GET" class="row g-2 align-items-center">
        <div class="col-md-5">
            <select name="month" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php for ($m = 1; $m <= 12; $m++): ?>
                    <option value="<?= $m ?>" <?= $month === $m ? 'selected' : '' ?>>شهر <?= $m ?> — <?= date('F', mktime(0, 0, 0, $m, 1)) ?></option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-md-5">
            <select name="year" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php for ($y = $currentYear - 2; $y <= $currentYear + 1; $y++): ?>
                    <option value="<?= $y ?>" <?= $year === $y ? 'selected' : '' ?>><?= $y ?></option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-md-2">
            <button type="submit" class="btn btn-dark btn-sm w-100">عرض</button>
        </div>
    </form>
</div>

<!-- بطاقات الملخص -->
<div class="row g-4 mb-4">
    <div class="col-md-6">
        <div class="card p-4 border-primary border-2 bg-primary-subtle">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold text-primary">إجمالي التحويلات البنكية المطلوبة:</span>
                <span class="fs-4">🏦</span>
            </div>
            <div class="fs-2 fw-bold font-mono text-primary">
                <?= formatKWD($totalBankAmount) ?>
            </div>
            <div class="small text-muted mt-1">
                لعدد <strong><?= count($empBankRows) ?></strong> موظف محول على البنوك
            </div>
        </div>
    </div>

    <div class="col-md-6">
        <div class="card p-4 border-success border-2 bg-success-subtle">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold text-success">إجمالي النقد السائل المطلوب سحبه (Cash):</span>
                <span class="fs-4">💵</span>
            </div>
            <div class="fs-2 fw-bold font-mono text-success">
                <?= formatKWD($cashSummary['total_final_cash'] ?? 0) ?>
            </div>
            <div class="small text-muted mt-1">
                مقرب للأسفل لأقرب 0.050 د.ك لصالح الخزينة
            </div>
        </div>
    </div>
</div>

<div class="card p-4">
    <h5 class="fw-bold mb-3">1. ملخص المبالغ حسب البنك:</h5>
    <div class="table-responsive mb-4">
        <table class="table table-bordered table-hover align-middle mb-0">
            <thead class="table-light small">
                <tr>
                    <th>اسم البنك</th>
                    <th class="text-center">عدد الموظفين المحول لهم</th>
                    <th class="text-end">إجمالي المبلغ المحول (د.ك)</th>
                </tr>
            </thead>
            <tbody class="font-mono">
                <?php if (empty($bankGroups)): ?>
                    <tr><td colspan="3" class="text-center py-3 font-sans text-muted">لا توجد تحويلات بنكية لهذا الشهر</td></tr>
                <?php else: ?>
                    <?php foreach ($bankGroups as $bg): ?>
                        <tr>
                            <td class="font-sans fw-bold">🏦 <?= e($bg['bank_name'] ?: 'بنك غير محدد') ?></td>
                            <td class="text-center font-sans"><?= (int)$bg['emp_count'] ?> موظف</td>
                            <td class="text-end fw-bold text-primary"><?= number_format((float)$bg['total_amount'], 3) ?> د.ك</td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
            <tfoot class="table-dark font-mono">
                <tr>
                    <td class="font-sans fw-bold">إجمالي كافة البنوك:</td>
                    <td class="text-center font-sans"><?= count($empBankRows) ?> موظف</td>
                    <td class="text-end fw-bold text-warning"><?= number_format($totalBankAmount, 3) ?> د.ك</td>
                </tr>
            </tfoot>
        </table>
    </div>

    <h5 class="fw-bold mb-3 mt-4">2. كشف أسماء الموظفين وأرقام الآيبان للتحويل:</h5>
    <div class="table-responsive">
        <table class="table table-sm table-bordered align-middle mb-0" style="font-size: 0.8rem;">
            <thead class="table-light text-center">
                <tr>
                    <th>#</th>
                    <th>الرقم المدني</th>
                    <th class="text-start">اسم الموظف</th>
                    <th>الفرع</th>
                    <th>اسم البنك</th>
                    <th>رقم الآيبان (IBAN)</th>
                    <th class="text-end">المبلغ (د.ك)</th>
                </tr>
            </thead>
            <tbody class="font-mono">
                <?php if (empty($empBankRows)): ?>
                    <tr><td colspan="7" class="text-center py-3 font-sans text-muted">لا يوجد موظفون محول لهم بنكياً</td></tr>
                <?php else: ?>
                    <?php foreach ($empBankRows as $idx => $er): ?>
                        <tr>
                            <td class="text-center font-sans"><?= $idx + 1 ?></td>
                            <td class="text-center"><?= e($er['civil_id']) ?></td>
                            <td class="text-start font-sans fw-bold"><?= e($er['emp_name']) ?></td>
                            <td class="text-center font-sans text-muted"><?= e($er['branch_name']) ?></td>
                            <td class="text-center font-sans"><?= e($er['bank_name'] ?: '—') ?></td>
                            <td class="text-center text-muted"><?= e($er['iban'] ?: '—') ?></td>
                            <td class="text-end fw-bold text-primary"><?= number_format((float)$er['bank_amount'], 3) ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once __DIR__ . '/../core/footer.php'; ?>
