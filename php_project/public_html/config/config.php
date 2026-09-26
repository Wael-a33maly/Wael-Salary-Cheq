<?php
/**
 * الإعدادات العامة للنظام — منفصل عن إعدادات قاعدة البيانات
 * نظام الرواتب متعدد الفروع (PHP 8.2 + MySQL)
 */

declare(strict_types=1);

// ضبط المنطقة الزمنية الرسمية لدولة الكويت
date_default_timezone_set('Asia/Kuwait');

// تعريف الثوابت الأساسية
define('APP_NAME', 'نظام رواتب متعدد الفروع');
define('APP_VERSION', '1.0.0');
define('APP_ENV', 'production'); // 'production' أو 'development'
define('APP_DEBUG', false);

// ضبط معالجة وعرض الأخطاء بناءً على بيئة التشغيل أو تمرير debug=1
$isDebug = (defined('APP_DEBUG') && APP_DEBUG === true) || (isset($_GET['debug']) && $_GET['debug'] === '1');
if ($isDebug) {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(E_ALL);
    ini_set('log_errors', '1');
}

// دوال التوافقية لإصدارات PHP السابقة (Polyfills)
if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with(string $haystack, string $needle): bool {
        return $needle === '' || $needle === substr($haystack, -strlen($needle));
    }
}
if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool {
        return $needle === '' || strpos($haystack, $needle) !== false;
    }
}

// ثوابت الأمان والتحكم
define('LOGIN_MAX_ATTEMPTS', 5);      // أقصى عدد للمحاولات الفاشلة
define('LOGIN_LOCKOUT_MINUTES', 15);   // مدة الحظر بالدقائق بعد استنفاد المحاولات
define('DEFAULT_ADMIN_USER', 'admin'); // اسم مستخدم الأدمن الافتراضي
