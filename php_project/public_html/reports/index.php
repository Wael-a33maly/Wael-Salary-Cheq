<?php
/**
 * مركز التقارير الثمانية — المرحلة 4
 * تصفح وإصدار كافة التقارير الإدارية والمالية مع الطباعة والتصدير
 */

declare(strict_types=1);

$pageTitle = 'مركز التقارير الشاملة (8 تقارير)';
$activeNav = 'reports';

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';

requireAuth();

$pdo = getDbConnection();
$companySettings = getCompanySettings($pdo);

$reports = [
    [
        'id' => 'aggregated',
        'title' => '1. التقرير المجمع للرواتب (كل الفروع)',
        'desc' => 'عرض كشف رواتب جميع فروع الشركة مجمعة في جدول واحد مع مجاميع كل فرع والإجمالي العام.',
        'icon' => '📊',
        'url' => 'aggregated.php',
        'badge' => 'التقرير المالي الرئيسي',
        'color' => 'primary'
    ],
    [
        'id' => 'branch',
        'title' => '2. تقرير رواتب فرع محدد',
        'desc' => 'كشف رواتب تفصيلي شهري لموظفي فرع بعينه مع إجماليات الفرع في نهاية الجدول.',
        'icon' => '🏢',
        'url' => 'branch.php',
        'badge' => 'خاص بالفرع',
        'color' => 'info'
    ],
    [
        'id' => 'banking',
        'title' => '3. تقرير التحويلات البنكية والنقدية',
        'desc' => 'كشف مالي يفصل المبالغ المحولة للبنوك (مجمعة باسم كل بنك) وإجمالي النقد السائل المطلوب سحبه وصرفه.',
        'icon' => '🏦',
        'url' => 'banking.php',
        'badge' => 'للبنوك والخزينة',
        'color' => 'success'
    ],
    [
        'id' => 'rounding',
        'title' => '4. تقرير فروق التقريب (لصالح الشركة)',
        'desc' => 'حساب وعرض فروق تقريب النقدي للأسفل (أقرب 0.050 د.ك) لكل موظف والإجمالي المتوفر لصالح الشركة.',
        'icon' => '🪙',
        'url' => 'rounding.php',
        'badge' => 'فروق الفلس',
        'color' => 'warning'
    ],
    [
        'id' => 'advances',
        'title' => '5. تقرير استقطاعات السلف الشهرية',
        'desc' => 'حصر المبالغ المخصومة كسلف شهرياً من كل موظف والإجمالي المستقطع خلال الشهر المحدد.',
        'icon' => '💸',
        'url' => 'advances.php',
        'badge' => 'استقطاعات',
        'color' => 'danger'
    ],
    [
        'id' => 'residency',
        'title' => '6. تقرير متابعة انتهاء الإقامات',
        'desc' => 'متابعة بصرية للإقامات المنتهية وقريبة الانتهاء (30 / 60 / 90 يوماً) مع التصنيف بالألوان الخمسة.',
        'icon' => '🪪',
        'url' => 'residency.php',
        'badge' => 'شؤون الموظفين',
        'color' => 'secondary'
    ],
    [
        'id' => 'archive',
        'title' => '7. الأرشيف المالي للسنوات والأشهر',
        'desc' => 'تصفح كشوف الرواتب التاريخية: السنة &larr; الشهر &larr; قسائم الرواتب المحفوظة مع إمكانية التصدير.',
        'icon' => '🗄️',
        'url' => 'archive.php',
        'badge' => 'سجلات سابقة',
        'color' => 'dark'
    ],
    [
        'id' => 'payslips_quick',
        'title' => '8. استخراج قسائم الرواتب الفردية',
        'desc' => 'البحث عن موظف وطباعة أو تصدير قسيمته التفصيلية الفردية لشهر محدد بترويسة الشعار.',
        'icon' => '📄',
        'url' => '../modules/payroll/index.php',
        'badge' => 'قسيمة فردية',
        'color' => 'primary'
    ],
];

require_once __DIR__ . '/../core/header.php';
?>

<div class="mb-4">
    <h3 class="fw-bold mb-1">📈 مركز التقارير الشاملة (8 تقارير)</h3>
    <p class="text-muted small mb-0">تقارير إدارية ومالية متكاملة بالدينار الكويتي KWD تدعم الفلترة، الطباعة الرسمية، وتصدير Excel و PDF</p>
</div>

<div class="row g-4">
    <?php foreach ($reports as $r): ?>
        <div class="col-md-6 col-lg-4">
            <div class="card h-100 p-4 transition hover:shadow-md border border-slate-200">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <span class="fs-2"><?= $r['icon'] ?></span>
                    <span class="badge bg-<?= $r['color'] ?>-subtle text-<?= $r['color'] ?> border border-<?= $r['color'] ?>-subtle small">
                        <?= $r['badge'] ?>
                    </span>
                </div>
                <h5 class="fw-bold text-dark mb-2"><?= $r['title'] ?></h5>
                <p class="text-muted small flex-grow-1 mb-4"><?= $r['desc'] ?></p>
                <a href="<?= $r['url'] ?>" class="btn btn-outline-<?= $r['color'] ?> btn-sm fw-bold w-100 mt-auto">
                    فتح التقرير &larr;
                </a>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<?php require_once __DIR__ . '/../core/footer.php'; ?>
