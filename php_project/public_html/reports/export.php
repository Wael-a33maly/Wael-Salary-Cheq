<?php
/**
 * معالج التصدير الموحد — Excel / CSV بترميز UTF-8 BOM
 * يدعم فتح الملفات مباشرة في Microsoft Excel باللغة العربية دون أي مشاكل في الترميز
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';

requireAuth();

$pdo = getDbConnection();
$type = $_GET['type'] ?? '';
$month = (int)($_GET['month'] ?? date('n'));
$year = (int)($_GET['year'] ?? date('Y'));
$branchId = (int)($_GET['branch_id'] ?? 0);

// دالة كتابة رأس ملف CSV مع BOM
function outputCsvHeaders(string $filename): void {
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Pragma: no-cache');
    header('Expires: 0');
    // إضافة UTF-8 BOM لضمان قراءة Excel للنصوص العربية بالشكل الصحيح
    echo "\xEF\xBB\xBF";
}

if ($type === 'aggregated' || $type === 'branch') {
    $filename = "payroll_{$year}_{$month}.csv";
    if ($type === 'branch' && $branchId > 0) {
        $filename = "branch_{$branchId}_payroll_{$year}_{$month}.csv";
    }
    outputCsvHeaders($filename);

    $out = fopen('php://output', 'w');

    // ترويسة الأعمدة
    fputcsv($out, [
        'الرقم المدني', 'اسم الموظف', 'الفرع', 'القسم', 'الوظيفة', 'أيام الشهر',
        'الأساسي (د.ك)', 'قيمة اليوم', 'قيمة الساعة', 'أيام الغياب', 'خصم الأيام',
        'ساعات الغياب', 'خصم الساعات', 'الراتب بعد الخصم', 'ساعات الإضافي', 'مبلغ الإضافي',
        'خصم السلفة', 'صافي الراتب', 'المبلغ البنكي', 'النقدي الخام', 'النقدي النهائي (0.050)', 'فرق التقريب'
    ]);

    $sql = "
        SELECT p.*, e.civil_id, e.name AS emp_name, e.job_title, b.name AS branch_name, d.name AS dept_name
        FROM payslips p
        JOIN employees e ON e.id = p.employee_id
        JOIN branches b ON b.id = e.branch_id
        JOIN departments d ON d.id = e.department_id
        WHERE p.month = :m AND p.year = :y
    ";
    $params = [':m' => $month, ':y' => $year];
    if ($type === 'branch' && $branchId > 0) {
        $sql .= " AND e.branch_id = :b_id";
        $params[':b_id'] = $branchId;
    }
    $sql .= " ORDER BY b.name ASC, e.name ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
        fputcsv($out, [
            $r['civil_id'],
            $r['emp_name'],
            $r['branch_name'],
            $r['dept_name'],
            $r['job_title'],
            $r['days_in_month'],
            number_format((float)$r['basic_salary'], 3, '.', ''),
            number_format((float)$r['daily_rate'], 3, '.', ''),
            number_format((float)$r['hourly_rate'], 3, '.', ''),
            $r['absent_days'],
            number_format((float)$r['absent_days_deduction'], 3, '.', ''),
            $r['absent_hours'],
            number_format((float)$r['absent_hours_deduction'], 3, '.', ''),
            number_format((float)$r['salary_after_deductions'], 3, '.', ''),
            $r['overtime_hours'],
            number_format((float)$r['overtime_amount'], 3, '.', ''),
            number_format((float)$r['advance_deduction'], 3, '.', ''),
            number_format((float)$r['net_salary'], 3, '.', ''),
            number_format((float)$r['bank_amount'], 3, '.', ''),
            number_format((float)$r['raw_cash'], 3, '.', ''),
            number_format((float)$r['final_cash'], 3, '.', ''),
            number_format((float)$r['rounding_diff'], 3, '.', ''),
        ]);
    }
    fclose($out);
    exit;

} elseif ($type === 'banking') {
    outputCsvHeaders("banking_summary_{$year}_{$month}.csv");
    $out = fopen('php://output', 'w');

    fputcsv($out, ['الرقم المدني', 'اسم الموظف', 'الفرع', 'اسم البنك', 'رقم الآيبان (IBAN)', 'مبلغ التحويل البنكي (د.ك)']);

    $stmt = $pdo->prepare("
        SELECT p.bank_amount, e.civil_id, e.name AS emp_name, e.bank_name, e.iban, b.name AS branch_name
        FROM payslips p
        JOIN employees e ON e.id = p.employee_id
        JOIN branches b ON b.id = e.branch_id
        WHERE p.month = :m AND p.year = :y AND p.bank_amount > 0
        ORDER BY e.bank_name ASC, e.name ASC
    ");
    $stmt->execute([':m' => $month, ':y' => $year]);

    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
        fputcsv($out, [
            $r['civil_id'],
            $r['emp_name'],
            $r['branch_name'],
            $r['bank_name'] ?: 'غير محدد',
            $r['iban'] ?: '—',
            number_format((float)$r['bank_amount'], 3, '.', '')
        ]);
    }
    fclose($out);
    exit;

} elseif ($type === 'residency') {
    outputCsvHeaders("residency_report_" . date('Y_m_d') . ".csv");
    $out = fopen('php://output', 'w');

    fputcsv($out, ['الرقم المدني', 'اسم الموظف', 'الوظيفة', 'الفرع', 'رقم الإقامة', 'تاريخ انتهاء الإقامة', 'الأيام المتبقية', 'الحالة']);

    $stmt = $pdo->query("
        SELECT e.civil_id, e.name, e.job_title, e.residence_number, e.residence_expiry_date, b.name AS branch_name
        FROM employees e
        JOIN branches b ON b.id = e.branch_id
        WHERE e.status = 'active' AND e.residence_expiry_date IS NOT NULL
        ORDER BY e.residence_expiry_date ASC
    ");

    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $st = getResidenceExpiryStatus($r['residence_expiry_date']);
        fputcsv($out, [
            $r['civil_id'],
            $r['name'],
            $r['job_title'],
            $r['branch_name'],
            $r['residence_number'] ?: '—',
            $r['residence_expiry_date'],
            $st['days'] ?? '—',
            $st['label']
        ]);
    }
    fclose($out);
    exit;

} elseif ($type === 'csv_slip') {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("
        SELECT p.*, e.civil_id, e.name AS emp_name, e.job_title, b.name AS branch_name, d.name AS dept_name
        FROM payslips p
        JOIN employees e ON e.id = p.employee_id
        JOIN branches b ON b.id = e.branch_id
        JOIN departments d ON d.id = e.department_id
        WHERE p.id = :id
    ");
    $stmt->execute([':id' => $id]);
    $slip = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($slip) {
        outputCsvHeaders("payslip_{$slip['civil_id']}_{$slip['month']}_{$slip['year']}.csv");
        $out = fopen('php://output', 'w');
        fputcsv($out, ['البند', 'القيمة']);
        fputcsv($out, ['اسم الموظف', $slip['emp_name']]);
        fputcsv($out, ['الرقم المدني', $slip['civil_id']]);
        fputcsv($out, ['الفرع / القسم', $slip['branch_name'] . ' / ' . $slip['dept_name']]);
        fputcsv($out, ['الشهر / السنة', $slip['month'] . ' / ' . $slip['year']]);
        fputcsv($out, ['الراتب الأساسي', number_format((float)$slip['basic_salary'], 3, '.', '') . ' د.ك']);
        fputcsv($out, ['خصم الغياب (أيام وساعات)', number_format((float)($slip['absent_days_deduction'] + $slip['absent_hours_deduction']), 3, '.', '') . ' د.ك']);
        fputcsv($out, ['الراتب بعد الخصم', number_format((float)$slip['salary_after_deductions'], 3, '.', '') . ' د.ك']);
        fputcsv($out, ['العمل الإضافي', number_format((float)$slip['overtime_amount'], 3, '.', '') . ' د.ك']);
        fputcsv($out, ['خصم السلفة', number_format((float)$slip['advance_deduction'], 3, '.', '') . ' د.ك']);
        fputcsv($out, ['صافي الراتب المستحق', number_format((float)$slip['net_salary'], 3, '.', '') . ' د.ك']);
        fputcsv($out, ['المبلغ المحول للبنك', number_format((float)$slip['bank_amount'], 3, '.', '') . ' د.ك']);
        fputcsv($out, ['النقدي الخام', number_format((float)$slip['raw_cash'], 3, '.', '') . ' د.ك']);
        fputcsv($out, ['النقدي النهائي (0.050)', number_format((float)$slip['final_cash'], 3, '.', '') . ' د.ك']);
        fputcsv($out, ['فرق التقريب (لصالح الشركة)', number_format((float)$slip['rounding_diff'], 3, '.', '') . ' د.ك']);
        fclose($out);
        exit;
    }
}

die('نوع التصدير غير صالح.');
