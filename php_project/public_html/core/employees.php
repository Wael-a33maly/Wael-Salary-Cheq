<?php
/**
 * إدارة الموظفين — النواة المشتركة (القلب)
 * الرقم المدني (12 رقماً)، الفرع والقسم الديناميكي، تفاصيل البنك، الإقامات، وكارت الموظف مع ملخص آخر 3 قسائم
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

// دعم طلب AJAX لكارت الموظف وملخص آخر 3 قسائم رواتب
if (isset($_GET['ajax']) && $_GET['ajax'] === 'employee_card') {
    header('Content-Type: application/json; charset=utf-8');
    $empId = (int)($_GET['id'] ?? 0);
    if ($empId > 0) {
        $stmt = $pdo->prepare("
            SELECT e.*, b.name AS branch_name, b.code AS branch_code, d.name AS department_name
            FROM employees e
            JOIN branches b ON b.id = e.branch_id
            JOIN departments d ON d.id = e.department_id
            WHERE e.id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $empId]);
        $emp = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($emp) {
            // جلب آخر 3 قسائم رواتب للموظف
            $slipsStmt = $pdo->prepare("
                SELECT month, year, basic_salary, absent_days_deduction, absent_hours_deduction, 
                       overtime_amount, advance_deduction, net_salary, bank_amount, final_cash, rounding_diff
                FROM payslips 
                WHERE employee_id = :id 
                ORDER BY year DESC, month DESC 
                LIMIT 3
            ");
            $slipsStmt->execute([':id' => $empId]);
            $recentSlips = $slipsStmt->fetchAll(PDO::FETCH_ASSOC);

            $resStatus = getResidenceExpiryStatus($emp['residence_expiry_date']);
            echo json_encode([
                'success' => true,
                'employee' => $emp,
                'residence_status' => $resStatus,
                'recent_payslips' => $recentSlips
            ]);
            exit;
        }
    }
    echo json_encode(['success' => false, 'message' => 'الموظف غير موجود']);
    exit;
}

$pageTitle = 'إدارة الموظفين';
$activeNav = 'employees';
$errorMsg = '';
$successMsg = '';

// معالجة طلبات POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'create' || $action === 'update') {
        $id = (int)($_POST['id'] ?? 0);
        $civilId = trim($_POST['civil_id'] ?? '');
        $name = trim($_POST['name'] ?? '');
        $jobTitle = trim($_POST['job_title'] ?? '');
        $branchId = (int)($_POST['branch_id'] ?? 0);
        $departmentId = (int)($_POST['department_id'] ?? 0);
        $basicSalary = (float)($_POST['basic_salary'] ?? 0.000);
        $dailyHours = max(1, (int)($_POST['daily_work_hours'] ?? 8));
        $bankEnabled = !empty($_POST['bank_enabled']) ? 1 : 0;
        $bankAmount = $bankEnabled ? (float)($_POST['bank_transfer_amount'] ?? 0.000) : 0.000;
        $bankName = $bankEnabled ? trim($_POST['bank_name'] ?? '') : null;
        $iban = $bankEnabled ? trim($_POST['iban'] ?? '') : null;
        $residenceNumber = trim($_POST['residence_number'] ?? '') ?: null;
        $residenceExpiry = !empty($_POST['residence_expiry_date']) ? $_POST['residence_expiry_date'] : null;
        $hireDate = !empty($_POST['hire_date']) ? $_POST['hire_date'] : date('Y-m-d');
        $status = in_array($_POST['status'] ?? '', ['active', 'suspended', 'resigned'], true) ? $_POST['status'] : 'active';

        // التحقق من صحة المدخلات
        if (!isValidKuwaitCivilId($civilId)) {
            $errorMsg = 'الرقم المدني غير صالح. يجب أن يتكون من 12 رقماً ويبدأ بـ 2 أو 3.';
        } elseif (empty($name) || empty($jobTitle)) {
            $errorMsg = 'يرجى إدخال اسم الموظف والمسمى الوظيفي.';
        } elseif ($branchId <= 0 || $departmentId <= 0) {
            $errorMsg = 'يرجى تحديد الفرع والقسم التابع له الموظف.';
        } elseif ($basicSalary < 0) {
            $errorMsg = 'الراتب الأساسي لا يمكن أن يكون سالباً.';
        } else {
            // فحص تكرار الرقم المدني
            $uniqueQuery = "SELECT id FROM employees WHERE civil_id = :cid";
            $uniqueParams = [':cid' => $civilId];
            if ($action === 'update') {
                $uniqueQuery .= " AND id != :id";
                $uniqueParams[':id'] = $id;
            }
            $uniqueStmt = $pdo->prepare($uniqueQuery);
            $uniqueStmt->execute($uniqueParams);

            if ($uniqueStmt->fetch()) {
                $errorMsg = 'الرقم المدني مستخدم مسبقاً لموظف آخر في النظام.';
            } else {
                try {
                    if ($action === 'create') {
                        $stmt = $pdo->prepare("
                            INSERT INTO employees (
                                civil_id, name, job_title, branch_id, department_id, basic_salary, 
                                daily_work_hours, bank_enabled, bank_transfer_amount, bank_name, 
                                iban, residence_number, residence_expiry_date, hire_date, status
                            ) VALUES (
                                :civil_id, :name, :job_title, :branch_id, :department_id, :basic_salary,
                                :daily_work_hours, :bank_enabled, :bank_transfer_amount, :bank_name,
                                :iban, :residence_number, :residence_expiry_date, :hire_date, :status
                            )
                        ");
                        $stmt->execute([
                            ':civil_id'             => $civilId,
                            ':name'                 => $name,
                            ':job_title'            => $jobTitle,
                            ':branch_id'            => $branchId,
                            ':department_id'        => $departmentId,
                            ':basic_salary'         => $basicSalary,
                            ':daily_work_hours'     => $dailyHours,
                            ':bank_enabled'         => $bankEnabled,
                            ':bank_transfer_amount' => $bankAmount,
                            ':bank_name'            => $bankName,
                            ':iban'                 => $iban,
                            ':residence_number'     => $residenceNumber,
                            ':residence_expiry_date'=> $residenceExpiry,
                            ':hire_date'            => $hireDate,
                            ':status'               => $status,
                        ]);
                        $newId = (int)$pdo->lastInsertId();
                        logAuditEvent($pdo, $currentUser['id'], 'EMPLOYEE_CREATE', 'employees', $newId, null, [
                            'civil_id' => $civilId, 'name' => $name, 'branch_id' => $branchId, 'basic_salary' => $basicSalary
                        ]);
                        $successMsg = 'تمت إضافة الموظف بنجاح إلى النظام.';
                    } else {
                        // Update
                        $oldStmt = $pdo->prepare("SELECT * FROM employees WHERE id = :id");
                        $oldStmt->execute([':id' => $id]);
                        $oldEmp = $oldStmt->fetch();

                        $stmt = $pdo->prepare("
                            UPDATE employees SET 
                                civil_id = :civil_id, name = :name, job_title = :job_title, branch_id = :branch_id, 
                                department_id = :department_id, basic_salary = :basic_salary, daily_work_hours = :daily_work_hours, 
                                bank_enabled = :bank_enabled, bank_transfer_amount = :bank_transfer_amount, bank_name = :bank_name, 
                                iban = :iban, residence_number = :residence_number, residence_expiry_date = :residence_expiry_date, 
                                hire_date = :hire_date, status = :status
                            WHERE id = :id
                        ");
                        $stmt->execute([
                            ':civil_id'             => $civilId,
                            ':name'                 => $name,
                            ':job_title'            => $jobTitle,
                            ':branch_id'            => $branchId,
                            ':department_id'        => $departmentId,
                            ':basic_salary'         => $basicSalary,
                            ':daily_work_hours'     => $dailyHours,
                            ':bank_enabled'         => $bankEnabled,
                            ':bank_transfer_amount' => $bankAmount,
                            ':bank_name'            => $bankName,
                            ':iban'                 => $iban,
                            ':residence_number'     => $residenceNumber,
                            ':residence_expiry_date'=> $residenceExpiry,
                            ':hire_date'            => $hireDate,
                            ':status'               => $status,
                            ':id'                   => $id,
                        ]);
                        logAuditEvent($pdo, $currentUser['id'], 'EMPLOYEE_UPDATE', 'employees', $id, $oldEmp, [
                            'civil_id' => $civilId, 'name' => $name, 'branch_id' => $branchId, 'basic_salary' => $basicSalary, 'status' => $status
                        ]);
                        $successMsg = 'تم تحديث بيانات الموظف بنجاح.';
                    }
                } catch (Throwable $e) {
                    $errorMsg = 'حدث خطأ أثناء حفظ البيانات: ' . $e->getMessage();
                }
            }
        }
    } elseif ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            $errorMsg = 'معرف الموظف غير صالح.';
        } else {
            // فحص وجود قسائم رواتب سابقة للموظف
            $slipsCountStmt = $pdo->prepare("SELECT COUNT(*) FROM payslips WHERE employee_id = :id");
            $slipsCountStmt->execute([':id' => $id]);
            $slipsCount = (int)$slipsCountStmt->fetchColumn();

            if ($slipsCount > 0) {
                $errorMsg = "لا يمكن حذف هذا الموظف لوجود ({$slipsCount}) قسائم رواتب مسجلة له في الأرشيف المالي. يرجى تغيير حالته إلى «مستقيل» أو «موقوف».";
            } else {
                try {
                    $oldStmt = $pdo->prepare("SELECT * FROM employees WHERE id = :id");
                    $oldStmt->execute([':id' => $id]);
                    $oldEmp = $oldStmt->fetch();

                    $delStmt = $pdo->prepare("DELETE FROM employees WHERE id = :id");
                    $delStmt->execute([':id' => $id]);
                    logAuditEvent($pdo, $currentUser['id'], 'EMPLOYEE_DELETE', 'employees', $id, $oldEmp, null);
                    $successMsg = 'تم حذف الموظف نهائياً.';
                } catch (Throwable $e) {
                    $errorMsg = 'خطأ أثناء الحذف: ' . $e->getMessage();
                }
            }
        }
    }
}

// جلب الفروع والأقسام
$branchesStmt = $pdo->query("SELECT id, name, code FROM branches ORDER BY name ASC");
$allBranches = $branchesStmt->fetchAll();

$deptsStmt = $pdo->query("SELECT id, branch_id, name FROM departments ORDER BY name ASC");
$allDepts = $deptsStmt->fetchAll();

// الفلاتر والبحث وترقيم الصفحات
$search = trim($_GET['search'] ?? '');
$branchFilter = (int)($_GET['branch_id'] ?? 0);
$deptFilter = (int)($_GET['department_id'] ?? 0);
$statusFilter = trim($_GET['status'] ?? '');

$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = 15;
$offset = ($page - 1) * $perPage;

$whereClauses = ["1=1"];
$params = [];

if ($search !== '') {
    $whereClauses[] = "(e.name LIKE :search OR e.civil_id LIKE :search OR e.job_title LIKE :search)";
    $params[':search'] = "%{$search}%";
}
if ($branchFilter > 0) {
    $whereClauses[] = "e.branch_id = :b_id";
    $params[':b_id'] = $branchFilter;
}
if ($deptFilter > 0) {
    $whereClauses[] = "e.department_id = :d_id";
    $params[':d_id'] = $deptFilter;
}
if ($statusFilter !== '') {
    $whereClauses[] = "e.status = :status";
    $params[':status'] = $statusFilter;
}

$whereSql = implode(" AND ", $whereClauses);

// حساب الإجمالي
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM employees e WHERE {$whereSql}");
$countStmt->execute($params);
$totalEmployees = (int)$countStmt->fetchColumn();
$totalPages = max(1, (int)ceil($totalEmployees / $perPage));

// جلب الموظفين
$query = "
    SELECT e.*, b.name AS branch_name, b.code AS branch_code, d.name AS department_name
    FROM employees e
    JOIN branches b ON b.id = e.branch_id
    JOIN departments d ON d.id = e.department_id
    WHERE {$whereSql}
    ORDER BY e.status ASC, e.id DESC
    LIMIT {$perPage} OFFSET {$offset}
";
$stmt = $pdo->prepare($query);
$stmt->execute($params);
$employees = $stmt->fetchAll();

require_once __DIR__ . '/header.php';
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
    <div>
        <h3 class="fw-bold mb-1">👥 إدارة الموظفين</h3>
        <p class="text-muted small mb-0">سجل الموظفين، الأرقام المدنية (12 رقماً)، الرواتب، حسابات البنوك، ومتابعة الإقامات</p>
    </div>
    <button type="button" class="btn btn-primary fw-bold" onclick="openCreateEmployeeModal()">
        + إضافة موظف جديد
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

<!-- شريط الفلترة والبحث -->
<div class="card p-3 mb-4">
    <form method="GET" class="row g-2 align-items-center">
        <div class="col-md-3">
            <input type="text" name="search" class="form-control form-control-sm" placeholder="الاسم، الرقم المدني، الوظيفة..." value="<?= e($search) ?>">
        </div>
        <div class="col-md-3">
            <select name="branch_id" class="form-select form-select-sm" onchange="this.form.submit()">
                <option value="">جميع الفروع</option>
                <?php foreach ($allBranches as $b): ?>
                    <option value="<?= (int)$b['id'] ?>" <?= $branchFilter === (int)$b['id'] ? 'selected' : '' ?>><?= e($b['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-2">
            <select name="department_id" class="form-select form-select-sm">
                <option value="">جميع الأقسام</option>
                <?php foreach ($allDepts as $d): ?>
                    <?php if ($branchFilter <= 0 || (int)$d['branch_id'] === $branchFilter): ?>
                        <option value="<?= (int)$d['id'] ?>" <?= $deptFilter === (int)$d['id'] ? 'selected' : '' ?>><?= e($d['name']) ?></option>
                    <?php endif; ?>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-2">
            <select name="status" class="form-select form-select-sm">
                <option value="">جميع الحالات</option>
                <option value="active" <?= $statusFilter === 'active' ? 'selected' : '' ?>>نشط</option>
                <option value="suspended" <?= $statusFilter === 'suspended' ? 'selected' : '' ?>>موقوف</option>
                <option value="resigned" <?= $statusFilter === 'resigned' ? 'selected' : '' ?>>مستقيل</option>
            </select>
        </div>
        <div class="col-md-2 d-flex gap-2">
            <button type="submit" class="btn btn-dark btn-sm flex-grow-1">فلترة</button>
            <?php if ($search !== '' || $branchFilter > 0 || $deptFilter > 0 || $statusFilter !== ''): ?>
                <a href="employees.php" class="btn btn-outline-secondary btn-sm">إلغاء</a>
            <?php endif; ?>
        </div>
    </form>
</div>

<!-- جدول الموظفين -->
<div class="card overflow-hidden mb-4">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light small">
                <tr>
                    <th>#</th>
                    <th>الرقم المدني</th>
                    <th>اسم الموظف</th>
                    <th>المسمى الوظيفي</th>
                    <th>الفرع / القسم</th>
                    <th>الأساسي (د.ك)</th>
                    <th>حالة الصرف</th>
                    <th>حالة الإقامة</th>
                    <th>الحالة</th>
                    <th class="text-center">الإجراءات</th>
                </tr>
            </thead>
            <tbody class="small">
                <?php if (empty($employees)): ?>
                    <tr>
                        <td colspan="10" class="text-center py-4 text-muted">لا يوجد موظفون مسجلون يطابقون شروط البحث</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($employees as $emp): ?>
                        <?php $resStatus = getResidenceExpiryStatus($emp['residence_expiry_date']); ?>
                        <tr>
                            <td><?= (int)$emp['id'] ?></td>
                            <td><span class="font-mono fw-bold"><?= e($emp['civil_id']) ?></span></td>
                            <td>
                                <button type="button" class="btn btn-link p-0 fw-bold text-dark text-decoration-none" onclick="viewEmployeeCard(<?= (int)$emp['id'] ?>)">
                                    <?= e($emp['name']) ?> 🪪
                                </button>
                            </td>
                            <td><?= e($emp['job_title']) ?></td>
                            <td>
                                <div><span class="badge bg-secondary-subtle text-dark border"><?= e($emp['branch_name']) ?></span></div>
                                <div class="text-muted text-[11px] mt-0.5"><?= e($emp['department_name']) ?></div>
                            </td>
                            <td class="font-mono fw-bold text-primary"><?= formatKWD($emp['basic_salary']) ?></td>
                            <td>
                                <?php if (!empty($emp['bank_enabled'])): ?>
                                    <span class="badge bg-primary-subtle text-primary border" title="<?= e($emp['bank_name']) ?>">
                                        🏦 بنكي (<?= formatKWD($emp['bank_transfer_amount']) ?>)
                                    </span>
                                <?php else: ?>
                                    <span class="badge bg-light text-dark border">💵 نقدي كامل</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <span class="badge <?= $resStatus['badge_class'] ?>">
                                    <?= $resStatus['label'] ?>
                                </span>
                            </td>
                            <td>
                                <?php if ($emp['status'] === 'active'): ?>
                                    <span class="badge bg-success">نشط</span>
                                <?php elseif ($emp['status'] === 'suspended'): ?>
                                    <span class="badge bg-warning text-dark">موقوف</span>
                                <?php else: ?>
                                    <span class="badge bg-secondary">مستقيل</span>
                                <?php endif; ?>
                            </td>
                            <td class="text-center">
                                <button type="button" class="btn btn-outline-dark btn-sm px-2 py-0.5 me-1" onclick="viewEmployeeCard(<?= (int)$emp['id'] ?>)" title="كارت الموظف">
                                    🪪 كارت
                                </button>
                                <button type="button" class="btn btn-outline-primary btn-sm px-2 py-0.5 me-1" onclick='editEmployee(<?= json_encode($emp, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>)'>
                                    تعديل
                                </button>
                                <button type="button" class="btn btn-outline-danger btn-sm px-2 py-0.5" onclick="confirmDeleteEmployee(<?= (int)$emp['id'] ?>, '<?= e($emp['name']) ?>')">
                                    حذف
                                </button>
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
            <span class="text-muted">إجمالي الموظفين: <?= $totalEmployees ?> (صفحة <?= $page ?> من <?= $totalPages ?>)</span>
            <ul class="pagination pagination-sm mb-0">
                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                    <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                        <a class="page-link" href="?page=<?= $i ?>&search=<?= urlencode($search) ?>&branch_id=<?= $branchFilter ?>&department_id=<?= $deptFilter ?>&status=<?= urlencode($statusFilter) ?>"><?= $i ?></a>
                    </li>
                <?php endfor; ?>
            </ul>
        </div>
    <?php endif; ?>
</div>

<!-- مودال إضافة / تعديل موظف -->
<div class="modal fade" id="employeeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <form method="POST" id="employeeForm">
                <?= csrfField() ?>
                <input type="hidden" name="action" id="emp_action" value="create">
                <input type="hidden" name="id" id="emp_id">

                <div class="modal-header">
                    <h5 class="modal-title fw-bold" id="employeeModalTitle">إضافة موظف جديد</h5>
                    <button type="button" class="btn-close ms-0 me-auto" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                </div>

                <div class="modal-body space-y-3">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">الرقم المدني (12 رقماً) <span class="text-danger">*</span></label>
                            <input type="text" name="civil_id" id="emp_civil_id" class="form-control font-mono" maxlength="12" pattern="[0-9]{12}" required placeholder="مثال: 290010101234">
                            <span class="form-text small">يجب أن يتكون من 12 رقماً ويبدأ بـ 2 أو 3</span>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">اسم الموظف بالكامل <span class="text-danger">*</span></label>
                            <input type="text" name="name" id="emp_name" class="form-control" required placeholder="الاسم الثلاثي أو الرباعي">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">المسمى الوظيفي <span class="text-danger">*</span></label>
                            <input type="text" name="job_title" id="emp_job_title" class="form-control" required placeholder="مثال: محاسب أول / مهندس مبيعات">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">الحالة</label>
                            <select name="status" id="emp_status" class="form-select">
                                <option value="active">نشط</option>
                                <option value="suspended">موقوف</option>
                                <option value="resigned">مستقيل</option>
                            </select>
                        </div>
                    </div>

                    <div class="row g-3 mt-1">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">الفرع <span class="text-danger">*</span></label>
                            <select name="branch_id" id="emp_branch_id" class="form-select" required onchange="loadDepartmentsForBranch(this.value)">
                                <option value="">اختر الفرع...</option>
                                <?php foreach ($allBranches as $b): ?>
                                    <option value="<?= (int)$b['id'] ?>"><?= e($b['name']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">القسم التابع له <span class="text-danger">*</span></label>
                            <select name="department_id" id="emp_department_id" class="form-select" required>
                                <option value="">اختر الفرع أولاً...</option>
                            </select>
                        </div>
                    </div>

                    <div class="row g-3 mt-1">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">الراتب الأساسي (د.ك) <span class="text-danger">*</span></label>
                            <input type="number" step="0.001" min="0" name="basic_salary" id="emp_basic_salary" class="form-control font-mono" required placeholder="0.000">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">ساعات العمل اليومية <span class="text-danger">*</span></label>
                            <input type="number" min="1" max="24" name="daily_work_hours" id="emp_daily_work_hours" class="form-control font-mono" value="8" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">تاريخ التعيين</label>
                            <input type="date" name="hire_date" id="emp_hire_date" class="form-control" value="<?= date('Y-m-d') ?>">
                        </div>
                    </div>

                    <!-- تفاصيل البنك والتحويل -->
                    <div class="border rounded p-3 bg-light mt-3">
                        <div class="form-check form-switch mb-2">
                            <input class="form-check-input" type="checkbox" name="bank_enabled" id="emp_bank_enabled" value="1" onchange="toggleBankFields(this.checked)">
                            <label class="form-check-label fw-bold small" for="emp_bank_enabled">تفعيل التحويل البنكي للموظف</label>
                        </div>
                        <div id="bankDetailsFields" style="display:none;" class="row g-2 mt-1">
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">مبلغ التحويل البنكي (د.ك)</label>
                                <input type="number" step="0.001" min="0" name="bank_transfer_amount" id="emp_bank_transfer_amount" class="form-control form-control-sm font-mono" placeholder="0.000">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">اسم البنك</label>
                                <input type="text" name="bank_name" id="emp_bank_name" class="form-control form-control-sm" placeholder="مثال: بنك الكويت الوطني / بيت التمويل">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">الآيبان (IBAN)</label>
                                <input type="text" name="iban" id="emp_iban" class="form-control form-control-sm font-mono" placeholder="KW00XXXX00000000000000000000">
                            </div>
                        </div>
                    </div>

                    <!-- تفاصيل الإقامة -->
                    <div class="border rounded p-3 bg-light mt-2">
                        <h6 class="fw-bold small mb-2 text-secondary">معلومات الإقامة (اختياري)</h6>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label small">رقم الإقامة / الجواز</label>
                                <input type="text" name="residence_number" id="emp_residence_number" class="form-control form-control-sm" placeholder="رقم الإقامة في الكويت">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small">تاريخ انتهاء الإقامة</label>
                                <input type="date" name="residence_expiry_date" id="emp_residence_expiry_date" class="form-control form-control-sm">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">إلغاء</button>
                    <button type="submit" class="btn btn-primary fw-bold" id="emp_submit_btn">حفظ الموظف</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- مودال كارت الموظف -->
<div class="modal fade" id="employeeCardModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title fw-bold" id="cardEmpName">كارت الموظف</h5>
                <button type="button" class="btn-close btn-close-white ms-0 me-auto" data-bs-dismiss="modal" aria-label="إغلاق"></button>
            </div>
            <div class="modal-body p-4" id="cardEmpBody">
                <div class="text-center py-4">جاري تحميل بيانات الموظف...</div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
            </div>
        </div>
    </div>
</div>

<form id="deleteEmployeeForm" method="POST" style="display:none;">
    <?= csrfField() ?>
    <input type="hidden" name="action" value="delete">
    <input type="hidden" name="id" id="delete_emp_id">
</form>

<script>
const allDepartmentsData = <?= json_encode($allDepts) ?>;

function toggleBankFields(show) {
    document.getElementById('bankDetailsFields').style.display = show ? 'flex' : 'none';
}

function loadDepartmentsForBranch(branchId, selectedDeptId = null) {
    const deptSelect = document.getElementById('emp_department_id');
    deptSelect.innerHTML = '<option value="">اختر القسم...</option>';
    if (!branchId) return;

    const filtered = allDepartmentsData.filter(d => parseInt(d.branch_id) === parseInt(branchId));
    filtered.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        if (selectedDeptId && parseInt(selectedDeptId) === parseInt(d.id)) {
            opt.selected = true;
        }
        deptSelect.appendChild(opt);
    });
}

function openCreateEmployeeModal() {
    document.getElementById('employeeForm').reset();
    document.getElementById('emp_action').value = 'create';
    document.getElementById('emp_id').value = '';
    document.getElementById('employeeModalTitle').textContent = 'إضافة موظف جديد';
    document.getElementById('emp_submit_btn').textContent = 'حفظ الموظف';
    toggleBankFields(false);
    new bootstrap.Modal(document.getElementById('employeeModal')).show();
}

function editEmployee(emp) {
    document.getElementById('emp_action').value = 'update';
    document.getElementById('emp_id').value = emp.id;
    document.getElementById('employeeModalTitle').textContent = 'تعديل بيانات الموظف';
    document.getElementById('emp_submit_btn').textContent = 'حفظ التعديلات';

    document.getElementById('emp_civil_id').value = emp.civil_id;
    document.getElementById('emp_name').value = emp.name;
    document.getElementById('emp_job_title').value = emp.job_title;
    document.getElementById('emp_status').value = emp.status;
    document.getElementById('emp_branch_id').value = emp.branch_id;
    loadDepartmentsForBranch(emp.branch_id, emp.department_id);

    document.getElementById('emp_basic_salary').value = emp.basic_salary;
    document.getElementById('emp_daily_work_hours').value = emp.daily_work_hours;
    document.getElementById('emp_hire_date').value = emp.hire_date;

    const isBank = parseInt(emp.bank_enabled) === 1;
    document.getElementById('emp_bank_enabled').checked = isBank;
    toggleBankFields(isBank);
    document.getElementById('emp_bank_transfer_amount').value = emp.bank_transfer_amount || '0.000';
    document.getElementById('emp_bank_name').value = emp.bank_name || '';
    document.getElementById('emp_iban').value = emp.iban || '';

    document.getElementById('emp_residence_number').value = emp.residence_number || '';
    document.getElementById('emp_residence_expiry_date').value = emp.residence_expiry_date || '';

    new bootstrap.Modal(document.getElementById('employeeModal')).show();
}

function viewEmployeeCard(empId) {
    const modal = new bootstrap.Modal(document.getElementById('employeeCardModal'));
    const body = document.getElementById('cardEmpBody');
    body.innerHTML = '<div class="text-center py-4">جاري تحميل بيانات الموظف...</div>';
    modal.show();

    fetch('employees.php?ajax=employee_card&id=' + empId)
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                body.innerHTML = '<div class="alert alert-danger">' + data.message + '</div>';
                return;
            }
            const e = data.employee;
            const r = data.residence_status;
            let slipsHtml = '';
            if (data.recent_payslips && data.recent_payslips.length > 0) {
                slipsHtml = `
                    <h6 class="fw-bold mt-4 mb-2">📋 ملخص آخر 3 قسائم رواتب صادرة:</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered text-center align-middle">
                            <thead class="table-light small">
                                <tr>
                                    <th>الشهر/السنة</th>
                                    <th>الأساسي</th>
                                    <th>خصم الغياب</th>
                                    <th>الإضافي</th>
                                    <th>السلفة</th>
                                    <th>الصافي</th>
                                    <th>البنكي</th>
                                    <th>النقدي</th>
                                </tr>
                            </thead>
                            <tbody class="small font-mono">
                                ${data.recent_payslips.map(s => `
                                    <tr>
                                        <td class="fw-bold">${s.month}/${s.year}</td>
                                        <td>${parseFloat(s.basic_salary).toFixed(3)}</td>
                                        <td class="text-danger">${(parseFloat(s.absent_days_deduction) + parseFloat(s.absent_hours_deduction)).toFixed(3)}</td>
                                        <td class="text-success">${parseFloat(s.overtime_amount).toFixed(3)}</td>
                                        <td class="text-danger">${parseFloat(s.advance_deduction).toFixed(3)}</td>
                                        <td class="fw-bold text-primary">${parseFloat(s.net_salary).toFixed(3)}</td>
                                        <td>${parseFloat(s.bank_amount).toFixed(3)}</td>
                                        <td class="fw-bold text-success">${parseFloat(s.final_cash).toFixed(3)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                slipsHtml = '<p class="text-muted small mt-3">لا توجد قسائم رواتب مسجلة لهذا الموظف حتى الآن.</p>';
            }

            body.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <ul class="list-group list-group-flush small">
                            <li class="list-group-item d-flex justify-content-between"><strong>الرقم المدني:</strong> <span class="font-mono">${e.civil_id}</span></li>
                            <li class="list-group-item d-flex justify-content-between"><strong>الاسم:</strong> <span>${e.name}</span></li>
                            <li class="list-group-item d-flex justify-content-between"><strong>الوظيفة:</strong> <span>${e.job_title}</span></li>
                            <li class="list-group-item d-flex justify-content-between"><strong>الفرع / القسم:</strong> <span>${e.branch_name} &bull; ${e.department_name}</span></li>
                            <li class="list-group-item d-flex justify-content-between"><strong>الراتب الأساسي:</strong> <span class="fw-bold text-primary font-mono">${parseFloat(e.basic_salary).toFixed(3)} د.ك</span></li>
                            <li class="list-group-item d-flex justify-content-between"><strong>ساعات العمل اليومية:</strong> <span>${e.daily_work_hours} ساعات</span></li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <ul class="list-group list-group-flush small">
                            <li class="list-group-item d-flex justify-content-between"><strong>تاريخ التعيين:</strong> <span>${e.hire_date}</span></li>
                            <li class="list-group-item d-flex justify-content-between"><strong>الحالة:</strong> <span>${e.status}</span></li>
                            <li class="list-group-item d-flex justify-content-between"><strong>طريقة الصرف:</strong> <span>${parseInt(e.bank_enabled) === 1 ? '🏦 تحويل بنكي' : '💵 نقدي بالكامل'}</span></li>
                            ${parseInt(e.bank_enabled) === 1 ? `
                                <li class="list-group-item d-flex justify-content-between"><strong>مبلغ البنك:</strong> <span class="font-mono">${parseFloat(e.bank_transfer_amount).toFixed(3)} د.ك</span></li>
                                <li class="list-group-item d-flex justify-content-between"><strong>البنك والآيبان:</strong> <span class="font-mono">${e.bank_name || ''} - ${e.iban || '—'}</span></li>
                            ` : ''}
                            <li class="list-group-item d-flex justify-content-between"><strong>حالة الإقامة:</strong> <span class="badge ${r.badge_class}">${r.label}</span></li>
                        </ul>
                    </div>
                </div>
                ${slipsHtml}
            `;
        });
}

function confirmDeleteEmployee(id, name) {
    if (confirm('هل أنت متأكد من رغبتك في حذف الموظف «' + name + '»؟ إذا كان له قسائم رواتب مسجلة فلن يتم حذفه.')) {
        document.getElementById('delete_emp_id').value = id;
        document.getElementById('deleteEmployeeForm').submit();
    }
}
</script>

<?php require_once __DIR__ . '/footer.php'; ?>
