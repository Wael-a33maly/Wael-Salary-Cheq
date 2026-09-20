<?php
/**
 * قسيمة راتب الموظف التفصيلية (payslip.php)
 * ترويسة الشركة، تفاصيل الحسابات بالكامل، والطباعة والتصدير
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../core/auth.php';
require_once __DIR__ . '/../../core/helpers.php';

requireAuth();

$pdo = getDbConnection();
$companySettings = getCompanySettings($pdo);

$payslipId = (int)($_GET['id'] ?? 0);
if ($payslipId <= 0) {
    die('معرف القسيمة غير صالح.');
}

$stmt = $pdo->prepare("
    SELECT p.*, e.name AS emp_name, e.civil_id, e.job_title, e.hire_date, e.bank_enabled, e.bank_name, e.iban,
           b.name AS branch_name, b.code AS branch_code, d.name AS department_name
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    JOIN branches b ON b.id = e.branch_id
    JOIN departments d ON d.id = e.department_id
    WHERE p.id = :id
    LIMIT 1
");
$stmt->execute([':id' => $payslipId]);
$slip = $stmt->fetch();

if (!$slip) {
    die('قسيمة الراتب غير موجودة في النظام.');
}

$pageTitle = 'قسيمة راتب — ' . $slip['emp_name'] . ' (' . $slip['month'] . '/' . $slip['year'] . ')';
$activeNav = 'payroll';
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($pageTitle) ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Cairo', sans-serif;
            background-color: #f1f5f9;
            color: #1e293b;
            padding: 20px 0;
        }
        .payslip-container {
            max-width: 820px;
            margin: auto;
            background: #ffffff;
            padding: 35px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .font-mono {
            font-family: monospace;
        }
        @media print {
            body {
                background: #fff;
                padding: 0;
            }
            .payslip-container {
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }
            .no-print {
                display: none !important;
            }
        }
    </style>
</head>
<body>

<div class="payslip-container">
    
    <!-- شريط الإجراءات والطباعة -->
    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom no-print">
        <a href="index.php?month=<?= (int)$slip['month'] ?>&year=<?= (int)$slip['year'] ?>" class="btn btn-outline-secondary btn-sm">
            &larr; العودة لكشف الرواتب
        </a>
        <div class="d-flex gap-2">
            <button onclick="window.print()" class="btn btn-primary btn-sm fw-bold">
                🖨️ طباعة القسيمة
            </button>
            <a href="../../reports/export.php?type=csv_slip&id=<?= $payslipId ?>" class="btn btn-outline-success btn-sm">
                📥 تصدير Excel / CSV
            </a>
        </div>
    </div>

    <!-- الترويسة الرسمية -->
    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-2">
        <div class="d-flex align-items-center gap-3">
            <?php if (!empty($companySettings['logo_path']) && file_exists(__DIR__ . '/../../' . $companySettings['logo_path'])): ?>
                <img src="../../<?= e($companySettings['logo_path']) ?>" alt="Logo" height="55" class="rounded">
            <?php else: ?>
                <div class="bg-primary text-white p-2 rounded fw-bold fs-4">💼</div>
            <?php endif; ?>
            <div>
                <h4 class="fw-bold mb-0 text-dark"><?= e($companySettings['company_name']) ?></h4>
                <div class="text-muted small"><?= e($companySettings['company_address'] ?? 'الكويت') ?> &bull; هاتف: <?= e($companySettings['company_phone'] ?? '—') ?></div>
            </div>
        </div>
        <div class="text-start">
            <h5 class="fw-bold text-primary mb-1">قسيمة راتب شهرية</h5>
            <div class="badge bg-dark font-mono fs-6 px-3 py-1">
                شهر <?= (int)$slip['month'] ?> / <?= (int)$slip['year'] ?>
            </div>
        </div>
    </div>

    <!-- بيانات الموظف والفرع -->
    <div class="bg-light p-3 rounded mb-4 border">
        <div class="row g-2 small">
            <div class="col-sm-6"><strong>اسم الموظف:</strong> <?= e($slip['emp_name']) ?></div>
            <div class="col-sm-6"><strong>الرقم المدني:</strong> <span class="font-mono fw-bold"><?= e($slip['civil_id']) ?></span></div>
            <div class="col-sm-6"><strong>المسمى الوظيفي:</strong> <?= e($slip['job_title']) ?></div>
            <div class="col-sm-6"><strong>الفرع / القسم:</strong> <?= e($slip['branch_name']) ?> &bull; <?= e($slip['department_name']) ?></div>
            <div class="col-sm-6"><strong>تاريخ التعيين:</strong> <?= e($slip['hire_date']) ?></div>
            <div class="col-sm-6">
                <strong>طريقة الصرف:</strong> 
                <?php if (!empty($slip['bank_enabled'])): ?>
                    <span class="text-primary fw-bold">تحويل بنكي (<?= e($slip['bank_name'] ?: 'بنك محلي') ?>)</span>
                <?php else: ?>
                    <span class="text-dark">صرف نقدي</span>
                <?php endif; ?>
            </div>
            <?php if (!empty($slip['bank_enabled']) && !empty($slip['iban'])): ?>
                <div class="col-12 font-mono"><strong>رقم الآيبان (IBAN):</strong> <?= e($slip['iban']) ?></div>
            <?php endif; ?>
        </div>
    </div>

    <!-- جدول تفاصيل الاستحقاقات والخصومات -->
    <div class="table-responsive mb-4">
        <table class="table table-bordered align-middle small mb-0">
            <thead class="table-light text-center">
                <tr>
                    <th class="text-start">بيان البند</th>
                    <th>الكمية / الأساس</th>
                    <th>المعدل / القيمة الفردية</th>
                    <th>المبلغ (د.ك)</th>
                </tr>
            </thead>
            <tbody class="font-mono">
                <tr>
                    <td class="font-sans text-start"><strong>الراتب الأساسي</strong></td>
                    <td class="text-center font-sans"><?= (int)$slip['days_in_month'] ?> يوماً (أيام الشهر)</td>
                    <td class="text-center">قيمة اليوم: <?= number_format((float)$slip['daily_rate'], 3) ?></td>
                    <td class="text-end fw-bold"><?= number_format((float)$slip['basic_salary'], 3) ?></td>
                </tr>
                <tr>
                    <td class="font-sans text-start text-danger">خصم أيام الغياب</td>
                    <td class="text-center"><?= number_format((float)$slip['absent_days'], 2) ?> يوم</td>
                    <td class="text-center"><?= number_format((float)$slip['daily_rate'], 3) ?> / يوم</td>
                    <td class="text-end text-danger">- <?= number_format((float)$slip['absent_days_deduction'], 3) ?></td>
                </tr>
                <tr>
                    <td class="font-sans text-start text-danger">خصم ساعات الغياب</td>
                    <td class="text-center"><?= number_format((float)$slip['absent_hours'], 2) ?> ساعة</td>
                    <td class="text-center">قيمة الساعة: <?= number_format((float)$slip['hourly_rate'], 3) ?></td>
                    <td class="text-end text-danger">- <?= number_format((float)$slip['absent_hours_deduction'], 3) ?></td>
                </tr>
                <tr class="table-light fw-bold font-sans">
                    <td colspan="3" class="text-start">الراتب بعد استقطاع الغياب</td>
                    <td class="text-end font-mono"><?= number_format((float)$slip['salary_after_deductions'], 3) ?></td>
                </tr>
                <tr>
                    <td class="font-sans text-start text-success">العمل الإضافي (Overtime)</td>
                    <td class="text-center"><?= number_format((float)$slip['overtime_hours'], 2) ?> ساعة</td>
                    <td class="text-center">معدل الإضافي: <?= number_format((float)$slip['overtime_hourly_rate'], 3) ?> (&times;<?= $slip['overtime_rate_multiplier'] ?>)</td>
                    <td class="text-end text-success">+ <?= number_format((float)$slip['overtime_amount'], 3) ?></td>
                </tr>
                <tr>
                    <td class="font-sans text-start text-danger">خصم السلفة الشهرية</td>
                    <td class="text-center font-sans">—</td>
                    <td class="text-center font-sans">—</td>
                    <td class="text-end text-danger">- <?= number_format((float)$slip['advance_deduction'], 3) ?></td>
                </tr>
            </tbody>
            <tfoot class="table-dark font-mono">
                <tr class="fs-6">
                    <td colspan="3" class="font-sans text-start fw-bold">صافي الراتب المستحق:</td>
                    <td class="text-end fw-bold text-warning"><?= number_format((float)$slip['net_salary'], 3) ?> د.ك</td>
                </tr>
            </tfoot>
        </table>
    </div>

    <!-- تفاصيل آلية الصرف والتقريب -->
    <div class="card p-3 border-2 mb-4">
        <h6 class="fw-bold mb-3">تفاصيل الصرف الفعلي:</h6>
        <div class="row g-3 small">
            <div class="col-md-4">
                <div class="p-2 border rounded bg-light">
                    <div class="text-muted">المبلغ المحول للبنك:</div>
                    <div class="fs-5 fw-bold font-mono text-primary mt-1"><?= number_format((float)$slip['bank_amount'], 3) ?> د.ك</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="p-2 border rounded bg-light">
                    <div class="text-muted">النقدي المستحق (الخام):</div>
                    <div class="fs-5 fw-bold font-mono text-dark mt-1"><?= number_format((float)$slip['raw_cash'], 3) ?> د.ك</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="p-2 border rounded bg-success-subtle border-success">
                    <div class="text-success fw-bold">النقدي المسلم للموظف:</div>
                    <div class="fs-5 fw-bold font-mono text-success mt-1"><?= number_format((float)$slip['final_cash'], 3) ?> د.ك</div>
                    <div class="text-muted text-[11px] mt-0.5">مقرب للأسفل لأقرب 0.050 د.ك</div>
                </div>
            </div>
        </div>

        <?php if ((float)$slip['rounding_diff'] > 0): ?>
            <div class="text-muted small mt-2">
                * فرق التقريب لصالح الشركة: <strong class="font-mono"><?= number_format((float)$slip['rounding_diff'], 3) ?> د.ك</strong>
            </div>
        <?php endif; ?>
    </div>

    <!-- التواقيع والاعتماد -->
    <div class="row text-center mt-5 pt-4 border-top">
        <div class="col-4">
            <p class="fw-bold mb-5 small">إعداد المحاسب</p>
            <p class="text-muted small">....................................</p>
        </div>
        <div class="col-4">
            <p class="fw-bold mb-5 small">المدير المالي / المفوض</p>
            <p class="text-muted small">....................................</p>
        </div>
        <div class="col-4">
            <p class="fw-bold mb-5 small">توقيع واستلام الموظف</p>
            <p class="text-muted small">....................................</p>
        </div>
    </div>

    <div class="text-center text-muted small mt-4 pt-2 border-top">
        تاريخ الإصدار: <?= e($slip['calculated_at']) ?> &bull; نظام رواتب متعدد الفروع (KWD)
    </div>

</div>

</body>
</html>
