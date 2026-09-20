<?php
/**
 * تقرير متابعة انتهاء الإقامات — المرحلة 4 (تقرير 7)
 * فلاتر للمدد (30، 60، 90، حد التنبيه، المنتهية)، تصنيف بصري بـ 5 ألوان، والترتيب تصاعدياً
 */

declare(strict_types=1);

$pageTitle = 'تقرير متابعة انتهاء الإقامات';
$activeNav = 'reports';

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';

requireAuth();

$pdo = getDbConnection();
$companySettings = getCompanySettings($pdo);
$alertDaysLimit = (int)($companySettings['residency_alert_days'] ?? 60);

$filter = $_GET['filter'] ?? 'all';
$branchId = (int)($_GET['branch_id'] ?? 0);

$branches = $pdo->query("SELECT id, name FROM branches ORDER BY name ASC")->fetchAll();

$sql = "
    SELECT e.*, b.name AS branch_name, d.name AS dept_name
    FROM employees e
    JOIN branches b ON b.id = e.branch_id
    JOIN departments d ON d.id = e.department_id
    WHERE e.status = 'active' AND e.residence_expiry_date IS NOT NULL
";
$params = [];

if ($branchId > 0) {
    $sql .= " AND e.branch_id = :b_id";
    $params[':b_id'] = $branchId;
}

$sql .= " ORDER BY e.residence_expiry_date ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$allEmployees = $stmt->fetchAll(PDO::FETCH_ASSOC);

// تصفية حسب الفلتر المختار
$filteredEmployees = [];
$counts = [
    'expired' => 0,
    'days_30' => 0,
    'days_60' => 0,
    'days_90' => 0,
    'valid'   => 0,
    'alert'   => 0,
    'all'     => count($allEmployees)
];

foreach ($allEmployees as $emp) {
    $st = getResidenceExpiryStatus($emp['residence_expiry_date'], $alertDaysLimit);
    $days = $st['days'];

    if ($st['code'] === 'expired') {
        $counts['expired']++;
        $counts['alert']++;
    } elseif ($days <= 30) {
        $counts['days_30']++;
        if ($days <= $alertDaysLimit) $counts['alert']++;
    } elseif ($days <= 60) {
        $counts['days_60']++;
        if ($days <= $alertDaysLimit) $counts['alert']++;
    } elseif ($days <= 90) {
        $counts['days_90']++;
        if ($days <= $alertDaysLimit) $counts['alert']++;
    } else {
        $counts['valid']++;
    }

    $include = false;
    if ($filter === 'all') {
        $include = true;
    } elseif ($filter === 'expired' && $st['code'] === 'expired') {
        $include = true;
    } elseif ($filter === '30' && $st['code'] !== 'expired' && $days <= 30) {
        $include = true;
    } elseif ($filter === '60' && $st['code'] !== 'expired' && $days <= 60) {
        $include = true;
    } elseif ($filter === '90' && $st['code'] !== 'expired' && $days <= 90) {
        $include = true;
    } elseif ($filter === 'alert' && ($st['code'] === 'expired' || $days <= $alertDaysLimit)) {
        $include = true;
    }

    if ($include) {
        $emp['status_info'] = $st;
        $filteredEmployees[] = $emp;
    }
}

require_once __DIR__ . '/../core/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 no-print">
    <div>
        <h3 class="fw-bold mb-1">🪪 تقرير متابعة انتهاء الإقامات</h3>
        <p class="text-muted small mb-0">نظام إنذار مبكر ومتابعة الإقامات بحسب الأيام المتبقية وتصنيف الألوان الخمسة</p>
    </div>
    <div class="d-flex gap-2">
        <a href="export.php?type=residency" class="btn btn-outline-success btn-sm fw-bold">
            📥 تصدير Excel (CSV)
        </a>
        <button onclick="window.print()" class="btn btn-primary btn-sm fw-bold">
            🖨️ طباعة الكشف
        </button>
    </div>
</div>

<!-- بطاقات الإحصائيات السريعة -->
<div class="row g-3 mb-4 no-print">
    <div class="col-6 col-md-2">
        <a href="?filter=expired&branch_id=<?= $branchId ?>" class="card p-2 text-center text-decoration-none border-danger <?= $filter === 'expired' ? 'bg-danger text-white' : 'bg-danger-subtle text-danger' ?>">
            <div class="fs-4 fw-bold font-mono"><?= $counts['expired'] ?></div>
            <div class="small fw-bold">منتهية (أحمر)</div>
        </a>
    </div>
    <div class="col-6 col-md-2">
        <a href="?filter=30&branch_id=<?= $branchId ?>" class="card p-2 text-center text-decoration-none border-warning <?= $filter === '30' ? 'bg-warning text-dark' : 'bg-warning-subtle text-dark' ?>">
            <div class="fs-4 fw-bold font-mono"><?= $counts['days_30'] ?></div>
            <div class="small fw-bold">&le; 30 يوماً (برتقالي)</div>
        </a>
    </div>
    <div class="col-6 col-md-2">
        <a href="?filter=60&branch_id=<?= $branchId ?>" class="card p-2 text-center text-decoration-none border-info <?= $filter === '60' ? 'bg-info text-dark' : 'bg-info-subtle text-dark' ?>">
            <div class="fs-4 fw-bold font-mono"><?= $counts['days_60'] ?></div>
            <div class="small fw-bold">&le; 60 يوماً (أصفر)</div>
        </a>
    </div>
    <div class="col-6 col-md-2">
        <a href="?filter=90&branch_id=<?= $branchId ?>" class="card p-2 text-center text-decoration-none border-secondary <?= $filter === '90' ? 'bg-secondary text-white' : 'bg-light text-secondary' ?>">
            <div class="fs-4 fw-bold font-mono"><?= $counts['days_90'] ?></div>
            <div class="small fw-bold">&le; 90 يوماً (أخضر فاتح)</div>
        </a>
    </div>
    <div class="col-6 col-md-2">
        <a href="?filter=alert&branch_id=<?= $branchId ?>" class="card p-2 text-center text-decoration-none border-primary <?= $filter === 'alert' ? 'bg-primary text-white' : 'bg-primary-subtle text-primary' ?>">
            <div class="fs-4 fw-bold font-mono"><?= $counts['alert'] ?></div>
            <div class="small fw-bold">تحت التنبيه (&le;<?= $alertDaysLimit ?>)</div>
        </a>
    </div>
    <div class="col-6 col-md-2">
        <a href="?filter=all&branch_id=<?= $branchId ?>" class="card p-2 text-center text-decoration-none border-dark <?= $filter === 'all' ? 'bg-dark text-white' : 'bg-light text-dark' ?>">
            <div class="fs-4 fw-bold font-mono"><?= $counts['all'] ?></div>
            <div class="small fw-bold">جميع الموظفين</div>
        </a>
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
                    <th>الوظيفة</th>
                    <th>رقم الإقامة</th>
                    <th>تاريخ انتهاء الإقامة</th>
                    <th>الأيام المتبقية</th>
                    <th>حالة الإقامة</th>
                </tr>
            </thead>
            <tbody class="font-mono">
                <?php if (empty($filteredEmployees)): ?>
                    <tr>
                        <td colspan="9" class="py-4 font-sans text-muted">لا يوجد موظفون مطابقون لهذا الفلتر</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($filteredEmployees as $idx => $emp): ?>
                        <?php $st = $emp['status_info']; ?>
                        <tr>
                            <td class="font-sans"><?= $idx + 1 ?></td>
                            <td><?= e($emp['civil_id']) ?></td>
                            <td class="text-start font-sans fw-bold"><?= e($emp['name']) ?></td>
                            <td class="font-sans text-muted"><?= e($emp['branch_name']) ?></td>
                            <td class="font-sans text-muted"><?= e($emp['job_title']) ?></td>
                            <td><?= e($emp['residence_number'] ?: '—') ?></td>
                            <td class="fw-bold"><?= e($emp['residence_expiry_date']) ?></td>
                            <td>
                                <?php if ($st['code'] === 'expired'): ?>
                                    <span class="text-danger fw-bold">منتهية منذ <?= abs($st['days']) ?> يوم</span>
                                <?php else: ?>
                                    <span class="fw-bold"><?= (int)$st['days'] ?> يوماً</span>
                                <?php endif; ?>
                            </td>
                            <td class="font-sans">
                                <span class="badge bg-<?= $st['color'] ?>-subtle text-<?= $st['color'] ?> border border-<?= $st['color'] ?>-subtle px-2 py-1">
                                    <?= e($st['label']) ?>
                                </span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once __DIR__ . '/../core/footer.php'; ?>
