<?php
/**
 * شاشة الرواتب الشهرية — وحدة الرواتب (المرحلة 3)
 * احتساب فوري دقيق، حفظ في monthly_records و payslips بنمط Upsert، وتعديل أي شهر سابق
 */

declare(strict_types=1);

$pageTitle = 'شاشة الرواتب الشهرية';
$activeNav = 'payroll';

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../core/auth.php';
require_once __DIR__ . '/../../core/audit.php';
require_once __DIR__ . '/../../core/helpers.php';

requireAuth();

$pdo = getDbConnection();
$currentUser = getCurrentUser();
$companySettings = getCompanySettings($pdo);

$currentMonth = (int)date('n');
$currentYear = (int)date('Y');

$selectedMonth = isset($_GET['month']) ? (int)$_GET['month'] : $currentMonth;
$selectedYear = isset($_GET['year']) ? (int)$_GET['year'] : $currentYear;
$selectedBranch = isset($_GET['branch_id']) ? (int)$_GET['branch_id'] : 0;

$daysInMonth = getActualDaysInMonth($selectedMonth, $selectedYear);
$overtimeMultiplier = (float)($companySettings['overtime_multiplier'] ?? 1.25);
$roundingStep = (float)($companySettings['rounding_step'] ?? 0.050);

$errorMsg = '';
$successMsg = '';

// معالجة حفظ الرواتب (POST Upsert)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'save_payroll') {
        $payrollData = $_POST['payroll'] ?? [];

        if (empty($payrollData) || !is_array($payrollData)) {
            $errorMsg = 'لا توجد بيانات رواتب لحفظها.';
        } else {
            try {
                $pdo->beginTransaction();
                $savedCount = 0;

                foreach ($payrollData as $empId => $row) {
                    $empId = (int)$empId;
                    // جلب بيانات الموظف للتأكد
                    $empStmt = $pdo->prepare("SELECT * FROM employees WHERE id = :id AND status != 'resigned'");
                    $empStmt->execute([':id' => $empId]);
                    $emp = $empStmt->fetch();
                    if (!$emp) continue;

                    $absentDays = max(0.0, (float)($row['absent_days'] ?? 0));
                    $absentHours = max(0.0, (float)($row['absent_hours'] ?? 0));
                    $overtimeHours = max(0.0, (float)($row['overtime_hours'] ?? 0));
                    $advanceDeduction = max(0.0, (float)($row['advance_deduction'] ?? 0));
                    
                    $bankEnabled = (bool)$emp['bank_enabled'];
                    $defaultBankAmount = (float)$emp['bank_transfer_amount'];
                    $requestedBankAmount = $bankEnabled ? (float)($row['bank_amount'] ?? $defaultBankAmount) : 0.000;

                    // احتساب الراتب بالقاعدة الصارمة
                    $calc = calculateEmployeePayroll(
                        (float)$emp['basic_salary'],
                        (int)$emp['daily_work_hours'],
                        $daysInMonth,
                        $overtimeMultiplier,
                        $absentDays,
                        $absentHours,
                        $overtimeHours,
                        $advanceDeduction,
                        $bankEnabled,
                        $requestedBankAmount,
                        $roundingStep
                    );

                    // 1. Upsert في monthly_records
                    $mrStmt = $pdo->prepare("
                        INSERT INTO monthly_records (
                            employee_id, month, year, absent_days, absent_hours, overtime_hours, advance_deduction, bank_amount
                        ) VALUES (
                            :emp_id, :month, :year, :absent_days, :absent_hours, :overtime_hours, :advance_deduction, :bank_amount
                        ) ON DUPLICATE KEY UPDATE
                            absent_days = VALUES(absent_days),
                            absent_hours = VALUES(absent_hours),
                            overtime_hours = VALUES(overtime_hours),
                            advance_deduction = VALUES(advance_deduction),
                            bank_amount = VALUES(bank_amount),
                            updated_at = NOW()
                    ");
                    $mrStmt->execute([
                        ':emp_id'            => $empId,
                        ':month'             => $selectedMonth,
                        ':year'              => $selectedYear,
                        ':absent_days'       => $calc['absent_days'],
                        ':absent_hours'      => $calc['absent_hours'],
                        ':overtime_hours'    => $calc['overtime_hours'],
                        ':advance_deduction' => $calc['advance_deduction'],
                        ':bank_amount'       => $calc['bank_amount'],
                    ]);

                    // 2. Upsert في payslips
                    $psStmt = $pdo->prepare("
                        INSERT INTO payslips (
                            employee_id, month, year, days_in_month, basic_salary, daily_work_hours,
                            daily_rate, hourly_rate, overtime_rate_multiplier, overtime_hourly_rate,
                            absent_days, absent_hours, absent_days_deduction, absent_hours_deduction,
                            salary_after_deductions, overtime_hours, overtime_amount, advance_deduction,
                            net_salary, bank_amount, raw_cash, final_cash, rounding_diff, calculated_by
                        ) VALUES (
                            :emp_id, :month, :year, :days_in_month, :basic_salary, :daily_work_hours,
                            :daily_rate, :hourly_rate, :ot_multiplier, :ot_hourly_rate,
                            :absent_days, :absent_hours, :absent_days_ded, :absent_hours_ded,
                            :salary_after_ded, :overtime_hours, :overtime_amount, :advance_ded,
                            :net_salary, :bank_amount, :raw_cash, :final_cash, :rounding_diff, :user_id
                        ) ON DUPLICATE KEY UPDATE
                            days_in_month = VALUES(days_in_month),
                            basic_salary = VALUES(basic_salary),
                            daily_work_hours = VALUES(daily_work_hours),
                            daily_rate = VALUES(daily_rate),
                            hourly_rate = VALUES(hourly_rate),
                            overtime_rate_multiplier = VALUES(overtime_rate_multiplier),
                            overtime_hourly_rate = VALUES(overtime_hourly_rate),
                            absent_days = VALUES(absent_days),
                            absent_hours = VALUES(absent_hours),
                            absent_days_deduction = VALUES(absent_days_deduction),
                            absent_hours_deduction = VALUES(absent_hours_deduction),
                            salary_after_deductions = VALUES(salary_after_deductions),
                            overtime_hours = VALUES(overtime_hours),
                            overtime_amount = VALUES(overtime_amount),
                            advance_deduction = VALUES(advance_deduction),
                            net_salary = VALUES(net_salary),
                            bank_amount = VALUES(bank_amount),
                            raw_cash = VALUES(raw_cash),
                            final_cash = VALUES(final_cash),
                            rounding_diff = VALUES(rounding_diff),
                            calculated_by = VALUES(calculated_by),
                            calculated_at = NOW()
                    ");
                    $psStmt->execute([
                        ':emp_id'            => $empId,
                        ':month'             => $selectedMonth,
                        ':year'              => $selectedYear,
                        ':days_in_month'     => $calc['days_in_month'],
                        ':basic_salary'      => $calc['basic_salary'],
                        ':daily_work_hours'  => $calc['daily_work_hours'],
                        ':daily_rate'        => $calc['daily_rate'],
                        ':hourly_rate'       => $calc['hourly_rate'],
                        ':ot_multiplier'     => $calc['overtime_rate_multiplier'],
                        ':ot_hourly_rate'    => $calc['overtime_hourly_rate'],
                        ':absent_days'       => $calc['absent_days'],
                        ':absent_hours'      => $calc['absent_hours'],
                        ':absent_days_ded'   => $calc['absent_days_deduction'],
                        ':absent_hours_ded'  => $calc['absent_hours_deduction'],
                        ':salary_after_ded'  => $calc['salary_after_deductions'],
                        ':overtime_hours'    => $calc['overtime_hours'],
                        ':overtime_amount'   => $calc['overtime_amount'],
                        ':advance_ded'       => $calc['advance_deduction'],
                        ':net_salary'        => $calc['net_salary'],
                        ':bank_amount'       => $calc['bank_amount'],
                        ':raw_cash'          => $calc['raw_cash'],
                        ':final_cash'        => $calc['final_cash'],
                        ':rounding_diff'     => $calc['rounding_diff'],
                        ':user_id'           => $currentUser['id'],
                    ]);

                    $savedCount++;
                }

                $pdo->commit();

                logAuditEvent($pdo, $currentUser['id'], 'PAYROLL_SAVE', 'payslips', null, null, [
                    'month' => $selectedMonth, 'year' => $selectedYear, 'saved_employees' => $savedCount
                ]);

                $successMsg = "تم حفظ واحتساب رواتب شهر ({$selectedMonth}/{$selectedYear}) لعدد ({$savedCount}) موظف بنجاح.";

                if (isset($_POST['print_after_save'])) {
                    header("Location: ../../reports/aggregated.php?month={$selectedMonth}&year={$selectedYear}&auto_print=1");
                    exit;
                }
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $errorMsg = 'حدث خطأ أثناء حفظ الرواتب: ' . $e->getMessage();
            }
        }
    }
}

// جلب الفروع للاختيار
$branches = $pdo->query("SELECT id, name, code FROM branches WHERE status = 'active' ORDER BY name ASC")->fetchAll();

// جلب الموظفين النشطين (باستثناء المستقيلين) في النطاق المحدد مع سجلاتهم الشهرية وقسائمهم
$empSql = "
    SELECT e.*, b.name AS branch_name, d.name AS department_name,
           mr.absent_days, mr.absent_hours, mr.overtime_hours, mr.advance_deduction, mr.bank_amount AS mr_bank_amount,
           p.id AS payslip_id, p.daily_rate, p.hourly_rate, p.absent_days_deduction, p.absent_hours_deduction,
           p.salary_after_deductions, p.overtime_amount, p.net_salary, p.bank_amount AS ps_bank_amount,
           p.raw_cash, p.final_cash, p.rounding_diff
    FROM employees e
    JOIN branches b ON b.id = e.branch_id
    JOIN departments d ON d.id = e.department_id
    LEFT JOIN monthly_records mr ON mr.employee_id = e.id AND mr.month = :m AND mr.year = :y
    LEFT JOIN payslips p ON p.employee_id = e.id AND p.month = :m AND p.year = :y
    WHERE e.status = 'active'
";
$empParams = [':m' => $selectedMonth, ':y' => $selectedYear];

if ($selectedBranch > 0) {
    $empSql .= " AND e.branch_id = :b_id";
    $empParams[':b_id'] = $selectedBranch;
}
$empSql .= " ORDER BY b.name ASC, d.name ASC, e.name ASC";

$empStmt = $pdo->prepare($empSql);
$empStmt->execute($empParams);
$employeeRows = $empStmt->fetchAll();

require_once __DIR__ . '/../../core/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
    <div>
        <h3 class="fw-bold mb-1">💰 شاشة الرواتب الشهرية</h3>
        <p class="text-muted small mb-0">
            احتساب الرواتب لشهر <strong><?= $selectedMonth ?>/<?= $selectedYear ?></strong> 
            (أيام الشهر الفعلية: <span class="badge bg-secondary"><?= $daysInMonth ?> يوماً</span> &bull; 
            معامل الإضافي: <span class="badge bg-secondary">&times;<?= $overtimeMultiplier ?></span>)
        </p>
    </div>
    <div class="d-flex gap-2">
        <a href="../../reports/aggregated.php?month=<?= $selectedMonth ?>&year=<?= $selectedYear ?>" class="btn btn-outline-dark btn-sm fw-bold">
            📊 التقرير المجمع للشهر
        </a>
    </div>
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

<!-- شريط اختيار الشهر والسنة والفرع -->
<div class="card p-3 mb-4">
    <form method="GET" class="row g-2 align-items-center">
        <div class="col-md-3">
            <label class="form-label small fw-bold mb-1">الشهر</label>
            <select name="month" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php for ($m = 1; $m <= 12; $m++): ?>
                    <option value="<?= $m ?>" <?= $selectedMonth === $m ? 'selected' : '' ?>>
                        شهر <?= $m ?> — <?= date('F', mktime(0, 0, 0, $m, 1)) ?>
                    </option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label small fw-bold mb-1">السنة</label>
            <select name="year" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php for ($y = $currentYear - 2; $y <= $currentYear + 1; $y++): ?>
                    <option value="<?= $y ?>" <?= $selectedYear === $y ? 'selected' : '' ?>><?= $y ?></option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-md-4">
            <label class="form-label small fw-bold mb-1">الفرع</label>
            <select name="branch_id" class="form-select form-select-sm" onchange="this.form.submit()">
                <option value="0">جميع الفروع</option>
                <?php foreach ($branches as $b): ?>
                    <option value="<?= (int)$b['id'] ?>" <?= $selectedBranch === (int)$b['id'] ? 'selected' : '' ?>><?= e($b['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-2 d-flex align-items-end">
            <button type="submit" class="btn btn-dark btn-sm w-100 mt-md-4">تحديث الجدول</button>
        </div>
    </form>
</div>

<form method="POST" id="payrollForm">
    <?= csrfField() ?>
    <input type="hidden" name="action" value="save_payroll">

    <div class="card overflow-hidden shadow-sm mb-4">
        <div class="table-responsive">
            <table class="table table-bordered table-hover align-middle mb-0 text-center" id="payrollTable" style="font-size: 0.8rem;">
                <thead class="table-light">
                    <tr>
                        <th rowspan="2" class="align-middle">#</th>
                        <th rowspan="2" class="align-middle text-start" style="min-width: 140px;">الموظف / الفرع</th>
                        <th rowspan="2" class="align-middle">الأساسي (د.ك)</th>
                        <th rowspan="2" class="align-middle">ساعات/يوم</th>
                        <th colspan="2" class="bg-light">الغياب والخصومات</th>
                        <th rowspan="2" class="align-middle bg-primary-subtle">الراتب بعد الخصم</th>
                        <th colspan="2" class="bg-light">العمل الإضافي (&times;<?= $overtimeMultiplier ?>)</th>
                        <th rowspan="2" class="align-middle bg-danger-subtle">خصم سلفة</th>
                        <th rowspan="2" class="align-middle bg-primary text-white">الصافي</th>
                        <th rowspan="2" class="align-middle bg-info-subtle">البنكي</th>
                        <th colspan="3" class="bg-success-subtle">النقدي والتقريب</th>
                        <th rowspan="2" class="align-middle">القسيمة</th>
                    </tr>
                    <tr>
                        <th>أيام</th>
                        <th>ساعات</th>
                        <th>ساعات</th>
                        <th>المبلغ (د.ك)</th>
                        <th>الخام</th>
                        <th class="fw-bold text-success">النهائي (0.050)</th>
                        <th>فرق التقريب</th>
                    </tr>
                </thead>
                <tbody class="font-mono">
                    <?php if (empty($employeeRows)): ?>
                        <tr>
                            <td colspan="16" class="text-center py-4 font-sans text-muted">لا يوجد موظفون نشطون في هذا الفرع</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($employeeRows as $idx => $row): ?>
                            <?php
                            $empId = (int)$row['id'];
                            $basic = (float)$row['basic_salary'];
                            $dailyHours = max(1, (int)$row['daily_work_hours']);
                            $bankEnabled = !empty($row['bank_enabled']);

                            // القيم المدخلة
                            $absDays = isset($row['absent_days']) ? (float)$row['absent_days'] : 0.0;
                            $absHours = isset($row['absent_hours']) ? (float)$row['absent_hours'] : 0.0;
                            $otHours = isset($row['overtime_hours']) ? (float)$row['overtime_hours'] : 0.0;
                            $advDeduct = isset($row['advance_deduction']) ? (float)$row['advance_deduction'] : 0.0;
                            $bankAmt = isset($row['mr_bank_amount']) ? (float)$row['mr_bank_amount'] : ($bankEnabled ? (float)$row['bank_transfer_amount'] : 0.0);

                            // الحساب المبدئي
                            $calc = calculateEmployeePayroll(
                                $basic, $dailyHours, $daysInMonth, $overtimeMultiplier,
                                $absDays, $absHours, $otHours, $advDeduct, $bankEnabled, $bankAmt, $roundingStep
                            );
                            ?>
                            <tr id="row_<?= $empId ?>" class="payroll-row" data-emp-id="<?= $empId ?>" data-basic="<?= $basic ?>" data-daily-hours="<?= $dailyHours ?>" data-bank-enabled="<?= $bankEnabled ? 1 : 0 ?>">
                                <td class="font-sans"><?= $idx + 1 ?></td>
                                <td class="text-start font-sans">
                                    <div class="fw-bold text-dark"><?= e($row['name']) ?></div>
                                    <div class="text-muted text-[10px]"><?= e($row['branch_name']) ?> &bull; <?= e($row['job_title']) ?></div>
                                </td>
                                <td class="fw-bold"><?= number_format($basic, 3) ?></td>
                                <td><?= $dailyHours ?></td>

                                <!-- إدخال أيام الغياب -->
                                <td style="max-width: 65px;">
                                    <input type="number" step="0.5" min="0" max="<?= $daysInMonth ?>" name="payroll[<?= $empId ?>][absent_days]" class="form-control form-control-sm text-center font-mono p-1 input-calc" value="<?= $absDays ?>" oninput="recalcRow(<?= $empId ?>)">
                                </td>
                                <!-- إدخال ساعات الغياب -->
                                <td style="max-width: 65px;">
                                    <input type="number" step="0.5" min="0" max="200" name="payroll[<?= $empId ?>][absent_hours]" class="form-control form-control-sm text-center font-mono p-1 input-calc" value="<?= $absHours ?>" oninput="recalcRow(<?= $empId ?>)">
                                </td>

                                <!-- الراتب بعد الخصم -->
                                <td class="fw-bold cell-after-ded"><?= number_format($calc['salary_after_deductions'], 3) ?></td>

                                <!-- إدخال ساعات الإضافي -->
                                <td style="max-width: 65px;">
                                    <input type="number" step="0.5" min="0" max="200" name="payroll[<?= $empId ?>][overtime_hours]" class="form-control form-control-sm text-center font-mono p-1 input-calc" value="<?= $otHours ?>" oninput="recalcRow(<?= $empId ?>)">
                                </td>
                                <!-- مبلغ الإضافي -->
                                <td class="cell-ot-amount text-success"><?= number_format($calc['overtime_amount'], 3) ?></td>

                                <!-- إدخال خصم السلفة -->
                                <td style="max-width: 75px;">
                                    <input type="number" step="0.001" min="0" name="payroll[<?= $empId ?>][advance_deduction]" class="form-control form-control-sm text-center font-mono p-1 input-calc" value="<?= number_format($advDeduct, 3, '.', '') ?>" oninput="recalcRow(<?= $empId ?>)">
                                </td>

                                <!-- الصافي -->
                                <td class="fw-bold text-primary bg-light cell-net"><?= number_format($calc['net_salary'], 3) ?></td>

                                <!-- البنكي -->
                                <td style="max-width: 80px;">
                                    <?php if ($bankEnabled): ?>
                                        <input type="number" step="0.001" min="0" name="payroll[<?= $empId ?>][bank_amount]" class="form-control form-control-sm text-center font-mono p-1 input-calc input-bank" value="<?= number_format($calc['bank_amount'], 3, '.', '') ?>" oninput="recalcRow(<?= $empId ?>)">
                                    <?php else: ?>
                                        <span class="text-muted">0.000</span>
                                        <input type="hidden" name="payroll[<?= $empId ?>][bank_amount]" value="0">
                                    <?php endif; ?>
                                </td>

                                <!-- النقدي الخام والنهائي والفرق -->
                                <td class="cell-raw-cash"><?= number_format($calc['raw_cash'], 3) ?></td>
                                <td class="fw-bold text-success cell-final-cash"><?= number_format($calc['final_cash'], 3) ?></td>
                                <td class="text-muted cell-round-diff"><?= number_format($calc['rounding_diff'], 3) ?></td>

                                <td>
                                    <?php if (!empty($row['payslip_id'])): ?>
                                        <a href="payslip.php?id=<?= (int)$row['payslip_id'] ?>" target="_blank" class="btn btn-outline-primary btn-sm py-0 px-1 font-sans text-[11px]" title="عرض القسيمة">
                                            📄 قسيمة
                                        </a>
                                    <?php else: ?>
                                        <span class="text-muted font-sans text-[11px]">جديد</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
                <tfoot class="table-dark font-mono text-center">
                    <tr>
                        <td colspan="2" class="font-sans text-start fw-bold">الإجماليات العامة:</td>
                        <td id="tot_basic">0.000</td>
                        <td>—</td>
                        <td id="tot_abs_days">0.0</td>
                        <td id="tot_abs_hours">0.0</td>
                        <td id="tot_after_ded">0.000</td>
                        <td id="tot_ot_hours">0.0</td>
                        <td id="tot_ot_amount">0.000</td>
                        <td id="tot_advance">0.000</td>
                        <td id="tot_net" class="text-warning fw-bold">0.000</td>
                        <td id="tot_bank">0.000</td>
                        <td id="tot_raw_cash">0.000</td>
                        <td id="tot_final_cash" class="text-success fw-bold">0.000</td>
                        <td id="tot_round_diff">0.000</td>
                        <td>—</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>

    <!-- أزرار الإجراءات -->
    <div class="card p-3 bg-light d-flex flex-row justify-content-between align-items-center flex-wrap gap-2">
        <div class="small text-muted">
            عدد الموظفين في هذا الكشف: <strong><?= count($employeeRows) ?></strong> موظف
        </div>
        <div class="d-flex gap-2">
            <button type="button" class="btn btn-secondary btn-sm" onclick="recalculateAll()">
                🔄 إعادة احتساب الجميع
            </button>
            <button type="submit" name="save_only" class="btn btn-primary fw-bold px-4">
                💾 حفظ الكشف المالي
            </button>
            <button type="submit" name="print_after_save" value="1" class="btn btn-success fw-bold px-3">
                🖨️ حفظ وعرض التقرير المجمع للطباعة
            </button>
        </div>
    </div>
</form>

<script>
const DAYS_IN_MONTH = <?= $daysInMonth ?>;
const OVERTIME_MULTIPLIER = <?= $overtimeMultiplier ?>;
const ROUNDING_STEP = <?= $roundingStep ?>;

function roundCashDownJs(rawCash, step = 0.050) {
    if (rawCash <= 0) return 0;
    const stepFils = Math.round(step * 1000) || 50;
    let fils = Math.round(rawCash * 1000);
    fils = fils - (fils % stepFils);
    return Math.round(fils) / 1000;
}

function recalcRow(empId) {
    const row = document.getElementById('row_' + empId);
    if (!row) return;

    const basic = parseFloat(row.dataset.basic) || 0;
    const dailyHours = parseInt(row.dataset.dailyHours) || 8;
    const bankEnabled = parseInt(row.dataset.bankEnabled) === 1;

    const absDaysInput = row.querySelector('input[name*="[absent_days]"]');
    const absHoursInput = row.querySelector('input[name*="[absent_hours]"]');
    const otHoursInput = row.querySelector('input[name*="[overtime_hours]"]');
    const advInput = row.querySelector('input[name*="[advance_deduction]"]');
    const bankInput = row.querySelector('.input-bank');

    const absDays = Math.max(0, parseFloat(absDaysInput ? absDaysInput.value : 0) || 0);
    const absHours = Math.max(0, parseFloat(absHoursInput ? absHoursInput.value : 0) || 0);
    const otHours = Math.max(0, parseFloat(otHoursInput ? otHoursInput.value : 0) || 0);
    const advance = Math.max(0, parseFloat(advInput ? advInput.value : 0) || 0);

    // الحسابات
    const dailyRate = basic / DAYS_IN_MONTH;
    const hourlyRate = dailyRate / dailyHours;

    const absDaysDeduct = absDays * dailyRate;
    const absHoursDeduct = absHours * hourlyRate;
    const afterDed = Math.max(0, basic - (absDaysDeduct + absHoursDeduct));

    const otHourlyRate = hourlyRate * OVERTIME_MULTIPLIER;
    const otAmount = otHours * otHourlyRate;

    const netSalary = Math.max(0, afterDed - advance + otAmount);

    let bankAmount = 0;
    if (bankEnabled && bankInput) {
        let reqBank = Math.max(0, parseFloat(bankInput.value) || 0);
        if (reqBank > netSalary) {
            reqBank = netSalary; // لا يتجاوز الصافي
            bankInput.value = reqBank.toFixed(3);
        }
        bankAmount = reqBank;
    }

    const rawCash = Math.max(0, netSalary - bankAmount);
    const finalCash = roundCashDownJs(rawCash, ROUNDING_STEP);
    const roundDiff = Math.max(0, rawCash - finalCash);

    // تحديث خلايا السطر
    row.querySelector('.cell-after-ded').textContent = afterDed.toFixed(3);
    row.querySelector('.cell-ot-amount').textContent = otAmount.toFixed(3);
    row.querySelector('.cell-net').textContent = netSalary.toFixed(3);
    row.querySelector('.cell-raw-cash').textContent = rawCash.toFixed(3);
    row.querySelector('.cell-final-cash').textContent = finalCash.toFixed(3);
    row.querySelector('.cell-round-diff').textContent = roundDiff.toFixed(3);

    updateTotals();
}

function updateTotals() {
    let totBasic = 0, totAbsDays = 0, totAbsHours = 0, totAfterDed = 0;
    let totOtHours = 0, totOtAmount = 0, totAdvance = 0, totNet = 0;
    let totBank = 0, totRawCash = 0, totFinalCash = 0, totRoundDiff = 0;

    document.querySelectorAll('.payroll-row').forEach(row => {
        const empId = row.dataset.empId;
        const basic = parseFloat(row.dataset.basic) || 0;
        const absDays = parseFloat(row.querySelector('input[name*="[absent_days]"]')?.value || 0);
        const absHours = parseFloat(row.querySelector('input[name*="[absent_hours]"]')?.value || 0);
        const afterDed = parseFloat(row.querySelector('.cell-after-ded')?.textContent || 0);
        const otHours = parseFloat(row.querySelector('input[name*="[overtime_hours]"]')?.value || 0);
        const otAmount = parseFloat(row.querySelector('.cell-ot-amount')?.textContent || 0);
        const advance = parseFloat(row.querySelector('input[name*="[advance_deduction]"]')?.value || 0);
        const net = parseFloat(row.querySelector('.cell-net')?.textContent || 0);
        const bank = parseFloat(row.querySelector('.input-bank')?.value || 0);
        const rawCash = parseFloat(row.querySelector('.cell-raw-cash')?.textContent || 0);
        const finalCash = parseFloat(row.querySelector('.cell-final-cash')?.textContent || 0);
        const roundDiff = parseFloat(row.querySelector('.cell-round-diff')?.textContent || 0);

        totBasic += basic;
        totAbsDays += absDays;
        totAbsHours += absHours;
        totAfterDed += afterDed;
        totOtHours += otHours;
        totOtAmount += otAmount;
        totAdvance += advance;
        totNet += net;
        totBank += bank;
        totRawCash += rawCash;
        totFinalCash += finalCash;
        totRoundDiff += roundDiff;
    });

    document.getElementById('tot_basic').textContent = totBasic.toFixed(3);
    document.getElementById('tot_abs_days').textContent = totAbsDays.toFixed(1);
    document.getElementById('tot_abs_hours').textContent = totAbsHours.toFixed(1);
    document.getElementById('tot_after_ded').textContent = totAfterDed.toFixed(3);
    document.getElementById('tot_ot_hours').textContent = totOtHours.toFixed(1);
    document.getElementById('tot_ot_amount').textContent = totOtAmount.toFixed(3);
    document.getElementById('tot_advance').textContent = totAdvance.toFixed(3);
    document.getElementById('tot_net').textContent = totNet.toFixed(3);
    document.getElementById('tot_bank').textContent = totBank.toFixed(3);
    document.getElementById('tot_raw_cash').textContent = totRawCash.toFixed(3);
    document.getElementById('tot_final_cash').textContent = totFinalCash.toFixed(3);
    document.getElementById('tot_round_diff').textContent = totRoundDiff.toFixed(3);
}

function recalculateAll() {
    document.querySelectorAll('.payroll-row').forEach(row => {
        recalcRow(row.dataset.empId);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateTotals();
});
</script>

<?php require_once __DIR__ . '/../../core/footer.php'; ?>
