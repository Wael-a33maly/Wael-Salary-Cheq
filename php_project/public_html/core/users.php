<?php
/**
 * إدارة مستخدمي النظام والصلاحيات — النواة المشتركة
 * إنشاء وتعديل المستخدمين (admin, accountant, viewer) وتغيير كلمات المرور مع تتبع في audit_log
 */

declare(strict_types=1);

$pageTitle = 'إدارة المستخدمين والصلاحيات';
$activeNav = 'users';

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

// المعالجة البرمجية للعمليات
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'create_user') {
        $username = trim($_POST['username'] ?? '');
        $fullName = trim($_POST['full_name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $role = $_POST['role'] ?? 'accountant';
        $password = $_POST['password'] ?? '';
        $branchId = !empty($_POST['branch_id']) ? (int)$_POST['branch_id'] : null;

        if (empty($username) || empty($fullName) || empty($password)) {
            $errorMsg = 'اسم المستخدم والاسم الكامل وكلمة المرور حقول إلزامية.';
        } elseif (strlen($password) < 6) {
            $errorMsg = 'كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام.';
        } else {
            try {
                // التحقق من عدم التكرار
                $check = $pdo->prepare("SELECT id FROM users WHERE username = :u");
                $check->execute([':u' => $username]);
                if ($check->fetch()) {
                    $errorMsg = 'اسم المستخدم مستخدم مسبقاً، يرجى اختيار اسم آخر.';
                } else {
                    $hash = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $pdo->prepare("
                        INSERT INTO users (username, password_hash, full_name, email, role, branch_id, status)
                        VALUES (:u, :h, :fn, :em, :r, :b, 'active')
                    ");
                    $stmt->execute([
                        ':u'  => $username,
                        ':h'  => $hash,
                        ':fn' => $fullName,
                        ':em' => $email,
                        ':r'  => $role,
                        ':b'  => $branchId
                    ]);
                    $newId = (int)$pdo->lastInsertId();

                    logAuditEvent($pdo, $currentUser['id'], 'USER_CREATE', 'users', $newId, null, [
                        'username' => $username, 'role' => $role
                    ]);
                    $successMsg = 'تم إنشاء المستخدم بنجاح.';
                }
            } catch (Throwable $e) {
                $errorMsg = 'خطأ أثناء إنشاء المستخدم: ' . $e->getMessage();
            }
        }
    } elseif ($action === 'edit_user') {
        $id = (int)($_POST['id'] ?? 0);
        $fullName = trim($_POST['full_name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $role = $_POST['role'] ?? 'accountant';
        $status = $_POST['status'] ?? 'active';
        $branchId = !empty($_POST['branch_id']) ? (int)$_POST['branch_id'] : null;
        $newPass = $_POST['new_password'] ?? '';

        if ($id <= 0 || empty($fullName)) {
            $errorMsg = 'بيانات المستخدم غير صالحة.';
        } else {
            try {
                $oldStmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
                $oldStmt->execute([':id' => $id]);
                $old = $oldStmt->fetch();

                if ($old) {
                    if (!empty($newPass)) {
                        if (strlen($newPass) < 6) {
                            $errorMsg = 'كلمة المرور يجب ألا تقل عن 6 خانات.';
                        } else {
                            $hash = password_hash($newPass, PASSWORD_DEFAULT);
                            $upPass = $pdo->prepare("UPDATE users SET password_hash = :h WHERE id = :id");
                            $upPass->execute([':h' => $hash, ':id' => $id]);
                        }
                    }

                    if (empty($errorMsg)) {
                        $stmt = $pdo->prepare("
                            UPDATE users SET 
                                full_name = :fn, email = :em, role = :r, status = :s, branch_id = :b
                            WHERE id = :id
                        ");
                        $stmt->execute([
                            ':fn' => $fullName,
                            ':em' => $email,
                            ':r'  => $role,
                            ':s'  => $status,
                            ':b'  => $branchId,
                            ':id' => $id
                        ]);

                        logAuditEvent($pdo, $currentUser['id'], 'USER_UPDATE', 'users', $id, $old, [
                            'full_name' => $fullName, 'role' => $role, 'status' => $status
                        ]);
                        $successMsg = 'تم تحديث بيانات المستخدم بنجاح.';
                    }
                }
            } catch (Throwable $e) {
                $errorMsg = 'خطأ أثناء التحديث: ' . $e->getMessage();
            }
        }
    }
}

$users = $pdo->query("
    SELECT u.*, b.name AS branch_name 
    FROM users u 
    LEFT JOIN branches b ON b.id = u.branch_id 
    ORDER BY u.id ASC
")->fetchAll();

$branches = $pdo->query("SELECT id, name FROM branches WHERE status = 'active' ORDER BY name ASC")->fetchAll();

require_once __DIR__ . '/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
    <div>
        <h3 class="fw-bold mb-1">👥 إدارة مستخدمي النظام</h3>
        <p class="text-muted small mb-0">التحكم بالمشرفين والمحاسبين والمشاهدين وتعيين الفروع والصلاحيات</p>
    </div>
    <div>
        <button type="button" class="btn btn-primary btn-sm fw-bold" data-bs-toggle="modal" data-bs-target="#addUserModal">
            + إضافة مستخدم جديد
        </button>
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

<div class="card overflow-hidden">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light small">
                <tr>
                    <th>#</th>
                    <th>اسم المستخدم</th>
                    <th>الاسم الكامل</th>
                    <th>البريد الإلكتروني</th>
                    <th>الدور والصلاحية</th>
                    <th>الفرع التابع له</th>
                    <th>الحالة</th>
                    <th>تاريخ التسجيل</th>
                    <th class="text-center">إجراءات</th>
                </tr>
            </thead>
            <tbody class="small">
                <?php foreach ($users as $u): ?>
                    <tr>
                        <td><?= (int)$u['id'] ?></td>
                        <td><strong class="font-mono text-dark"><?= e($u['username']) ?></strong></td>
                        <td class="fw-bold"><?= e($u['full_name'] ?: '—') ?></td>
                        <td class="font-mono text-muted"><?= e($u['email'] ?: '—') ?></td>
                        <td>
                            <?php if ($u['role'] === 'admin'): ?>
                                <span class="badge bg-danger-subtle text-danger border border-danger-subtle">مدير نظام (Admin)</span>
                            <?php elseif ($u['role'] === 'accountant'): ?>
                                <span class="badge bg-primary-subtle text-primary border border-primary-subtle">محاسب (Accountant)</span>
                            <?php else: ?>
                                <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">مشاهد (Viewer)</span>
                            <?php endif; ?>
                        </td>
                        <td><?= e($u['branch_name'] ?: 'كافة الفروع') ?></td>
                        <td>
                            <?php if ($u['status'] === 'active'): ?>
                                <span class="badge bg-success-subtle text-success">نشط</span>
                            <?php else: ?>
                                <span class="badge bg-danger-subtle text-danger">معطل</span>
                            <?php endif; ?>
                        </td>
                        <td class="font-mono text-muted"><?= e(substr($u['created_at'], 0, 10)) ?></td>
                        <td class="text-center">
                            <button type="button" class="btn btn-outline-secondary btn-sm px-2 py-0.5" onclick='openEditUserModal(<?= json_encode($u, JSON_HEX_APOS | JSON_HEX_QUOT) ?>)'>
                                تعديل
                            </button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- مودال إضافة مستخدم -->
<div class="modal fade" id="addUserModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form method="POST">
                <?= csrfField() ?>
                <input type="hidden" name="action" value="create_user">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">إضافة مستخدم جديد</h5>
                    <button type="button" class="btn-close ms-0 me-auto" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">اسم المستخدم (لتسجيل الدخول) <span class="text-danger">*</span></label>
                        <input type="text" name="username" class="form-control font-mono" required placeholder="admin_user">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">الاسم الكامل <span class="text-danger">*</span></label>
                        <input type="text" name="full_name" class="form-control" required placeholder="الاسم ثلاثي">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">البريد الإلكتروني</label>
                        <input type="email" name="email" class="form-control font-mono" placeholder="user@company.com">
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">الصلاحية / الدور <span class="text-danger">*</span></label>
                            <select name="role" class="form-select">
                                <option value="accountant">محاسب (Accountant)</option>
                                <option value="admin">مدير نظام (Admin)</option>
                                <option value="viewer">مشاهد فقط (Viewer)</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">الفرع (اختياري)</label>
                            <select name="branch_id" class="form-select">
                                <option value="">كافة الفروع</option>
                                <?php foreach ($branches as $b): ?>
                                    <option value="<?= (int)$b['id'] ?>"><?= e($b['name']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">كلمة المرور <span class="text-danger">*</span></label>
                        <input type="password" name="password" class="form-control font-mono" required minlength="6" placeholder="******">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                    <button type="submit" class="btn btn-primary fw-bold">حفظ المستخدم</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- مودال تعديل مستخدم -->
<div class="modal fade" id="editUserModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form method="POST">
                <?= csrfField() ?>
                <input type="hidden" name="action" value="edit_user">
                <input type="hidden" name="id" id="edit_user_id">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">تعديل بيانات المستخدم</h5>
                    <button type="button" class="btn-close ms-0 me-auto" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">الاسم الكامل <span class="text-danger">*</span></label>
                        <input type="text" name="full_name" id="edit_full_name" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">البريد الإلكتروني</label>
                        <input type="email" name="email" id="edit_email" class="form-control font-mono">
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">الدور</label>
                            <select name="role" id="edit_role" class="form-select">
                                <option value="accountant">محاسب</option>
                                <option value="admin">مدير نظام</option>
                                <option value="viewer">مشاهد</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">الحالة</label>
                            <select name="status" id="edit_status" class="form-select">
                                <option value="active">نشط</option>
                                <option value="inactive">معطل</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">الفرع</label>
                            <select name="branch_id" id="edit_branch_id" class="form-select">
                                <option value="">كافة الفروع</option>
                                <?php foreach ($branches as $b): ?>
                                    <option value="<?= (int)$b['id'] ?>"><?= e($b['name']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">كلمة مرور جديدة (اتركه فارغاً إن لم ترغب بتغييرها)</label>
                        <input type="password" name="new_password" class="form-control font-mono" minlength="6" placeholder="اتركه فارغاً للإبقاء على الحالية">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                    <button type="submit" class="btn btn-primary fw-bold">تحديث البيانات</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
function openEditUserModal(u) {
    document.getElementById('edit_user_id').value = u.id;
    document.getElementById('edit_full_name').value = u.full_name || '';
    document.getElementById('edit_email').value = u.email || '';
    document.getElementById('edit_role').value = u.role;
    document.getElementById('edit_status').value = u.status;
    document.getElementById('edit_branch_id').value = u.branch_id || '';
    new bootstrap.Modal(document.getElementById('editUserModal')).show();
}
</script>

<?php require_once __DIR__ . '/footer.php'; ?>
