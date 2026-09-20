<?php
/**
 * لوحة التحكم المركزية الشاملة — المرحلة 5 (الداشبورد)
 * مؤشرات إحصائية، تنبيهات الإقامات، رسوم بيانية تفاعلية Chart.js، واختصارات سريعة
 */

declare(strict_types=1);

$pageTitle = 'لوحة التحكم المركزية';
$activeNav = 'dashboard';

$configFile = __DIR__ . '/config/db.php';
$lockFile = __DIR__ . '/install/install.lock';

// التحقق من اكتمال التنصيب
if (!file_exists($configFile) || !file_exists($lockFile)) {
    header('Location: install/index.php');
    exit;
}

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/core/auth.php';
require_once __DIR__ . '/core/audit.php';
require_once __DIR__ . '/core/helpers.php';

requireAuth('login.php');

$currentUser = getCurrentUser();
$pdo = getDbConnection();
$companySettings = getCompanySettings($pdo);
$alertDaysLimit = (int)($companySettings['residency_alert_days'] ?? 60);

// 1. إحصائيات الموظفين
$empStats = $pdo->query("
    SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) AS leave_count,
        SUM(CASE WHEN status = 'resigned' THEN 1 ELSE 0 END) AS resigned_count,
        SUM(CASE WHEN status = 'active' THEN basic_salary ELSE 0 END) AS total_basic_active
    FROM employees
")->fetch(PDO::FETCH_ASSOC);

// 2. إحصائيات الفروع
$branchesCount = (int)$pdo->query("SELECT COUNT(*) FROM branches WHERE status = 'active'")->fetchColumn();

// 3. آخر شهر رواتب محسوب
$lastPayrollStmt = $pdo->query("
    SELECT year, month, 
           COUNT(*) AS emp_count,
           SUM(net_salary) AS total_net,
           SUM(bank_amount) AS total_bank,
           SUM(final_cash) AS total_cash,
           SUM(rounding_diff) AS total_rounding
    FROM payslips
    GROUP BY year, month
    ORDER BY year DESC, month DESC
    LIMIT 1
");
$lastPayroll = $lastPayrollStmt->fetch(PDO::FETCH_ASSOC);

// 4. إجمالي وفر فروق التقريب التراكمي في النظام
$totalCumulativeRounding = (float)$pdo->query("SELECT COALESCE(SUM(rounding_diff), 0) FROM payslips")->fetchColumn();

// 5. الموظفون المستحقون لتنبيه الإقامة
$residenceStmt = $pdo->prepare("
    SELECT e.id, e.name, e.civil_id, e.residence_expiry_date, b.name AS branch_name, d.name AS dept_name
    FROM employees e
    JOIN branches b ON b.id = e.branch_id
    JOIN departments d ON d.id = e.department_id
    WHERE e.status = 'active' 
      AND e.residence_expiry_date IS NOT NULL
      AND e.residence_expiry_date <= DATE_ADD(CURDATE(), INTERVAL :days DAY)
    ORDER BY e.residence_expiry_date ASC
    LIMIT 10
");
$residenceStmt->execute([':days' => $alertDaysLimit]);
$residenceAlerts = $residenceStmt->fetchAll(PDO::FETCH_ASSOC);

// 6. بيانات الرسم البياني: تطور الرواتب لآخر 6 أشهر
$historyPayrollStmt = $pdo->query("
    SELECT year, month, 
           SUM(basic_salary) AS total_basic,
           SUM(net_salary) AS total_net,
           SUM(bank_amount) AS total_bank,
           SUM(final_cash) AS total_cash
    FROM payslips
    GROUP BY year, month
    ORDER BY year ASC, month ASC
    LIMIT 6
");
$payrollHistory = $historyPayrollStmt->fetchAll(PDO::FETCH_ASSOC);

$chartLabels = [];
$chartNet = [];
$chartBasic = [];
foreach ($payrollHistory as $h) {
    $chartLabels[] = $h['month'] . '/' . $h['year'];
    $chartNet[] = (float)$h['total_net'];
    $chartBasic[] = (float)$h['total_basic'];
}

// 7. بيانات الرسم البياني: توزيع الرواتب حسب الفرع لآخر كشف
$branchDistStmt = $pdo->prepare("
    SELECT b.name AS branch_name, SUM(p.net_salary) AS total_branch_net
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    JOIN branches b ON b.id = e.branch_id
    WHERE p.month = :m AND p.year = :y
    GROUP BY b.id, b.name
    ORDER BY total_branch_net DESC
");
if ($lastPayroll) {
    $branchDistStmt->execute([':m' => $lastPayroll['month'], ':y' => $lastPayroll['year']]);
    $branchDistData = $branchDistStmt->fetchAll(PDO::FETCH_ASSOC);
} else {
    $branchDistData = [];
}

// 8. آخر حركات سجل التدقيق
$recentAudits = $pdo->query("
    SELECT a.*, u.username, u.full_name 
    FROM audit_log a 
    LEFT JOIN users u ON a.user_id = u.id 
    ORDER BY a.created_at DESC 
    LIMIT 6
")->fetchAll(PDO::FETCH_ASSOC);

require_once __DIR__ . '/core/header.php';
?>

<!-- رسالة الترحيب والترويسة -->
<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
    <div>
        <h3 class="fw-bold mb-1">👋 مرحباً بك، <?= e($currentUser['full_name'] ?: $currentUser['username']) ?></h3>
        <p class="text-muted small mb-0">
            <?= e($companySettings['company_name']) ?> &bull; العملة الرسمية: <strong>الدينار الكويتي (KWD)</strong> &bull; مهلة تنبيه الإقامات: <strong><?= $alertDaysLimit ?> يوماً</strong>
        </p>
    </div>
    <div class="d-flex gap-2">
        <a href="modules/payroll/index.php" class="btn btn-primary btn-sm fw-bold">
            💰 احتساب رواتب الشهر الحالى
        </a>
        <a href="reports/aggregated.php" class="btn btn-outline-dark btn-sm fw-bold">
            📊 التقرير المجمع
        </a>
    </div>
</div>

<!-- بطاقات الإحصائيات الرئيسية (5 بطاقات) -->
<div class="row g-3 mb-4">
    <!-- إجمالي الموظفين -->
    <div class="col-sm-6 col-xl">
        <div class="card p-3 h-100 border-start border-4 border-primary">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-muted small fw-bold">الموظفون النشطون</span>
                <span class="fs-4">👥</span>
            </div>
            <div class="fs-3 fw-bold font-mono text-dark"><?= (int)$empStats['active_count'] ?></div>
            <div class="text-muted text-[11px] mt-1">
                من إجمالي <?= (int)$empStats['total'] ?> موظف مسجل
            </div>
        </div>
    </div>

    <!-- عدد الفروع -->
    <div class="col-sm-6 col-xl">
        <div class="card p-3 h-100 border-start border-4 border-info">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-muted small fw-bold">فروع الشركة</span>
                <span class="fs-4">🏢</span>
            </div>
            <div class="fs-3 fw-bold font-mono text-dark"><?= $branchesCount ?></div>
            <div class="text-muted text-[11px] mt-1">
                جميع الفروع نشطة في النظام
            </div>
        </div>
    </div>

    <!-- صافي رواتب آخر شهر -->
    <div class="col-sm-6 col-xl">
        <div class="card p-3 h-100 border-start border-4 border-success">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-muted small fw-bold">صافي آخر شهر (<?= $lastPayroll ? $lastPayroll['month'] . '/' . $lastPayroll['year'] : '—' ?>)</span>
                <span class="fs-4">💵</span>
            </div>
            <div class="fs-4 fw-bold font-mono text-success">
                <?= $lastPayroll ? formatKWD((float)$lastPayroll['total_net']) : '0.000 د.ك' ?>
            </div>
            <div class="text-muted text-[11px] mt-1">
                <?= $lastPayroll ? 'بنكي: ' . number_format((float)$lastPayroll['total_bank'], 3) . ' | نقدي: ' . number_format((float)$lastPayroll['total_cash'], 3) : 'لم يتم احتساب رواتب بعد' ?>
            </div>
        </div>
    </div>

    <!-- وفر فروق التقريب التراكمي -->
    <div class="col-sm-6 col-xl">
        <div class="card p-3 h-100 border-start border-4 border-warning">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-muted small fw-bold">وفر التقريب التراكمي</span>
                <span class="fs-4">🪙</span>
            </div>
            <div class="fs-4 fw-bold font-mono text-warning-emphasis">
                <?= formatKWD($totalCumulativeRounding) ?>
            </div>
            <div class="text-muted text-[11px] mt-1">
                لصالح الشركة (Floor to 0.050)
            </div>
        </div>
    </div>

    <!-- تنبيهات الإقامات -->
    <div class="col-sm-6 col-xl">
        <div class="card p-3 h-100 border-start border-4 <?= count($residenceAlerts) > 0 ? 'border-danger bg-danger-subtle' : 'border-secondary' ?>">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="small fw-bold <?= count($residenceAlerts) > 0 ? 'text-danger' : 'text-muted' ?>">إقامات تستوجب التجديد</span>
                <span class="fs-4">🪪</span>
            </div>
            <div class="fs-3 fw-bold font-mono <?= count($residenceAlerts) > 0 ? 'text-danger' : 'text-dark' ?>">
                <?= count($residenceAlerts) ?>
            </div>
            <div class="text-muted text-[11px] mt-1">
                خلال مهلة <?= $alertDaysLimit ?> يوماً أو منتهية
            </div>
        </div>
    </div>
</div>

<!-- شريط تحذيري للإقامات إن وجدت -->
<?php if (!empty($residenceAlerts)): ?>
    <div class="card border-danger mb-4 shadow-sm">
        <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center py-2">
            <span class="fw-bold small">⚠️ تنبيهات الإقامات المستعجلة (خلال <?= $alertDaysLimit ?> يوماً القادمة)</span>
            <a href="reports/residency.php?filter=alert" class="btn btn-light btn-sm py-0 px-2 text-danger fw-bold font-sans text-[11px]">
                عرض التقرير الكامل &larr;
            </a>
        </div>
        <div class="table-responsive">
            <table class="table table-hover table-sm align-middle mb-0 text-center" style="font-size: 0.8rem;">
                <thead class="table-light">
                    <tr>
                        <th class="text-start">اسم الموظف</th>
                        <th>الرقم المدني</th>
                        <th>الفرع / القسم</th>
                        <th>تاريخ الانتهاء</th>
                        <th>الأيام المتبقية</th>
                        <th>الحالة</th>
                        <th>الإجراء</th>
                    </tr>
                </thead>
                <tbody class="font-mono">
                    <?php foreach ($residenceAlerts as $alert): ?>
                        <?php $st = getResidenceExpiryStatus($alert['residence_expiry_date'], $alertDaysLimit); ?>
                        <tr>
                            <td class="text-start font-sans fw-bold"><?= e($alert['name']) ?></td>
                            <td><?= e($alert['civil_id']) ?></td>
                            <td class="font-sans text-muted"><?= e($alert['branch_name']) ?> &bull; <?= e($alert['dept_name']) ?></td>
                            <td class="fw-bold"><?= e($alert['residence_expiry_date']) ?></td>
                            <td>
                                <?php if ($st['code'] === 'expired'): ?>
                                    <span class="text-danger fw-bold">منتهية منذ <?= abs($st['days']) ?> يوم</span>
                                <?php else: ?>
                                    <span class="fw-bold"><?= (int)$st['days'] ?> يوماً</span>
                                <?php endif; ?>
                            </td>
                            <td class="font-sans">
                                <span class="badge bg-<?= $st['color'] ?>-subtle text-<?= $st['color'] ?> border border-<?= $st['color'] ?>-subtle">
                                    <?= e($st['label']) ?>
                                </span>
                            </td>
                            <td class="font-sans">
                                <a href="core/employees.php" class="btn btn-outline-secondary btn-sm py-0 px-2 text-[11px]">تعديل</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
<?php endif; ?>

<!-- الرسوم البيانية Chart.js -->
<div class="row g-4 mb-4">
    <!-- الرسم البياني لتطور الرواتب -->
    <div class="col-lg-8">
        <div class="card p-4 h-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold text-dark mb-0">📈 مسار تكلفة الرواتب الشهرية (آخر 6 أشهر)</h6>
                <span class="badge bg-light text-muted border font-mono">بالدينار الكويتي (KWD)</span>
            </div>
            <div style="height: 270px;">
                <canvas id="payrollTrendChart"></canvas>
            </div>
        </div>
    </div>

    <!-- الرسم البياني لتوزيع الرواتب حسب الفرع -->
    <div class="col-lg-4">
        <div class="card p-4 h-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold text-dark mb-0">🍩 حصة الفروع من الرواتب</h6>
                <span class="badge bg-light text-muted border font-mono">آخر شهر</span>
            </div>
            <div style="height: 270px;" class="d-flex align-items-center justify-content-center">
                <?php if (!empty($branchDistData)): ?>
                    <canvas id="branchPieChart"></canvas>
                <?php else: ?>
                    <div class="text-muted small text-center">لا توجد بيانات رواتب بعد لعرضها</div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- اختصارات سريعة وسجل التدقيق الأخير -->
<div class="row g-4 mb-4">
    <!-- اختصارات سريعة -->
    <div class="col-lg-5">
        <div class="card p-4 h-100">
            <h6 class="fw-bold text-dark mb-3">⚡ إجراءات سريعة</h6>
            <div class="d-grid gap-2">
                <a href="modules/payroll/index.php" class="btn btn-outline-primary d-flex align-items-center justify-content-between p-2">
                    <span class="fw-bold">💰 احتساب كشف رواتب جديد</span>
                    <span class="fs-5">&larr;</span>
                </a>
                <a href="core/employees.php" class="btn btn-outline-dark d-flex align-items-center justify-content-between p-2">
                    <span class="fw-bold">👤 إدارة الموظفين وإضافة موظف</span>
                    <span class="fs-5">&larr;</span>
                </a>
                <a href="reports/aggregated.php" class="btn btn-outline-success d-flex align-items-center justify-content-between p-2">
                    <span class="fw-bold">📊 استخراج التقرير المالي المجمع</span>
                    <span class="fs-5">&larr;</span>
                </a>
                <a href="reports/banking.php" class="btn btn-outline-info d-flex align-items-center justify-content-between p-2">
                    <span class="fw-bold">🏦 كشف التحويلات البنكية والخزينة</span>
                    <span class="fs-5">&larr;</span>
                </a>
                <a href="reports/residency.php" class="btn btn-outline-warning text-dark d-flex align-items-center justify-content-between p-2">
                    <span class="fw-bold">🪪 فحص ومتابعة انتهاء الإقامات</span>
                    <span class="fs-5">&larr;</span>
                </a>
            </div>
        </div>
    </div>

    <!-- سجل التدقيق الأخير -->
    <div class="col-lg-7">
        <div class="card p-4 h-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold text-dark mb-0">📜 أحدث العمليات الإدارية (Audit Trail)</h6>
                <a href="core/audit_view.php" class="text-primary small text-decoration-none fw-bold">السجل الكامل &larr;</a>
            </div>
            <div class="table-responsive">
                <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.8rem;">
                    <thead class="table-light">
                        <tr>
                            <th>المستخدم</th>
                            <th>الإجراء</th>
                            <th>الجدول</th>
                            <th>التاريخ والوقت</th>
                        </tr>
                    </thead>
                    <tbody class="font-mono">
                        <?php if (empty($recentAudits)): ?>
                            <tr><td colspan="4" class="text-center py-3 font-sans text-muted">لا توجد عمليات بعد</td></tr>
                        <?php else: ?>
                            <?php foreach ($recentAudits as $ra): ?>
                                <tr>
                                    <td class="font-sans fw-bold"><?= e($ra['full_name'] ?: $ra['username']) ?></td>
                                    <td><span class="badge bg-secondary-subtle text-dark border"><?= e($ra['action']) ?></span></td>
                                    <td class="text-muted"><?= e($ra['table_name'] ?: '—') ?></td>
                                    <td class="text-muted small font-sans"><?= e($ra['created_at']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- تضمين مكتبة Chart.js وإعداد الرسوم البيانية -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
    // 1. رسم مسار الرواتب
    const trendCtx = document.getElementById('payrollTrendChart');
    if (trendCtx) {
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: <?= json_encode($chartLabels) ?>,
                datasets: [
                    {
                        label: 'صافي الرواتب (Net)',
                        data: <?= json_encode($chartNet) ?>,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2
                    },
                    {
                        label: 'الرواتب الأساسية (Basic)',
                        data: <?= json_encode($chartBasic) ?>,
                        borderColor: '#64748b',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3,
                        borderWidth: 1.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { family: 'Cairo' } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(3) + ' د.ك';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { return value.toFixed(0) + ' د.ك'; }
                        }
                    }
                }
            }
        });
    }

    // 2. رسم توزيع الفروع
    const pieCtx = document.getElementById('branchPieChart');
    if (pieCtx) {
        const branchNames = <?= json_encode(array_column($branchDistData, 'branch_name')) ?>;
        const branchTotals = <?= json_encode(array_map('floatval', array_column($branchDistData, 'total_branch_net'))) ?>;

        new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: branchNames,
                datasets: [{
                    data: branchTotals,
                    backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { family: 'Cairo' } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed.toFixed(3) + ' د.ك';
                            }
                        }
                    }
                }
            }
        });
    }
});
</script>

<?php require_once __DIR__ . '/core/footer.php'; ?>
