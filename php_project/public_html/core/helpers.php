<?php
/**
 * دوال مساعدة عامة للنظام — تنسيق العملة، الحسابات الرسمية، والتقريب بالفلس
 * المنطقة الزمنية: Asia/Kuwait — الدينار الكويتي KWD
 */

declare(strict_types=1);

/**
 * تنسيق المبالغ المالية بالدينار الكويتي (3 خانات عشرية)
 * مثال: 125.45 => "125.450 د.ك"
 */
function formatKWD($amount, bool $withCurrency = true): string {
    $val = (float)($amount ?? 0);
    $formatted = number_format($val, 3, '.', ',');
    return $withCurrency ? $formatted . ' د.ك' : $formatted;
}

/**
 * تقريب النقدي للأسفل لأقرب 0.050 د.ك (لصالح الشركة)
 * يتم الحساب بالعمليات الصحيحة على الفلس (Integer Fils) لمنع أخطاء الفاصلة العائمة (Float):
 * $fils = (int) round($rawCash * 1000);
 * $fils = $fils - ($fils % 50);
 * return $fils / 1000;
 */
function roundCashDown(float $rawCash, float $step = 0.050): float {
    if ($rawCash <= 0) {
        return 0.000;
    }
    $stepFils = (int) round($step * 1000);
    if ($stepFils <= 0) {
        $stepFils = 50;
    }

    $fils = (int) round($rawCash * 1000);
    $fils = $fils - ($fils % $stepFils);

    return round($fils / 1000, 3);
}

/**
 * حساب عدد الأيام الفعلية في شهر وسنة محددين
 */
function getActualDaysInMonth(int $month, int $year): int {
    if (function_exists('cal_days_in_month')) {
        return cal_days_in_month(CAL_GREGORIAN, $month, $year);
    }
    return (int) date('t', mktime(0, 0, 0, $month, 1, $year));
}

/**
 * التحقق من صيغة الرقم المدني الكويتي (12 رقماً)
 */
function isValidKuwaitCivilId(string $civilId): bool {
    $clean = trim($civilId);
    if (!preg_match('/^[0-9]{12}$/', $clean)) {
        return false;
    }
    // القرن (2 = القرن العشرين 1900-1999، 3 = القرن الحادي والعشرين 2000-2099)
    $centuryDigit = (int)$clean[0];
    return ($centuryDigit === 2 || $centuryDigit === 3);
}

/**
 * تنقية النصوص لمنع هجمات XSS في العرض داخل HTML
 */
function e(?string $string): string {
    return htmlspecialchars((string)($string ?? ''), ENT_QUOTES, 'UTF-8');
}

/**
 * فحص الأيام المتبقية على انتهاء الإقامة وتصنيف اللون المناسب
 * أخضر >90 / أصفر 60–90 / برتقالي 30–60 / أحمر <30 / رمادي منتهية
 */
function getResidenceExpiryStatus(?string $expiryDate): array {
    if (empty($expiryDate)) {
        return [
            'days' => null,
            'status' => 'none',
            'badge_class' => 'bg-secondary',
            'label' => 'غير محدد',
            'color' => '#64748b'
        ];
    }

    try {
        $today = new DateTime('today', new DateTimeZone('Asia/Kuwait'));
        $expiry = new DateTime($expiryDate, new DateTimeZone('Asia/Kuwait'));
        $diff = (int)$today->diff($expiry)->format('%r%a');

        if ($diff < 0) {
            return [
                'days' => $diff,
                'status' => 'expired',
                'badge_class' => 'bg-secondary text-white',
                'label' => 'منتهية (' . abs($diff) . ' يوم)',
                'color' => '#64748b'
            ];
        } elseif ($diff < 30) {
            return [
                'days' => $diff,
                'status' => 'critical',
                'badge_class' => 'bg-danger text-white',
                'label' => 'أقل من 30 يوم (' . $diff . ' يوم)',
                'color' => '#ef4444'
            ];
        } elseif ($diff <= 60) {
            return [
                'days' => $diff,
                'status' => 'warning',
                'badge_class' => 'bg-warning text-dark',
                'label' => '30–60 يوم (' . $diff . ' يوم)',
                'color' => '#f59e0b'
            ];
        } elseif ($diff <= 90) {
            return [
                'days' => $diff,
                'status' => 'caution',
                'badge_class' => 'bg-info text-dark',
                'label' => '60–90 يوم (' . $diff . ' يوم)',
                'color' => '#06b6d4'
            ];
        } else {
            return [
                'days' => $diff,
                'status' => 'good',
                'badge_class' => 'bg-success text-white',
                'label' => 'أكثر من 90 يوم (' . $diff . ' يوم)',
                'color' => '#10b981'
            ];
        }
    } catch (Exception $e) {
        return [
            'days' => null,
            'status' => 'invalid',
            'badge_class' => 'bg-secondary',
            'label' => 'تاريخ غير صالح',
            'color' => '#64748b'
        ];
    }
}

/**
 * جلب إعدادات الشركة من قاعدة البيانات مع قيم افتراضية
 */
function getCompanySettings(PDO $pdo): array {
    $defaults = [
        'company_name'         => 'شركة الأعمال للتجارة والمقاولات',
        'logo_path'            => null,
        'company_address'      => 'الكويت — الشرق',
        'company_phone'        => '+965 22000000',
        'overtime_multiplier'  => 1.25,
        'residency_alert_days' => 60,
        'currency'             => 'KWD',
        'rounding_step'        => 0.050,
    ];

    try {
        $stmt = $pdo->query("SELECT * FROM settings WHERE id = 1 LIMIT 1");
        if ($row = $stmt->fetch()) {
            return array_merge($defaults, $row);
        }
    } catch (Throwable $e) {
        error_log('getCompanySettings error: ' . $e->getMessage());
    }

    return $defaults;
}

/**
 * حساب عدد الإقامات التي تنتهي خلال مهلة التنبيه المحددة في الإعدادات
 */
function getExpiringResidenciesAlertCount(PDO $pdo, int $alertDays = 60): int {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) AS total 
            FROM employees 
            WHERE status = 'active' 
              AND residence_expiry_date IS NOT NULL 
              AND residence_expiry_date <= DATE_ADD(CURDATE(), INTERVAL :days DAY)
        ");
        $stmt->execute([':days' => $alertDays]);
        return (int)($stmt->fetchColumn() ?: 0);
    } catch (Throwable $e) {
        return 0;
    }
}

/**
 * دالة حساب الراتب الدقيقة الملتزمة بالقاعدة الرسمية بالكامل
 */
function calculateEmployeePayroll(
    float $basicSalary,
    int $dailyWorkHours,
    int $daysInMonth,
    float $overtimeMultiplier,
    float $absentDays,
    float $absentHours,
    float $overtimeHours,
    float $advanceDeduction,
    bool $bankEnabled,
    float $requestedBankAmount,
    float $roundingStep = 0.050
): array {
    $dailyWorkHours = max(1, $dailyWorkHours);
    $daysInMonth = max(28, $daysInMonth);

    // 1. قيمة اليوم وقيمة الساعة
    $dailyRate = $basicSalary / $daysInMonth;
    $hourlyRate = $dailyRate / $dailyWorkHours;

    // 2. الخصومات
    $absentDaysDeduction = $absentDays * $dailyRate;
    $absentHoursDeduction = $absentHours * $hourlyRate;
    $totalDeductions = $absentDaysDeduction + $absentHoursDeduction;

    // 3. الراتب بعد الخصم
    $salaryAfterDeductions = max(0.000, $basicSalary - $totalDeductions);

    // 4. العمل الإضافي
    $overtimeHourlyRate = $hourlyRate * $overtimeMultiplier;
    $overtimeAmount = $overtimeHours * $overtimeHourlyRate;

    // 5. الصافي
    $netSalary = max(0.000, $salaryAfterDeductions - $advanceDeduction + $overtimeAmount);

    // 6. التحويل البنكي والنقدي الخام
    if ($bankEnabled) {
        // لا يتجاوز الصافي
        $bankAmount = min($netSalary, max(0.000, $requestedBankAmount));
        $rawCash = max(0.000, $netSalary - $bankAmount);
    } else {
        $bankAmount = 0.000;
        $rawCash = $netSalary;
    }

    // 7. النقدي النهائي مقرباً للأسفل لأقرب 0.050 د.ك وفرق التقريب
    $finalCash = roundCashDown($rawCash, $roundingStep);
    $roundingDiff = max(0.000, $rawCash - $finalCash);

    return [
        'days_in_month'           => $daysInMonth,
        'basic_salary'            => round($basicSalary, 3),
        'daily_work_hours'        => $dailyWorkHours,
        'daily_rate'              => round($dailyRate, 3),
        'hourly_rate'             => round($hourlyRate, 3),
        'overtime_rate_multiplier'=> round($overtimeMultiplier, 2),
        'overtime_hourly_rate'    => round($overtimeHourlyRate, 3),
        'absent_days'             => round($absentDays, 2),
        'absent_hours'            => round($absentHours, 2),
        'absent_days_deduction'   => round($absentDaysDeduction, 3),
        'absent_hours_deduction'  => round($absentHoursDeduction, 3),
        'salary_after_deductions' => round($salaryAfterDeductions, 3),
        'overtime_hours'          => round($overtimeHours, 2),
        'overtime_amount'         => round($overtimeAmount, 3),
        'advance_deduction'       => round($advanceDeduction, 3),
        'net_salary'              => round($netSalary, 3),
        'bank_amount'             => round($bankAmount, 3),
        'raw_cash'                => round($rawCash, 3),
        'final_cash'              => round($finalCash, 3),
        'rounding_diff'           => round($roundingDiff, 3),
    ];
}
