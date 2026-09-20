<?php
/**
 * سجل التدقيق وتتبع العمليات (audit_log) — النواة المشتركة
 * فلترة بالعملية، الجدول، المستخدم، والتاريخ مع عرض التغييرات (قبل/بعد) بشكل مقروء
 */

declare(strict_types=1);

$pageTitle = 'سجل التعديلات والتدقيق';
$activeNav = 'audit';

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/helpers.php';

requireAuth();

$pdo = getDbConnection();

// الفلاتر
$actionFilter = trim($_GET['action'] ?? '');
$tableFilter = trim($_GET['table'] ?? '');
$dateFrom = trim($_GET['date_from'] ?? '');
$dateTo = trim($_GET['date_to'] ?? '');

$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = 25;
$offset = ($page - 1) * $perPage;

$where = ["1=1"];
$params = [];

if ($actionFilter !== '') {
    $where[] = "a.action = :act";
    $params[':act'] = $actionFilter;
}
if ($tableFilter !== '') {
    $where[] = "a.table_name = :tbl";
    $params[':tbl'] = $tableFilter;
}
if ($dateFrom !== '') {
    $where[] = "DATE(a.created_at) >= :d_from";
    $params[':d_from'] = $dateFrom;
}
if ($dateTo !== '') {
    $where[] = "DATE(a.created_at) <= :d_to";
    $params[':d_to'] = $dateTo;
}

$whereSql = implode(" AND ", $where);

// عدد السجلات
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM audit_log a WHERE {$whereSql}");
$countStmt->execute($params);
$totalLogs = (int)$countStmt->fetchColumn();
$totalPages = max(1, (int)ceil($totalLogs / $perPage));

// جلب السجلات
$query = "
    SELECT a.*, u.username, u.full_name
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE {$whereSql}
    ORDER BY a.id DESC
    LIMIT {$perPage} OFFSET {$offset}
";
$stmt = $pdo->prepare($query);
$stmt->execute($params);
$logs = $stmt->fetchAll();

// جلب قائمة العمليات والجداول الفريدة للاختيار
$actionsList = $pdo->query("SELECT DISTINCT action FROM audit_log ORDER BY action ASC")->fetchAll(PDO::FETCH_COLUMN);
$tablesList = $pdo->query("SELECT DISTINCT table_name FROM audit_log WHERE table_name IS NOT NULL ORDER BY table_name ASC")->fetchAll(PDO::FETCH_COLUMN);

require_once __DIR__ . '/header.php';
?>

<div class="mb-4">
    <h3 class="fw-bold mb-1">📜 سجل التعديلات والتدقيق (Audit Trail)</h3>
    <p class="text-muted small mb-0">تتبع كامل لكل العمليات المالية والإدارية وتفاصيل القيم قبل وبعد التعديل مع IP المستخدم</p>
</div>

<!-- شريط الفلترة -->
<div class="card p-3 mb-4">
    <form method="GET" class="row g-2 align-items-center">
        <div class="col-md-3">
            <select name="action" class="form-select form-select-sm">
                <option value="">جميع العمليات</option>
                <?php foreach ($actionsList as $act): ?>
                    <option value="<?= e($act) ?>" <?= $actionFilter === $act ? 'selected' : '' ?>><?= e($act) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-3">
            <select name="table" class="form-select form-select-sm">
                <option value="">جميع الجداول</option>
                <?php foreach ($tablesList as $tbl): ?>
                    <option value="<?= e($tbl) ?>" <?= $tableFilter === $tbl ? 'selected' : '' ?>><?= e($tbl) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-2">
            <input type="date" name="date_from" class="form-control form-control-sm" value="<?= e($dateFrom) ?>" title="من تاريخ">
        </div>
        <div class="col-md-2">
            <input type="date" name="date_to" class="form-control form-control-sm" value="<?= e($dateTo) ?>" title="إلى تاريخ">
        </div>
        <div class="col-md-2 d-flex gap-1">
            <button type="submit" class="btn btn-dark btn-sm flex-grow-1">تصفية</button>
            <?php if ($actionFilter !== '' || $tableFilter !== '' || $dateFrom !== '' || $dateTo !== ''): ?>
                <a href="audit_view.php" class="btn btn-outline-secondary btn-sm">إلغاء</a>
            <?php endif; ?>
        </div>
    </form>
</div>

<!-- جدول السجلات -->
<div class="card overflow-hidden">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light small">
                <tr>
                    <th>#</th>
                    <th>المستخدم</th>
                    <th>نوع الإجراء</th>
                    <th>الجدول</th>
                    <th>معرف السجل</th>
                    <th>عنوان IP</th>
                    <th>التاريخ والوقت</th>
                    <th class="text-center">التفاصيل (قبل / بعد)</th>
                </tr>
            </thead>
            <tbody class="small">
                <?php if (empty($logs)): ?>
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">لا توجد عمليات مسجلة مطابقة للبحث</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($logs as $log): ?>
                        <tr>
                            <td><?= (int)$log['id'] ?></td>
                            <td>
                                <span class="fw-bold"><?= e($log['full_name'] ?: ($log['username'] ?: 'النظام')) ?></span>
                            </td>
                            <td>
                                <span class="badge bg-primary-subtle text-primary border font-mono">
                                    <?= e($log['action']) ?>
                                </span>
                            </td>
                            <td><code class="text-secondary"><?= e($log['table_name'] ?: '—') ?></code></td>
                            <td class="font-mono"><?= $log['record_id'] ? '#' . (int)$log['record_id'] : '—' ?></td>
                            <td class="font-mono text-muted"><?= e($log['ip_address'] ?: '—') ?></td>
                            <td class="font-mono text-muted"><?= e($log['created_at']) ?></td>
                            <td class="text-center">
                                <?php if (!empty($log['old_values']) || !empty($log['new_values'])): ?>
                                    <button type="button" class="btn btn-outline-secondary btn-sm px-2 py-0.5" 
                                            onclick='showDiffModal(<?= json_encode($log, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>)'>
                                        عرض التغييرات
                                    </button>
                                <?php else: ?>
                                    <span class="text-muted">—</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>

    <!-- ترقيم الصفحات -->
    <?php if ($totalPages > 1): ?>
        <div class="p-3 border-top d-flex justify-content-between align-items-center small">
            <span class="text-muted">إجمالي الحركات: <?= $totalLogs ?></span>
            <ul class="pagination pagination-sm mb-0">
                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                    <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                        <a class="page-link" href="?page=<?= $i ?>&action=<?= urlencode($actionFilter) ?>&table=<?= urlencode($tableFilter) ?>&date_from=<?= urlencode($dateFrom) ?>&date_to=<?= urlencode($dateTo) ?>"><?= $i ?></a>
                    </li>
                <?php endfor; ?>
            </ul>
        </div>
    <?php endif; ?>
</div>

<!-- مودال عرض الفروق -->
<div class="modal fade" id="diffModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title fw-bold" id="diffModalTitle">تفاصيل العملية</h5>
                <button type="button" class="btn-close ms-0 me-auto" data-bs-dismiss="modal" aria-label="إغلاق"></button>
            </div>
            <div class="modal-body">
                <div class="row g-3">
                    <div class="col-md-6">
                        <h6 class="fw-bold text-danger small">القيم السابقة (قبل التعديل):</h6>
                        <pre id="oldValuesPre" class="p-3 bg-light rounded border text-danger small font-mono dir-ltr text-start overflow-auto" style="max-height: 250px;"></pre>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold text-success small">القيم الجديدة (بعد التعديل):</h6>
                        <pre id="newValuesPre" class="p-3 bg-light rounded border text-success small font-mono dir-ltr text-start overflow-auto" style="max-height: 250px;"></pre>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
            </div>
        </div>
    </div>
</div>

<script>
function showDiffModal(log) {
    document.getElementById('diffModalTitle').textContent = 'تفاصيل العملية #' + log.id + ' — ' + log.action;
    
    let oldObj = '— لا توجد قيم سابقة —';
    let newObj = '— لا توجد قيم جديدة —';
    
    try {
        if (log.old_values) {
            oldObj = JSON.stringify(JSON.parse(log.old_values), null, 2);
        }
    } catch(e) { oldObj = log.old_values; }

    try {
        if (log.new_values) {
            newObj = JSON.stringify(JSON.parse(log.new_values), null, 2);
        }
    } catch(e) { newObj = log.new_values; }

    document.getElementById('oldValuesPre').textContent = oldObj;
    document.getElementById('newValuesPre').textContent = newObj;
    new bootstrap.Modal(document.getElementById('diffModal')).show();
}
</script>

<?php require_once __DIR__ . '/footer.php'; ?>
