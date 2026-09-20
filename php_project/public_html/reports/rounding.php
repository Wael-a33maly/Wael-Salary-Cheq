<?php
/**
 * تقرير فروق التقريب (لصالح الشركة) — المرحلة 4 (تقرير 5)
 * حصر مبالغ الفلس المقربة للأسفل (أقرب 0.050 د.ك) لكل موظف وإجمالي الوفر المالي للشركة
 */

declare(strict_types=1);

$pageTitle = 'تقرير فروق التقريب لصالح الشركة';
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

$stmt = $pdo->prepare("
    SELECT p.id, p.raw_cash, p.final_cash, p.rounding_diff, p.net_salary, p.bank_amount,
           e.civil_id, e.name AS emp_name, b.name AS branch_name, d.name AS dept_name
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    JOIN branches b ON b.id = e.branch_id
    JOIN departments d ON d.id = e.department_id
    WHERE p.month = :m AND p.year = :y AND p.rounding_diff > 0
    ORDER BY p.rounding_diff DESC, e.name ASC
");
$stmt->execute([':m' => $month, ':y' => $year]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$totalRoundingDiff = array_sum(array_column($rows, 'rounding_diff'));
$totalRawCash = array_sum(array_column($rows, 'raw_cash'));
$totalFinalCash = array_sum(array_column($rows, 'final_cash'));

require_once __DIR__ . '/../core/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 no-print">
    <div>
        <h3 class="fw-bold mb-1">🪙 تقرير فروق التقريب النقدي (لصالح الشركة)</h3>
        <p class="text-muted small mb-0">بيان تفصيلي بالمبالغ الناتجة عن قاعدة تقريب النقدي للأسفل (أقرب 0.050 د.ك / 50 فلساً)</p>
    </div>
    <div class="d-flex gap-2">
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

<!-- بطاقة الوفر الإجمالي -->
<div class="card p-4 mb-4 border-warning border-2 bg-warning-subtle">
    <div class="row align-items-center">
        <div class="col-md-8">
            <h5 class="fw-bold text-dark mb-1">إجمالي وفر فروق التقريب لشهر (<?= $month ?> / <?= $year ?>):</h5>
            <p class="text-muted small mb-0">
                يتم احتساب النقد المسلم للموظف مقرباً للأسفل لصالح الشركة (Floor to 0.050 KWD)، ويبقى الفارق في حسابات المنشأة.
            </p>
        </div>
        <div class="col-md-4 text-md-end mt-3 mt-md-0">
            <div class="fs-1 fw-bold font-mono text-dark">
                <?= formatKWD($totalRoundingDiff) ?>
            </div>
            <div class="badge bg-warning text-dark font-mono">من أصل <?= count($rows) ?> عملية تقريب</div>
        </div>
    </div>
</div>

<div class="card p-4">
    <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0 text-center" style="font-size: 0.85rem;">
            <thead class="table-light">
                <tr>
                    <th>#</th>
                    <th>الرقم المدني</th>
                    <th class="text-start">اسم الموظف</th>
                    <th>الفرع</th>
                    <th>القسم</th>
                    <th>النقدي الخام (د.ك)</th>
                    <th class="bg-success-subtle">النقدي المسلم (0.050)</th>
                    <th class="bg-warning-subtle fw-bold text-dark">فرق التقريب (لصالح الشركة)</th>
                </tr>
            </thead>
            <tbody class="font-mono">
                <?php if (empty($rows)): ?>
                    <tr>
                        <td colspan="8" class="py-4 font-sans text-muted">لا توجد فروق تقريب مسجلة في هذا الشهر (أو لم يتم احتساب الرواتب بعد)</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($rows as $idx => $r): ?>
                        <tr>
                            <td class="font-sans"><?= $idx + 1 ?></td>
                            <td><?= e($r['civil_id']) ?></td>
                            <td class="text-start font-sans fw-bold"><?= e($r['emp_name']) ?></td>
                            <td class="font-sans text-muted"><?= e($r['branch_name']) ?></td>
                            <td class="font-sans text-muted"><?= e($r['dept_name']) ?></td>
                            <td><?= number_format((float)$r['raw_cash'], 3) ?></td>
                            <td class="text-success fw-bold"><?= number_format((float)$r['final_cash'], 3) ?></td>
                            <td class="fw-bold text-dark bg-warning-subtle"><?= number_format((float)$r['rounding_diff'], 3) ?> د.ك</td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
            <tfoot class="table-dark font-mono">
                <tr>
                    <td colspan="5" class="font-sans text-start fw-bold">الإجمالي العام:</td>
                    <td><?= number_format($totalRawCash, 3) ?> د.ك</td>
                    <td class="text-success fw-bold"><?= number_format($totalFinalCash, 3) ?> د.ك</td>
                    <td class="text-warning fw-bold fs-6"><?= number_format($totalRoundingDiff, 3) ?> د.ك</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>

<?php require_once __DIR__ . '/../core/footer.php'; ?>
