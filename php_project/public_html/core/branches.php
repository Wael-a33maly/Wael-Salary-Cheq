<?php
/**
 * إدارة الفروع — النواة المشتركة
 * قائمة، إضافة، تعديل، إيقاف، وحذف مع حظر الحذف عند ارتباط موظفين أو أقسام
 */

declare(strict_types=1);

$pageTitle = 'إدارة الفروع';
$activeNav = 'branches';

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

// معالجة طلبات POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'create') {
        $name = trim($_POST['name'] ?? '');
        $code = strtoupper(trim($_POST['code'] ?? ''));
        $status = in_array($_POST['status'] ?? '', ['active', 'inactive'], true) ? $_POST['status'] : 'active';
        $notes = trim($_POST['notes'] ?? '');

        if (empty($name) || empty($code)) {
            $errorMsg = 'يرجى إدخال اسم الفرع وكود الفرع.';
        } else {
            try {
                // فحص تكرار الكود
                $check = $pdo->prepare("SELECT id FROM branches WHERE code = :code LIMIT 1");
                $check->execute([':code' => $code]);
                if ($check->fetch()) {
                    $errorMsg = 'كود الفرع مستخدم مسبقاً، يرجى اختيار كود فريد.';
                } else {
                    $stmt = $pdo->prepare("INSERT INTO branches (name, code, status, notes) VALUES (:name, :code, :status, :notes)");
                    $stmt->execute([
                        ':name' => $name,
                        ':code' => $code,
                        ':status' => $status,
                        ':notes' => $notes,
                    ]);
                    $newId = (int)$pdo->lastInsertId();
                    logAuditEvent($pdo, $currentUser['id'], 'BRANCH_CREATE', 'branches', $newId, null, [
                        'name' => $name, 'code' => $code, 'status' => $status
                    ]);
                    $successMsg = 'تمت إضافة الفرع بنجاح.';
                }
            } catch (Throwable $e) {
                $errorMsg = 'خطأ أثناء الإضافة: ' . $e->getMessage();
            }
        }
    } elseif ($action === 'update') {
        $id = (int)($_POST['id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $code = strtoupper(trim($_POST['code'] ?? ''));
        $status = in_array($_POST['status'] ?? '', ['active', 'inactive'], true) ? $_POST['status'] : 'active';
        $notes = trim($_POST['notes'] ?? '');

        if ($id <= 0 || empty($name) || empty($code)) {
            $errorMsg = 'بيانات الفرع غير صالحة.';
        } else {
            try {
                $oldStmt = $pdo->prepare("SELECT * FROM branches WHERE id = :id LIMIT 1");
                $oldStmt->execute([':id' => $id]);
                $oldBranch = $oldStmt->fetch();

                if (!$oldBranch) {
                    $errorMsg = 'الفرع المحدد غير موجود.';
                } else {
                    $check = $pdo->prepare("SELECT id FROM branches WHERE code = :code AND id != :id LIMIT 1");
                    $check->execute([':code' => $code, ':id' => $id]);
                    if ($check->fetch()) {
                        $errorMsg = 'كود الفرع مستخدم مسبقاً لفرع آخر.';
                    } else {
                        $stmt = $pdo->prepare("UPDATE branches SET name = :name, code = :code, status = :status, notes = :notes WHERE id = :id");
                        $stmt->execute([
                            ':name' => $name,
                            ':code' => $code,
                            ':status' => $status,
                            ':notes' => $notes,
                            ':id' => $id,
                        ]);
                        logAuditEvent($pdo, $currentUser['id'], 'BRANCH_UPDATE', 'branches', $id, $oldBranch, [
                            'name' => $name, 'code' => $code, 'status' => $status
                        ]);
                        $successMsg = 'تم تحديث بيانات الفرع بنجاح.';
                    }
                }
            } catch (Throwable $e) {
                $errorMsg = 'خطأ أثناء التحديث: ' . $e->getMessage();
            }
        }
    } elseif ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            $errorMsg = 'معرف الفرع غير صالح.';
        } else {
            // فحص الارتباط بالأقسام والموظفين
            $deptCountStmt = $pdo->prepare("SELECT COUNT(*) FROM departments WHERE branch_id = :id");
            $deptCountStmt->execute([':id' => $id]);
            $deptCount = (int)$deptCountStmt->fetchColumn();

            $empCountStmt = $pdo->prepare("SELECT COUNT(*) FROM employees WHERE branch_id = :id");
            $empCountStmt->execute([':id' => $id]);
            $empCount = (int)$empCountStmt->fetchColumn();

            if ($deptCount > 0 || $empCount > 0) {
                $errorMsg = "لا يمكن حذف هذا الفرع لارتباطه بـ ({$deptCount}) أقسام و ({$empCount}) موظفين. يمكنك تغيير حالته إلى «موقوف» بدلاً من ذلك.";
            } else {
                try {
                    $oldStmt = $pdo->prepare("SELECT * FROM branches WHERE id = :id");
                    $oldStmt->execute([':id' => $id]);
                    $oldBranch = $oldStmt->fetch();

                    $delStmt = $pdo->prepare("DELETE FROM branches WHERE id = :id");
                    $delStmt->execute([':id' => $id]);
                    logAuditEvent($pdo, $currentUser['id'], 'BRANCH_DELETE', 'branches', $id, $oldBranch, null);
                    $successMsg = 'تم حذف الفرع بنجاح.';
                } catch (Throwable $e) {
                    $errorMsg = 'خطأ أثناء الحذف: ' . $e->getMessage();
                }
            }
        }
    }
}

// البحث والفلترة
$search = trim($_GET['search'] ?? '');
$statusFilter = trim($_GET['status'] ?? '');

$query = "
    SELECT b.*, 
           (SELECT COUNT(*) FROM departments WHERE branch_id = b.id) AS dept_count,
           (SELECT COUNT(*) FROM employees WHERE branch_id = b.id AND status = 'active') AS emp_count
    FROM branches b
    WHERE 1=1
";
$params = [];

if ($search !== '') {
    $query .= " AND (b.name LIKE :search OR b.code LIKE :search)";
    $params[':search'] = "%{$search}%";
}
if ($statusFilter === 'active' || $statusFilter === 'inactive') {
    $query .= " AND b.status = :status";
    $params[':status'] = $statusFilter;
}
$query .= " ORDER BY b.id ASC";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$branches = $stmt->fetchAll();

require_once __DIR__ . '/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
    <div>
        <h3 class="fw-bold mb-1">🏢 إدارة الفروع</h3>
        <p class="text-muted small mb-0">تهيئة وإدارة فروع الشركة والمؤسسة مع كود مميز لكل فرع</p>
    </div>
    <button type="button" class="btn btn-primary fw-bold" data-bs-toggle="modal" data-bs-target="#createBranchModal">
        + إضافة فرع جديد
    </button>
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

<!-- شريط البحث والفلترة -->
<div class="card p-3 mb-4">
    <form method="GET" class="row g-2 align-items-center">
        <div class="col-md-5">
            <input type="text" name="search" class="form-control form-control-sm" placeholder="ابحث باسم الفرع أو الكود..." value="<?= e($search) ?>">
        </div>
        <div class="col-md-3">
            <select name="status" class="form-select form-select-sm">
                <option value="">جميع الحالات</option>
                <option value="active" <?= $statusFilter === 'active' ? 'selected' : '' ?>>نشط فقط</option>
                <option value="inactive" <?= $statusFilter === 'inactive' ? 'selected' : '' ?>>موقوف فقط</option>
            </select>
        </div>
        <div class="col-md-4 d-flex gap-2">
            <button type="submit" class="btn btn-dark btn-sm px-3">بحث وفلترة</button>
            <?php if ($search !== '' || $statusFilter !== ''): ?>
                <a href="branches.php" class="btn btn-outline-secondary btn-sm">إلغاء الفلترة</a>
            <?php endif; ?>
        </div>
    </form>
</div>

<!-- جدول الفروع -->
<div class="card overflow-hidden">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light small">
                <tr>
                    <th>#</th>
                    <th>كود الفرع</th>
                    <th>اسم الفرع</th>
                    <th>الأقسام</th>
                    <th>الموظفون النشطون</th>
                    <th>الحالة</th>
                    <th>ملاحظات</th>
                    <th class="text-center">الإجراءات</th>
                </tr>
            </thead>
            <tbody class="small">
                <?php if (empty($branches)): ?>
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">لا توجد فروع مسجلة مطابقة للبحث</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($branches as $branch): ?>
                        <tr>
                            <td><?= (int)$branch['id'] ?></td>
                            <td><span class="badge bg-secondary font-mono px-2"><?= e($branch['code']) ?></span></td>
                            <td class="fw-bold"><?= e($branch['name']) ?></td>
                            <td>
                                <a href="departments.php?branch_id=<?= (int)$branch['id'] ?>" class="badge bg-primary-subtle text-primary border text-decoration-none">
                                    <?= (int)$branch['dept_count'] ?> قسم
                                </a>
                            </td>
                            <td>
                                <a href="employees.php?branch_id=<?= (int)$branch['id'] ?>" class="badge bg-success-subtle text-success border text-decoration-none">
                                    <?= (int)$branch['emp_count'] ?> موظف
                                </a>
                            </td>
                            <td>
                                <?php if ($branch['status'] === 'active'): ?>
                                    <span class="badge bg-success">نشط</span>
                                <?php else: ?>
                                    <span class="badge bg-secondary">موقوف</span>
                                <?php endif; ?>
                            </td>
                            <td class="text-muted"><?= e($branch['notes'] ?: '—') ?></td>
                            <td class="text-center">
                                <button type="button" class="btn btn-outline-primary btn-sm px-2 py-0.5 me-1" 
                                        onclick='editBranch(<?= json_encode($branch, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>)'>
                                    تعديل
                                </button>
                                <button type="button" class="btn btn-outline-danger btn-sm px-2 py-0.5" 
                                        onclick="confirmDeleteBranch(<?= (int)$branch['id'] ?>, '<?= e($branch['name']) ?>', <?= (int)$branch['dept_count'] ?>, <?= (int)$branch['emp_count'] ?>)">
                                    حذف
                                </button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- مودال إضافة فرع -->
<div class="modal fade" id="createBranchModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form method="POST">
                <?= csrfField() ?>
                <input type="hidden" name="action" value="create">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">إضافة فرع جديد</h5>
                    <button type="button" class="btn-close ms-0 me-auto" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                </div>
                <div class="modal-body space-y-3">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">اسم الفرع <span class="text-danger">*</span></label>
                        <input type="text" name="name" class="form-control" required placeholder="مثال: الفرع الرئيسي — الكويت">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">كود الفرع (فريد) <span class="text-danger">*</span></label>
                        <input type="text" name="code" class="form-control font-mono" required placeholder="مثال: KW-MAIN" style="text-transform: uppercase;">
                        <span class="form-text small">رمز باللغة الإنجليزية يميّز الفرع في التقارير</span>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">الحالة</label>
                        <select name="status" class="form-select">
                            <option value="active">نشط</option>
                            <option value="inactive">موقوف</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">ملاحظات</label>
                        <textarea name="notes" class="form-control" rows="2" placeholder="ملاحظات أو موقع الفرع..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">إلغاء</button>
                    <button type="submit" class="btn btn-primary fw-bold">حفظ الفرع</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- مودال تعديل فرع -->
<div class="modal fade" id="editBranchModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form method="POST">
                <?= csrfField() ?>
                <input type="hidden" name="action" value="update">
                <input type="hidden" name="id" id="edit_branch_id">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">تعديل بيانات الفرع</h5>
                    <button type="button" class="btn-close ms-0 me-auto" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                </div>
                <div class="modal-body space-y-3">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">اسم الفرع <span class="text-danger">*</span></label>
                        <input type="text" name="name" id="edit_branch_name" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">كود الفرع <span class="text-danger">*</span></label>
                        <input type="text" name="code" id="edit_branch_code" class="form-control font-mono" required style="text-transform: uppercase;">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">الحالة</label>
                        <select name="status" id="edit_branch_status" class="form-select">
                            <option value="active">نشط</option>
                            <option value="inactive">موقوف</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">ملاحظات</label>
                        <textarea name="notes" id="edit_branch_notes" class="form-control" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">إلغاء</button>
                    <button type="submit" class="btn btn-primary fw-bold">حفظ التعديلات</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- نموذج حذف الفرع المخفي -->
<form id="deleteBranchForm" method="POST" style="display:none;">
    <?= csrfField() ?>
    <input type="hidden" name="action" value="delete">
    <input type="hidden" name="id" id="delete_branch_id">
</form>

<script>
function editBranch(branch) {
    document.getElementById('edit_branch_id').value = branch.id;
    document.getElementById('edit_branch_name').value = branch.name;
    document.getElementById('edit_branch_code').value = branch.code;
    document.getElementById('edit_branch_status').value = branch.status;
    document.getElementById('edit_branch_notes').value = branch.notes || '';
    new bootstrap.Modal(document.getElementById('editBranchModal')).show();
}

function confirmDeleteBranch(id, name, depts, emps) {
    if (depts > 0 || emps > 0) {
        alert('تحذير: لا يمكن حذف الفرع «' + name + '» لوجود ' + depts + ' أقسام و ' + emps + ' موظفين مرتبطين به. يرجى إيقاف الفرع بدلاً من حذفه.');
        return;
    }
    if (confirm('هل أنت متأكد من رغبتك في حذف الفرع «' + name + '» نهائياً؟')) {
        document.getElementById('delete_branch_id').value = id;
        document.getElementById('deleteBranchForm').submit();
    }
}
</script>

<?php require_once __DIR__ . '/footer.php'; ?>
