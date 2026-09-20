<?php
/**
 * التقرير المجمع للرواتب — كل الفروع (المرحلة 4 - تقرير 3)
 * جدول شامل مجمع لكل فروع الشركة + مجموع كل فرع + الإجمالي العام + تصدير وطباعة
 */

declare(strict_types=1);

$pageTitle = 'التقرير المجمع للرواتب (كل الفروع)';
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
$autoPrint = !empty($_GET['auto_print']);

// جلب قسائم الرواتب المحسوبة للشهر المحدد مرتبة حسب الفرع
$stmt = $pdo->prepare("
    SELECT p.*, e.civil_id, e.name AS emp_name, e.job_title, b.id AS branch_id, b.name AS branch_name, b.code AS branch_code, d.name AS dept_name
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    JOIN branches b ON b.id = e.branch_id
    JOIN departments d ON d.id = e.department_id
    WHERE p.month = :m AND p.year = :y
    ORDER BY b.name ASC, e.name ASC
");
$stmt->execute([':m' => $month, ':y' => $year]);
$allSlips = $stmt->fetchAll(PDO::FETCH_ASSOC);

// تجميع البيانات حسب الفرع
$branchGroups = [];
$grandTotals = [
    'basic' => 0.0, 'abs_days_ded' => 0.0, 'abs_hours_ded' => 0.0,
    'salary_after_ded' => 0.0, 'ot_amount' => 0.0, 'advance' => 0.0,
    'net' => 0.0, 'bank' => 0.0, 'raw_cash' => 0.0, 'final_cash' => 0.0, 'round_diff' => 0.0
];

foreach ($allSlips as $slip) {
    $bId = (int)$slip['branch_id'];
    if (!isset($branchGroups[$bId])) {
        $branchGroups[$bId] = [
            'name' => $slip['branch_name'],
            'code' => $slip['branch_code'],
            'rows' => [],
            'totals' => [
                'basic' => 0.0, 'abs_days_ded' => 0.0, 'abs_hours_ded' => 0.0,
                'salary_after_ded' => 0.0, 'ot_amount' => 0.0, 'advance' => 0.0,
                'net' => 0.0, 'bank' => 0.0, 'raw_cash' => 0.0, 'final_cash' => 0.0, 'round_diff' => 0.0
            ]
        ];
    }
    $branchGroups[$bId]['rows'][] = $slip;

    // تجميع الفرع
    $branchGroups[$bId]['totals']['basic'] += (float)$slip['basic_salary'];
    $branchGroups[$bId]['totals']['abs_days_ded'] += (float)$slip['absent_days_deduction'];
    $branchGroups[$bId]['totals']['abs_hours_ded'] += (float)$slip['absent_hours_deduction'];
    $branchGroups[$bId]['totals']['salary_after_ded'] += (float)$slip['salary_after_deductions'];
    $branchGroups[$bId]['totals']['ot_amount'] += (float)$slip['overtime_amount'];
    $branchGroups[$bId]['totals']['advance'] += (float)$slip['advance_deduction'];
    $branchGroups[$bId]['totals']['net'] += (float)$slip['net_salary'];
    $branchGroups[$bId]['totals']['bank'] += (float)$slip['bank_amount'];
    $branchGroups[$bId]['totals']['raw_cash'] += (float)$slip['raw_cash'];
    $branchGroups[$bId]['totals']['final_cash'] += (float)$slip['final_cash'];
    $branchGroups[$bId]['totals']['round_diff'] += (float)$slip['rounding_diff'];

    // التجميع العام
    $grandTotals['basic'] += (float)$slip['basic_salary'];
    $grandTotals['abs_days_ded'] += (float)$slip['absent_days_deduction'];
    $grandTotals['abs_hours_ded'] += (float)$slip['absent_hours_deduction'];
    $grandTotals['salary_after_ded'] += (float)$slip['salary_after_deductions'];
    $grandTotals['ot_amount'] += (float)$slip['overtime_amount'];
    $grandTotals['advance'] += (float)$slip['advance_deduction'];
    $grandTotals['net'] += (float)$slip['net_salary'];
    $grandTotals['bank'] += (float)$slip['bank_amount'];
    $grandTotals['raw_cash'] += (float)$slip['raw_cash'];
    $grandTotals['final_cash'] += (float)$slip['final_cash'];
    $grandTotals['round_diff'] += (float)$slip['rounding_diff'];
}

require_once __DIR__ . '/../core/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 no-print">
    <div>
        <h3 class="fw-bold mb-1">📊 التقرير المجمع للرواتب (كل الفروع)</h3>
        <p class="text-muted small mb-0">كشف مالي موحد شامل لجميع الفروع مع مجاميع كل فرع والإجمالي العام (KWD)</p>
    </div>
    <div class="d-flex gap-2">
        <a href="export.php?type=aggregated&month=<?= $month ?>&year=<?= $year ?>" class="btn btn-outline-success btn-sm fw-bold">
            📥 تصدير Excel (XLSX/CSV)
        </a>
        <button onclick="window.print()" class="btn btn-primary btn-sm fw-bold">
            🖨️ طباعة التقرير الرسمي
        </button>
    </div>
</div>

<!-- اختيار الشهر والسنة -->
<div class="card p-3 mb-4 no-print">
    <form method="GET" class="row g-2 align-items-center">
        <div class="col-md-4">
            <select name="month" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php for ($m = 1; $m <= 12; $m++): ?>
                    <option value="<?= $m ?>" <?= $month === $m ? 'selected' : '' ?>>شهر <?= $m ?> — <?= date('F', mktime(0, 0, 0, $m, 1)) ?></option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-md-4">
            <select name="year" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php for ($y = $currentYear - 2; $y <= $currentYear + 1; $y++): ?>
                    <option value="<?= $y ?>" <?= $year === $y ? 'selected' : '' ?>><?= $y ?></option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-md-4">
            <button type="submit" class="btn btn-dark btn-sm w-100">عرض الكشف</button>
        </div>
    </form>
</div>

<!-- كشف الطباعة والجدول المجمع -->
<div class="card p-4">
    <!-- الترويسة المطبوعة -->
    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div class="d-flex align-items-center gap-3">
            <?php if (!empty($companySettings['logo_path']) && file_exists(__DIR__ . '/../' . $companySettings['logo_path'])): ?>
                <img src="../<?= e($companySettings['logo_path']) ?>" alt="Logo" height="50" class="rounded">
            <?php endif; ?>
            <div>
                <h4 class="fw-bold mb-0"><?= e($companySettings['company_name']) ?></h4>
                <div class="text-muted small">كشف الرواتب المالي المجمع — شهر <?= $month ?> / <?= $year ?></div>
            </div>
        </div>
        <div class="text-start">
            <span class="badge bg-dark fs-6 px-3 py-1 font-mono">العملة: دينار كويتي (KWD)</span>
            <div class="text-muted small mt-1">تاريخ الاستخراج: <?= date('Y-m-d H:i') ?></div>
        </div>
    </div>

    <?php if (empty($branchGroups)): ?>
        <div class="alert alert-info text-center py-4 my-3">
            لا توجد قسائم رواتب محفوظة أو محسوبة لشهر (<?= $month ?> / <?= $year ?>) حتى الآن.
            <div class="mt-2">
                <a href="../modules/payroll/index.php?month=<?= $month ?>&year=<?= $year ?>" class="btn btn-primary btn-sm">
                    الانتقال لشاشة الرواتب الشهرية لاحتساب هذا الشهر
                </a>
            </div>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="table table-bordered table-sm align-middle text-center mb-0" style="font-size: 0.78rem;">
                <thead class="table-dark">
                    <tr>
                        <th>الرقم المدني</th>
                        <th class="text-start">اسم الموظف / الوظيفة</th>
                        <th>القسم</th>
                        <th>الأساسي (د.ك)</th>
                        <th>خصم الغياب</th>
                        <th>بعد الخصم</th>
                        <th>الإضافي</th>
                        <th>السلفة</th>
                        <th class="bg-primary text-white">الصافي</th>
                        <th>البنكي</th>
                        <th>النقدي الخام</th>
                        <th class="bg-success text-white">النقدي (0.050)</th>
                        <th>فرق التقريب</th>
                    </tr>
                </thead>
                <tbody class="font-mono">
                    <?php foreach ($branchGroups as $bId => $bg): ?>
                        <!-- سطر عنوان الفرع -->
                        <tr class="table-secondary fw-bold text-start font-sans">
                            <td colspan="13" class="py-2">
                                🏢 فرع: <?= e($bg['name']) ?> (<?= e($bg['code']) ?>) &bull; عدد الموظفين: <?= count($bg['rows']) ?>
                            </td>
                        </tr>

                        <?php foreach ($bg['rows'] as $row): ?>
                            <tr>
                                <td><?= e($row['civil_id']) ?></td>
                                <td class="text-start font-sans">
                                    <span class="fw-bold"><?= e($row['emp_name']) ?></span>
                                    <div class="text-muted text-[10px]"><?= e($row['job_title']) ?></div>
                                </td>
                                <td class="font-sans text-muted"><?= e($row['dept_name']) ?></td>
                                <td><?= number_format((float)$row['basic_salary'], 3) ?></td>
                                <td class="text-danger"><?= number_format((float)($row['absent_days_deduction'] + $row['absent_hours_deduction']), 3) ?></td>
                                <td><?= number_format((float)$row['salary_after_deductions'], 3) ?></td>
                                <td class="text-success"><?= number_format((float)$row['overtime_amount'], 3) ?></td>
                                <td class="text-danger"><?= number_format((float)$row['advance_deduction'], 3) ?></td>
                                <td class="fw-bold text-primary"><?= number_format((float)$row['net_salary'], 3) ?></td>
                                <td><?= number_format((float)$row['bank_amount'], 3) ?></td>
                                <td><?= number_format((float)$row['raw_cash'], 3) ?></td>
                                <td class="fw-bold text-success"><?= number_format((float)$row['final_cash'], 3) ?></td>
                                <td class="text-muted"><?= number_format((float)$row['rounding_diff'], 3) ?></td>
                            </tr>
                        <?php endforeach; ?>

                        <!-- مجموع الفرع -->
                        <tr class="table-light fw-bold">
                            <td colspan="3" class="font-sans text-start">مجموع فرع (<?= e($bg['name']) ?>):</td>
                            <td><?= number_format($bg['totals']['basic'], 3) ?></td>
                            <td class="text-danger"><?= number_format($bg['totals']['abs_days_ded'] + $bg['totals']['abs_hours_ded'], 3) ?></td>
                            <td><?= number_format($bg['totals']['salary_after_ded'], 3) ?></td>
                            <td class="text-success"><?= number_format($bg['totals']['ot_amount'], 3) ?></td>
                            <td class="text-danger"><?= number_format($bg['totals']['advance'], 3) ?></td>
                            <td class="text-primary"><?= number_format($bg['totals']['net'], 3) ?></td>
                            <td><?= number_format($bg['totals']['bank'], 3) ?></td>
                            <td><?= number_format($bg['totals']['raw_cash'], 3) ?></td>
                            <td class="text-success"><?= number_format($bg['totals']['final_cash'], 3) ?></td>
                            <td class="text-muted"><?= number_format($bg['totals']['round_diff'], 3) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
                <tfoot class="table-dark fw-bold font-mono">
                    <tr class="fs-6">
                        <td colspan="3" class="font-sans text-start">الإجمالي العام لكافة الفروع:</td>
                        <td><?= number_format($grandTotals['basic'], 3) ?></td>
                        <td class="text-danger"><?= number_format($grandTotals['abs_days_ded'] + $grandTotals['abs_hours_ded'], 3) ?></td>
                        <td><?= number_format($grandTotals['salary_after_ded'], 3) ?></td>
                        <td class="text-success"><?= number_format($grandTotals['ot_amount'], 3) ?></td>
                        <td class="text-danger"><?= number_format($grandTotals['advance'], 3) ?></td>
                        <td class="text-warning"><?= number_format($grandTotals['net'], 3) ?> د.ك</td>
                        <td><?= number_format($grandTotals['bank'], 3) ?> د.ك</td>
                        <td><?= number_format($grandTotals['raw_cash'], 3) ?> د.ك</td>
                        <td class="text-success"><?= number_format($grandTotals['final_cash'], 3) ?> د.ك</td>
                        <td class="text-info"><?= number_format($grandTotals['round_diff'], 3) ?> د.ك</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- التواقيع -->
        <div class="row text-center mt-5 pt-4 border-top">
            <div class="col-4">
                <p class="fw-bold mb-4 small">المحاسب المسؤول</p>
                <p class="text-muted small">....................................</p>
            </div>
            <div class="col-4">
                <p class="fw-bold mb-4 small">المدير المالي</p>
                <p class="text-muted small">....................................</p>
            </div>
            <div class="col-4">
                <p class="fw-bold mb-4 small">اعتماد المدير العام</p>
                <p class="text-muted small">....................................</p>
            </div>
        </div>
    <?php endif; ?>
</div>

<?php if ($autoPrint): ?>
<script>
window.addEventListener('load', () => {
    window.print();
});
</script>
<?php endif; ?>

<?php require_once __DIR__ . '/../core/footer.php'; ?>
