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

// ضبط معالجة وعرض الأخطاء بناءً على بيئة التشغيل
if (APP_ENV === 'production' && !APP_DEBUG) {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(E_ALL);
    ini_set('log_errors', '1');
    ini_set('error_log', dirname(__DIR__) . '/error_log.txt');
} else {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
}

// ثوابت الأمان والتحكم
define('LOGIN_MAX_ATTEMPTS', 5);      // أقصى عدد للمحاولات الفاشلة
define('LOGIN_LOCKOUT_MINUTES', 15);   // مدة الحظر بالدقائق بعد استنفاد المحاولات
define('DEFAULT_ADMIN_USER', 'admin'); // اسم مستخدم الأدمن الافتراضي
