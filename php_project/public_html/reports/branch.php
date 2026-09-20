<?php
/**
 * تقرير رواتب فرع محدد — المرحلة 4 (تقرير 2)
 * كشف رواتب شهري لفرع بعينه مع إجماليات الفرع في نهاية الجدول والطباعة والتصدير
 */

declare(strict_types=1);

$pageTitle = 'تقرير رواتب فرع محدد';
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
$branchId = isset($_GET['branch_id']) ? (int)$_GET['branch_id'] : 0;

$branches = $pdo->query("SELECT id, name, code FROM branches ORDER BY name ASC")->fetchAll();
if ($branchId === 0 && !empty($branches)) {
    $branchId = (int)$branches[0]['id'];
}

// جلب بيانات الفرع
$bStmt = $pdo->prepare("SELECT * FROM branches WHERE id = :id");
$bStmt->execute([':id' => $branchId]);
$branch = $bStmt->fetch();

// جلب قسائم الرواتب للفرع
$slips = [];
$totals = [
    'basic' => 0.0, 'abs_days_ded' => 0.0, 'abs_hours_ded' => 0.0,
    'salary_after_ded' => 0.0, 'ot_amount' => 0.0, 'advance' => 0.0,
    'net' => 0.0, 'bank' => 0.0, 'raw_cash' => 0.0, 'final_cash' => 0.0, 'round_diff' => 0.0
];

if ($branchId > 0) {
    $stmt = $pdo->prepare("
        SELECT p.*, e.civil_id, e.name AS emp_name, e.job_title, d.name AS dept_name
        FROM payslips p
        JOIN employees e ON e.id = p.employee_id
        JOIN departments d ON d.id = e.department_id
        WHERE p.month = :m AND p.year = :y AND e.branch_id = :b_id
        ORDER BY d.name ASC, e.name ASC
    ");
    $stmt->execute([':m' => $month, ':y' => $year, ':b_id' => $branchId]);
    $slips = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($slips as $s) {
        $totals['basic'] += (float)$s['basic_salary'];
        $totals['abs_days_ded'] += (float)$s['absent_days_deduction'];
        $totals['abs_hours_ded'] += (float)$s['absent_hours_deduction'];
        $totals['salary_after_ded'] += (float)$s['salary_after_deductions'];
        $totals['ot_amount'] += (float)$s['overtime_amount'];
        $totals['advance'] += (float)$s['advance_deduction'];
        $totals['net'] += (float)$s['net_salary'];
        $totals['bank'] += (float)$s['bank_amount'];
        $totals['raw_cash'] += (float)$s['raw_cash'];
        $totals['final_cash'] += (float)$s['final_cash'];
        $totals['round_diff'] += (float)$s['rounding_diff'];
    }
}

require_once __DIR__ . '/../core/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 no-print">
    <div>
        <h3 class="fw-bold mb-1">🏢 تقرير رواتب فرع: <?= e($branch['name'] ?? '—') ?></h3>
        <p class="text-muted small mb-0">كشف رواتب تفصيلي لفرع محدد مع إجماليات الفرع والطباعة والتصدير</p>
    </div>
    <div class="d-flex gap-2">
        <a href="export.php?type=branch&branch_id=<?= $branchId ?>&month=<?= $month ?>&year=<?= $year ?>" class="btn btn-outline-success btn-sm fw-bold">
            📥 تصدير Excel (CSV)
        </a>
        <button onclick="window.print()" class="btn btn-primary btn-sm fw-bold">
            🖨️ طباعة كشف الفرع
        </button>
    </div>
</div>

<div class="card p-3 mb-4 no-print">
    <form method="GET" class="row g-2 align-items-center">
        <div class="col-md-4">
            <label class="form-label small fw-bold mb-1">الفرع</label>
            <select name="branch_id" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php foreach ($branches as $b): ?>
                    <option value="<?= (int)$b['id'] ?>" <?= $branchId === (int)$b['id'] ? 'selected' : '' ?>>
                        <?= e($b['name']) ?> (<?= e($b['code']) ?>)
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label small fw-bold mb-1">الشهر</label>
            <select name="month" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php for ($m = 1; $m <= 12; $m++): ?>
                    <option value="<?= $m ?>" <?= $month === $m ? 'selected' : '' ?>>شهر <?= $m ?></option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label small fw-bold mb-1">السنة</label>
            <select name="year" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php for ($y = $currentYear - 2; $y <= $currentYear + 1; $y++): ?>
                    <option value="<?= $y ?>" <?= $year === $y ? 'selected' : '' ?>><?= $y ?></option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-md-2 d-flex align-items-end">
            <button type="submit" class="btn btn-dark btn-sm w-100">عرض</button>
        </div>
    </form>
</div>

<div class="card p-4">
    <!-- الترويسة المطبوعة -->
    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div class="d-flex align-items-center gap-3">
            <?php if (!empty($companySettings['logo_path']) && file_exists(__DIR__ . '/../' . $companySettings['logo_path'])): ?>
                <img src="../<?= e($companySettings['logo_path']) ?>" alt="Logo" height="50" class="rounded">
            <?php endif; ?>
            <div>
                <h4 class="fw-bold mb-0"><?= e($companySettings['company_name']) ?></h4>
                <div class="text-muted small">
                    كشف رواتب فرع: <strong><?= e($branch['name'] ?? '—') ?></strong> (<?= e($branch['code'] ?? '') ?>) &bull; شهر <?= $month ?> / <?= $year ?>
                </div>
            </div>
        </div>
        <div class="text-start">
            <span class="badge bg-primary fs-6 px-3 py-1 font-mono">العملة: دينار كويتي (KWD)</span>
        </div>
    </div>

    <?php if (empty($slips)): ?>
        <div class="alert alert-info text-center py-4 my-3">
            لا توجد قسائم رواتب مسجلة لهذا الفرع في شهر (<?= $month ?> / <?= $year ?>).
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="table table-bordered table-sm align-middle text-center mb-0" style="font-size: 0.8rem;">
                <thead class="table-dark">
                    <tr>
                        <th>الرقم المدني</th>
                        <th class="text-start">اسم الموظف</th>
                        <th>القسم</th>
                        <th>الأساسي</th>
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
                    <?php foreach ($slips as $s): ?>
                        <tr>
                            <td><?= e($s['civil_id']) ?></td>
                            <td class="text-start font-sans fw-bold"><?= e($s['emp_name']) ?></td>
                            <td class="font-sans text-muted"><?= e($s['dept_name']) ?></td>
                            <td><?= number_format((float)$s['basic_salary'], 3) ?></td>
                            <td class="text-danger"><?= number_format((float)($s['absent_days_deduction'] + $s['absent_hours_deduction']), 3) ?></td>
                            <td><?= number_format((float)$s['salary_after_deductions'], 3) ?></td>
                            <td class="text-success"><?= number_format((float)$s['overtime_amount'], 3) ?></td>
                            <td class="text-danger"><?= number_format((float)$s['advance_deduction'], 3) ?></td>
                            <td class="fw-bold text-primary"><?= number_format((float)$s['net_salary'], 3) ?></td>
                            <td><?= number_format((float)$s['bank_amount'], 3) ?></td>
                            <td><?= number_format((float)$s['raw_cash'], 3) ?></td>
                            <td class="fw-bold text-success"><?= number_format((float)$s['final_cash'], 3) ?></td>
                            <td class="text-muted"><?= number_format((float)$s['rounding_diff'], 3) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
                <tfoot class="table-dark fw-bold font-mono">
                    <tr>
                        <td colspan="3" class="font-sans text-start">إجمالي فرع (<?= e($branch['name']) ?>):</td>
                        <td><?= number_format($totals['basic'], 3) ?></td>
                        <td class="text-danger"><?= number_format($totals['abs_days_ded'] + $totals['abs_hours_ded'], 3) ?></td>
                        <td><?= number_format($totals['salary_after_ded'], 3) ?></td>
                        <td class="text-success"><?= number_format($totals['ot_amount'], 3) ?></td>
                        <td class="text-danger"><?= number_format($totals['advance'], 3) ?></td>
                        <td class="text-warning"><?= number_format($totals['net'], 3) ?> د.ك</td>
                        <td><?= number_format($totals['bank'], 3) ?> د.ك</td>
                        <td><?= number_format($totals['raw_cash'], 3) ?> د.ك</td>
                        <td class="text-success"><?= number_format($totals['final_cash'], 3) ?> د.ك</td>
                        <td class="text-info"><?= number_format($totals['round_diff'], 3) ?> د.ك</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/../core/footer.php'; ?>
