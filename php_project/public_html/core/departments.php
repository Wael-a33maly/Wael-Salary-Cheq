<?php
/**
 * إدارة الأقسام — النواة المشتركة
 * قائمة، إضافة، تعديل، حذف، وفلترة حسب الفرع مع دعم جلب الأقسام عبر AJAX
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/audit.php';
require_once __DIR__ . '/helpers.php';

requireAuth();

$pdo = getDbConnection();
$currentUser = getCurrentUser();

// دعم طلبات AJAX لجلب أقسام فرع محدد (يُستخدم في شاشة الموظفين)
if (isset($_GET['ajax']) && $_GET['ajax'] === 'by_branch') {
    header('Content-Type: application/json; charset=utf-8');
    $branchId = (int)($_GET['branch_id'] ?? 0);
    if ($branchId > 0) {
        $stmt = $pdo->prepare("SELECT id, name FROM departments WHERE branch_id = :b_id AND status = 'active' ORDER BY name ASC");
        $stmt->execute([':b_id' => $branchId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        echo json_encode([]);
    }
    exit;
}

$pageTitle = 'إدارة الأقسام';
$activeNav = 'departments';
$errorMsg = '';
$successMsg = '';

// معالجة طلبات POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'create') {
        $branchId = (int)($_POST['branch_id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $status = in_array($_POST['status'] ?? '', ['active', 'inactive'], true) ? $_POST['status'] : 'active';

        if ($branchId <= 0 || empty($name)) {
            $errorMsg = 'يرجى اختيار الفرع وإدخال اسم القسم.';
        } else {
            try {
                $stmt = $pdo->prepare("INSERT INTO departments (branch_id, name, status) VALUES (:branch_id, :name, :status)");
                $stmt->execute([
                    ':branch_id' => $branchId,
                    ':name'      => $name,
                    ':status'    => $status,
                ]);
                $newId = (int)$pdo->lastInsertId();
                logAuditEvent($pdo, $currentUser['id'], 'DEPARTMENT_CREATE', 'departments', $newId, null, [
                    'branch_id' => $branchId, 'name' => $name, 'status' => $status
                ]);
                $successMsg = 'تمت إضافة القسم بنجاح.';
            } catch (Throwable $e) {
                $errorMsg = 'خطأ أثناء الإضافة: ' . $e->getMessage();
            }
        }
    } elseif ($action === 'update') {
        $id = (int)($_POST['id'] ?? 0);
        $branchId = (int)($_POST['branch_id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $status = in_array($_POST['status'] ?? '', ['active', 'inactive'], true) ? $_POST['status'] : 'active';

        if ($id <= 0 || $branchId <= 0 || empty($name)) {
            $errorMsg = 'بيانات القسم غير صالحة.';
        } else {
            try {
                $oldStmt = $pdo->prepare("SELECT * FROM departments WHERE id = :id");
                $oldStmt->execute([':id' => $id]);
                $oldDept = $oldStmt->fetch();

                if (!$oldDept) {
                    $errorMsg = 'القسم المحدد غير موجود.';
                } else {
                    $stmt = $pdo->prepare("UPDATE departments SET branch_id = :branch_id, name = :name, status = :status WHERE id = :id");
                    $stmt->execute([
                        ':branch_id' => $branchId,
                        ':name'      => $name,
                        ':status'    => $status,
                        ':id'        => $id,
                    ]);
                    logAuditEvent($pdo, $currentUser['id'], 'DEPARTMENT_UPDATE', 'departments', $id, $oldDept, [
                        'branch_id' => $branchId, 'name' => $name, 'status' => $status
                    ]);
                    $successMsg = 'تم تحديث بيانات القسم بنجاح.';
                }
            } catch (Throwable $e) {
                $errorMsg = 'خطأ أثناء التحديث: ' . $e->getMessage();
            }
        }
    } elseif ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            $errorMsg = 'معرف القسم غير صالح.';
        } else {
            $empCountStmt = $pdo->prepare("SELECT COUNT(*) FROM employees WHERE department_id = :id");
            $empCountStmt->execute([':id' => $id]);
            $empCount = (int)$empCountStmt->fetchColumn();

            if ($empCount > 0) {
                $errorMsg = "لا يمكن حذف هذا القسم لارتباط ({$empCount}) موظفين به. يرجى نقلهم أولاً أو إيقاف القسم.";
            } else {
                try {
                    $oldStmt = $pdo->prepare("SELECT * FROM departments WHERE id = :id");
                    $oldStmt->execute([':id' => $id]);
                    $oldDept = $oldStmt->fetch();

                    $delStmt = $pdo->prepare("DELETE FROM departments WHERE id = :id");
                    $delStmt->execute([':id' => $id]);
                    logAuditEvent($pdo, $currentUser['id'], 'DEPARTMENT_DELETE', 'departments', $id, $oldDept, null);
                    $successMsg = 'تم حذف القسم بنجاح.';
                } catch (Throwable $e) {
                    $errorMsg = 'خطأ أثناء الحذف: ' . $e->getMessage();
                }
            }
        }
    }
}

// جلب قائمة الفروع النشطة للاختيار
$branchesStmt = $pdo->query("SELECT id, name, code FROM branches ORDER BY id ASC");
$allBranches = $branchesStmt->fetchAll();

// الفلترة والبحث
$branchFilter = (int)($_GET['branch_id'] ?? 0);
$search = trim($_GET['search'] ?? '');

$query = "
    SELECT d.*, b.name AS branch_name, b.code AS branch_code,
           (SELECT COUNT(*) FROM employees WHERE department_id = d.id AND status = 'active') AS emp_count
    FROM departments d
    JOIN branches b ON b.id = d.branch_id
    WHERE 1=1
";
$params = [];

if ($branchFilter > 0) {
    $query .= " AND d.branch_id = :b_id";
    $params[':b_id'] = $branchFilter;
}
if ($search !== '') {
    $query .= " AND d.name LIKE :search";
    $params[':search'] = "%{$search}%";
}
$query .= " ORDER BY b.name ASC, d.name ASC";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$departments = $stmt->fetchAll();

require_once __DIR__ . '/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
    <div>
        <h3 class="fw-bold mb-1">📂 إدارة الأقسام</h3>
        <p class="text-muted small mb-0">تنظيم وتوزيع الأقسام الوظيفية وربطها التلقائي بالفروع التابعة لها</p>
    </div>
    <button type="button" class="btn btn-primary fw-bold" data-bs-toggle="modal" data-bs-target="#createDeptModal">
        + إضافة قسم جديد
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

<!-- شريط الفلترة -->
<div class="card p-3 mb-4">
    <form method="GET" class="row g-2 align-items-center">
        <div class="col-md-4">
            <select name="branch_id" class="form-select form-select-sm">
                <option value="">جميع الفروع</option>
                <?php foreach ($allBranches as $b): ?>
                    <option value="<?= (int)$b['id'] ?>" <?= $branchFilter === (int)$b['id'] ? 'selected' : '' ?>>
                        <?= e($b['name']) ?> (<?= e($b['code']) ?>)
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-5">
            <input type="text" name="search" class="form-control form-control-sm" placeholder="ابحث باسم القسم..." value="<?= e($search) ?>">
        </div>
        <div class="col-md-3 d-flex gap-2">
            <button type="submit" class="btn btn-dark btn-sm px-3">فلترة</button>
            <?php if ($branchFilter > 0 || $search !== ''): ?>
                <a href="departments.php" class="btn btn-outline-secondary btn-sm">إلغاء</a>
            <?php endif; ?>
        </div>
    </form>
</div>

<!-- جدول الأقسام -->
<div class="card overflow-hidden">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light small">
                <tr>
                    <th>#</th>
                    <th>الفرع التابع</th>
                    <th>اسم القسم</th>
                    <th>الموظفون النشطون</th>
                    <th>الحالة</th>
                    <th class="text-center">الإجراءات</th>
                </tr>
            </thead>
            <tbody class="small">
                <?php if (empty($departments)): ?>
                    <tr>
                        <td colspan="6" class="text-center py-4 text-muted">لا توجد أقسام مسجلة مطابقة للفلترة</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($departments as $dept): ?>
                        <tr>
                            <td><?= (int)$dept['id'] ?></td>
                            <td>
                                <span class="badge bg-secondary-subtle text-dark border">
                                    🏢 <?= e($dept['branch_name']) ?>
                                </span>
                            </td>
                            <td class="fw-bold"><?= e($dept['name']) ?></td>
                            <td>
                                <a href="employees.php?department_id=<?= (int)$dept['id'] ?>" class="badge bg-success-subtle text-success border text-decoration-none">
                                    <?= (int)$dept['emp_count'] ?> موظف
                                </a>
                            </td>
                            <td>
                                <?php if ($dept['status'] === 'active'): ?>
                                    <span class="badge bg-success">نشط</span>
                                <?php else: ?>
                                    <span class="badge bg-secondary">موقوف</span>
                                <?php endif; ?>
                            </td>
                            <td class="text-center">
                                <button type="button" class="btn btn-outline-primary btn-sm px-2 py-0.5 me-1" 
                                        onclick='editDept(<?= json_encode($dept, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>)'>
                                    تعديل
                                </button>
                                <button type="button" class="btn btn-outline-danger btn-sm px-2 py-0.5" 
                                        onclick="confirmDeleteDept(<?= (int)$dept['id'] ?>, '<?= e($dept['name']) ?>', <?= (int)$dept['emp_count'] ?>)">
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

<!-- مودال إضافة قسم -->
<div class="modal fade" id="createDeptModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form method="POST">
                <?= csrfField() ?>
                <input type="hidden" name="action" value="create">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">إضافة قسم جديد</h5>
                    <button type="button" class="btn-close ms-0 me-auto" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                </div>
                <div class="modal-body space-y-3">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">الفرع التابع له <span class="text-danger">*</span></label>
                        <select name="branch_id" class="form-select" required>
                            <option value="">اختر الفرع...</option>
                            <?php foreach ($allBranches as $b): ?>
                                <option value="<?= (int)$b['id'] ?>"><?= e($b['name']) ?> (<?= e($b['code']) ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">اسم القسم <span class="text-danger">*</span></label>
                        <input type="text" name="name" class="form-control" required placeholder="مثال: قسم المبيعات / تقنية المعلومات">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">الحالة</label>
                        <select name="status" class="form-select">
                            <option value="active">نشط</option>
                            <option value="inactive">موقوف</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">إلغاء</button>
                    <button type="submit" class="btn btn-primary fw-bold">حفظ القسم</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- مودال تعديل قسم -->
<div class="modal fade" id="editDeptModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form method="POST">
                <?= csrfField() ?>
                <input type="hidden" name="action" value="update">
                <input type="hidden" name="id" id="edit_dept_id">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">تعديل بيانات القسم</h5>
                    <button type="button" class="btn-close ms-0 me-auto" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                </div>
                <div class="modal-body space-y-3">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">الفرع التابع له <span class="text-danger">*</span></label>
                        <select name="branch_id" id="edit_dept_branch_id" class="form-select" required>
                            <?php foreach ($allBranches as $b): ?>
                                <option value="<?= (int)$b['id'] ?>"><?= e($b['name']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">اسم القسم <span class="text-danger">*</span></label>
                        <input type="text" name="name" id="edit_dept_name" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">الحالة</label>
                        <select name="status" id="edit_dept_status" class="form-select">
                            <option value="active">نشط</option>
                            <option value="inactive">موقوف</option>
                        </select>
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

<form id="deleteDeptForm" method="POST" style="display:none;">
    <?= csrfField() ?>
    <input type="hidden" name="action" value="delete">
    <input type="hidden" name="id" id="delete_dept_id">
</form>

<script>
function editDept(dept) {
    document.getElementById('edit_dept_id').value = dept.id;
    document.getElementById('edit_dept_branch_id').value = dept.branch_id;
    document.getElementById('edit_dept_name').value = dept.name;
    document.getElementById('edit_dept_status').value = dept.status;
    new bootstrap.Modal(document.getElementById('editDeptModal')).show();
}

function confirmDeleteDept(id, name, emps) {
    if (emps > 0) {
        alert('تحذير: لا يمكن حذف القسم «' + name + '» لوجود ' + emps + ' موظفين مرتبطين به.');
        return;
    }
    if (confirm('هل أنت متأكد من رغبتك في حذف القسم «' + name + '» نهائياً؟')) {
        document.getElementById('delete_dept_id').value = id;
        document.getElementById('deleteDeptForm').submit();
    }
}
</script>

<?php require_once __DIR__ . '/footer.php'; ?>
