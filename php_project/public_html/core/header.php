<?php
/**
 * ترويسة الصفحات العامة والشريط العلوي الموحد
 * نظام الرواتب متعدد الفروع (PHP 8.2 + Bootstrap 5 RTL)
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/helpers.php';

requireAuth();

$currentUser = getCurrentUser();
$pdo = getDbConnection();
$companySettings = getCompanySettings($pdo);

// عدد الإقامات التي ستنتهي قريباً
$alertDays = (int)($companySettings['residency_alert_days'] ?? 60);
$expiringCount = getExpiringResidenciesAlertCount($pdo, $alertDays);

$pageTitle = $pageTitle ?? $companySettings['company_name'];
$activeNav = $activeNav ?? '';

// حساب المسار النسبي للجذر حسب مكان استدعاء header.php
$isRoot = (basename(dirname($_SERVER['SCRIPT_FILENAME'] ?? '')) === basename(dirname(__DIR__)));
$base = $isRoot ? '' : '../';
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($pageTitle) ?> — <?= e($companySettings['company_name']) ?></title>
    <!-- Bootstrap 5 RTL CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <!-- خط Cairo العربي الرسمي -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Cairo', sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .navbar-main {
            background-color: #0f172a;
            border-bottom: 3px solid #2563eb;
        }
        .nav-link {
            font-size: 0.9rem;
            font-weight: 600;
            color: #cbd5e1 !important;
            padding: 0.5rem 0.85rem !important;
            border-radius: 0.5rem;
            transition: all 0.15s ease;
        }
        .nav-link:hover, .nav-link.active {
            color: #ffffff !important;
            background-color: rgba(37, 99, 235, 0.2);
        }
        .nav-link.active {
            background-color: #2563eb;
        }
        .card {
            border: 1px solid #e2e8f0;
            border-radius: 0.85rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .badge-kwd {
            background-color: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
            font-family: monospace;
            font-size: 0.85rem;
        }
        .residency-badge-pulse {
            animation: pulse-red 2s infinite;
        }
        @keyframes pulse-red {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        @media print {
            .no-print { display: none !important; }
            body { background: #fff !important; }
            .card { border: none !important; box-shadow: none !important; }
        }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark navbar-main py-2.5 no-print">
    <div class="container-fluid px-3 px-lg-4">
        <!-- الشعار واسم الشركة -->
        <a class="navbar-brand d-flex align-items-center gap-2" href="<?= $base ?>index.php">
            <?php if (!empty($companySettings['logo_path']) && file_exists(dirname(__DIR__) . '/' . $companySettings['logo_path'])): ?>
                <img src="<?= $base . e($companySettings['logo_path']) ?>" alt="Logo" height="36" class="rounded bg-white p-1">
            <?php else: ?>
                <span class="fs-4 bg-primary text-white rounded p-1 d-inline-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">💼</span>
            <?php endif; ?>
            <div class="d-flex flex-column">
                <span class="fw-bold fs-6 text-white leading-tight"><?= e($companySettings['company_name']) ?></span>
                <span class="text-slate-400" style="font-size: 0.75rem;">نظام الرواتب وإدارة الفروع (KWD)</span>
            </div>
        </a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="تبديل القائمة">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0 gap-1 mt-2 mt-lg-0">
                <li class="nav-item">
                    <a class="nav-link <?= $activeNav === 'dashboard' ? 'active' : '' ?>" href="<?= $base ?>index.php">لوحة التحكم</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= $activeNav === 'payroll' ? 'active' : '' ?>" href="<?= $base ?>modules/payroll/index.php">وحدة الرواتب</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= $activeNav === 'employees' ? 'active' : '' ?>" href="<?= $base ?>core/employees.php">الموظفون</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= $activeNav === 'branches' ? 'active' : '' ?>" href="<?= $base ?>core/branches.php">الفروع</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= $activeNav === 'departments' ? 'active' : '' ?>" href="<?= $base ?>core/departments.php">الأقسام</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= $activeNav === 'reports' ? 'active' : '' ?>" href="<?= $base ?>reports/index.php">التقارير (8)</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= $activeNav === 'settings' ? 'active' : '' ?>" href="<?= $base ?>core/settings.php">الإعدادات</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= $activeNav === 'audit' ? 'active' : '' ?>" href="<?= $base ?>core/audit_view.php">سجل التعديلات</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= $activeNav === 'cheques' ? 'active' : '' ?>" href="<?= $base ?>app.html" title="طباعة الشيكات ومطابقة الحسابات البنكية">
                        <span>💳 الشيكات والمطابقة</span>
                    </a>
                </li>
            </ul>

            <!-- الجزء الأيسر: شارة تنبيه الإقامة + معلومات المستخدم -->
            <div class="d-flex align-items-center gap-2 mt-2 mt-lg-0">
                <!-- شارة الإقامات قريبة الانتهاء -->
                <?php if ($expiringCount > 0): ?>
                    <a href="<?= $base ?>reports/residency.php?filter=alert" class="btn btn-warning btn-sm d-flex align-items-center gap-1.5 fw-bold px-2.5 py-1 text-dark" title="تنبيه: إقامات تنتهي قريباً">
                        <span class="residency-badge-pulse">⚠️</span>
                        <span>إقامات تنتهي قريباً:</span>
                        <span class="badge bg-danger text-white rounded-pill"><?= $expiringCount ?></span>
                    </a>
                <?php else: ?>
                    <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 small" style="font-size: 0.75rem;">
                        الإقامات سارية ✓
                    </span>
                <?php endif; ?>

                <!-- قائمة المستخدم -->
                <div class="dropdown">
                    <button class="btn btn-outline-light btn-sm dropdown-toggle d-flex align-items-center gap-1" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <span>👤</span>
                        <span class="small"><?= e($currentUser['full_name'] ?? 'المدير العام') ?></span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                        <li><span class="dropdown-item-text small text-muted">الدور: <?= e($currentUser['role'] ?? 'super_admin') ?></span></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item small" href="<?= $base ?>change_password.php">🔑 تغيير كلمة المرور</a></li>
                        <li><a class="dropdown-item small" href="<?= $base ?>core/users.php">👥 إدارة المستخدمين</a></li>
                        <li><a class="dropdown-item small" href="<?= $base ?>core/settings.php">⚙️ إعدادات النظام</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item small text-danger" href="<?= $base ?>logout.php">🚪 تسجيل الخروج</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</nav>

<!-- شارة تحذير كلمة المرور الافتراضية -->
<?php if (!empty($currentUser['is_default_password'])): ?>
    <div class="alert alert-danger mb-0 rounded-0 text-center py-2 px-3 fw-bold small d-flex align-items-center justify-content-center gap-2 no-print border-bottom border-danger-subtle">
        <span>⚠️ تنبيه أمني عاجل: أنت تستخدم كلمة المرور الافتراضية لحساب المدير العام!</span>
        <a href="<?= $base ?>change_password.php" class="btn btn-sm btn-danger px-3 py-0.5 fw-bold">تغيير كلمة المرور الآن</a>
    </div>
<?php endif; ?>

<main class="flex-grow-1 py-4">
    <div class="container-fluid px-3 px-lg-4">
