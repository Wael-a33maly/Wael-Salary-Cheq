<?php
/**
 * بوابة تشغيل منظومة الرواتب والشيكات والمطابقة البنكية الذكية (KWD)
 * تقدم الواجهة التفاعلية الشاملة المتطابقة تماماً مع المعاينة
 */
header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

if (file_exists(__DIR__ . '/index.html')) {
    readfile(__DIR__ . '/index.html');
} elseif (file_exists(__DIR__ . '/app.html')) {
    readfile(__DIR__ . '/app.html');
} else {
    echo '<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>نظام الرواتب والشيكات</title></head><body><h3>جاري تشغيل النظام... يرجى التأكد من استخراج ملفات الحزمة بالكامل.</h3></body></html>';
}
exit;
