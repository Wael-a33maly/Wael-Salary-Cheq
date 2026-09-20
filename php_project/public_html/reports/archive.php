<?php
/**
 * الأرشيف المالي للسنوات والأشهر السابقة — المرحلة 4 (تقرير 8)
 * تصفح السنوات &larr; الأشهر &larr; كشوف الرواتب المحفوظة مع إمكانية التصدير والطباعة وإعادة الفتح
 */

declare(strict_types=1);

$pageTitle = 'الأرشيف المالي للرواتب';
$activeNav = 'reports';

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';

requireAuth();

$pdo = getDbConnection();

// جلب السنوات والأشهر المسجلة في جدول payslips مع إحصائيات كل شهر
$stmt = $pdo->query("
    SELECT year, month, 
           COUNT(*) AS total_slips,
           SUM(basic_salary) AS total_basic,
           SUM(net_salary) AS total_net,
           SUM(bank_amount) AS total_bank,
           SUM(final_cash) AS total_cash,
           SUM(rounding_diff) AS total_rounding,
           MAX(calculated_at) AS last_calculated
    FROM payslips
    GROUP BY year, month
    ORDER BY year DESC, month DESC
");
$archiveRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);

// تجميع حسب السنوات
$yearsTree = [];
foreach ($archiveRecords as $rec) {
    $y = (int)$rec['year'];
    if (!isset($yearsTree[$y])) {
        $yearsTree[$y] = [];
    }
    $yearsTree[$y][] = $rec;
}

require_once __DIR__ . '/../core/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
    <div>
        <h3 class="fw-bold mb-1">🗄️ الأرشيف المالي لكشوف الرواتب</h3>
        <p class="text-muted small mb-0">سجل تاريخي دائم لكافة مسيرات الرواتب الصادرة لجميع السنوات والأشهر السابقة</p>
    </div>
</div>

<?php if (empty($yearsTree)): ?>
    <div class="card p-5 text-center my-4">
        <div class="fs-1 mb-3">📂</div>
        <h5 class="fw-bold text-dark">لا توجد كشوف رواتب مؤرشفة حتى الآن</h5>
        <p class="text-muted small">عند حفظ واحتساب أول كشف راتب شهري، سيتم أرشفته هنا تلقائياً دون أي حذف تلقائي.</p>
        <div class="mt-2">
            <a href="../modules/payroll/index.php" class="btn btn-primary btn-sm">الانتقال لاحتساب الرواتب &larr;</a>
        </div>
    </div>
<?php else: ?>
    <?php foreach ($yearsTree as $year => $months): ?>
        <div class="card mb-4 overflow-hidden border">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center py-3">
                <h5 class="fw-bold mb-0 font-mono">📅 سنة <?= $year ?> المالية</h5>
                <span class="badge bg-secondary font-mono"><?= count($months) ?> أشهر مسجلة</span>
            </div>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0 text-center" style="font-size: 0.85rem;">
                    <thead class="table-light">
                        <tr>
                            <th class="text-start">الشهر المالي</th>
                            <th>عدد الموظفين</th>
                            <th>إجمالي الأساسي (د.ك)</th>
                            <th class="bg-primary-subtle text-primary">إجمالي الصافي (د.ك)</th>
                            <th>التحويل البنكي (د.ك)</th>
                            <th class="bg-success-subtle text-success">النقدي المصروف (د.ك)</th>
                            <th>وفر التقريب (د.ك)</th>
                            <th>تاريخ آخر تعديل</th>
                            <th class="text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody class="font-mono">
                        <?php foreach ($months as $m): ?>
                            <?php $monthNum = (int)$m['month']; ?>
                            <tr>
                                <td class="text-start font-sans fw-bold">
                                    <span class="fs-6">شهر <?= $monthNum ?></span>
                                    <span class="text-muted small d-block"><?= date('F', mktime(0, 0, 0, $monthNum, 1)) ?></span>
                                </td>
                                <td><span class="badge bg-secondary font-mono"><?= (int)$m['total_slips'] ?> موظف</span></td>
                                <td><?= number_format((float)$m['total_basic'], 3) ?></td>
                                <td class="fw-bold text-primary"><?= number_format((float)$m['total_net'], 3) ?></td>
                                <td><?= number_format((float)$m['total_bank'], 3) ?></td>
                                <td class="fw-bold text-success"><?= number_format((float)$m['total_cash'], 3) ?></td>
                                <td class="text-muted"><?= number_format((float)$m['total_rounding'], 3) ?></td>
                                <td class="small text-muted font-sans"><?= e($m['last_calculated']) ?></td>
                                <td>
                                    <div class="d-flex justify-content-center gap-1 font-sans">
                                        <a href="aggregated.php?month=<?= $monthNum ?>&year=<?= $year ?>" class="btn btn-outline-dark btn-sm py-0 px-2" title="التقرير المجمع">
                                            📊 عرض
                                        </a>
                                        <a href="../modules/payroll/index.php?month=<?= $monthNum ?>&year=<?= $year ?>" class="btn btn-outline-primary btn-sm py-0 px-2" title="تعديل أو إعادة فتح">
                                            ✏️ فتح
                                        </a>
                                        <a href="export.php?type=aggregated&month=<?= $monthNum ?>&year=<?= $year ?>" class="btn btn-outline-success btn-sm py-0 px-2" title="تصدير Excel">
                                            📥 Excel
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endforeach; ?>
<?php endif; ?>

<?php require_once __DIR__ . '/../core/footer.php'; ?>
