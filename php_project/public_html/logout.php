<?php
/**
 * صفحة تسجيل الخروج الآمنة
 * تقوم بتسجيل الحدث في سجل التدقيق ثم تدمير الجلسة تماماً والتحويل لصفحة تسجيل الدخول
 */

declare(strict_types=1);

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/core/auth.php';
require_once __DIR__ . '/core/audit.php';

$user = getCurrentUser();

if ($user) {
    try {
        $pdo = getDbConnection();
        logAuditEvent($pdo, $user['id'], 'LOGOUT', 'users', $user['id'], null, [
            'username' => $user['username'],
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);
    } catch (Throwable $e) {
        error_log('Logout audit failure: ' . $e->getMessage());
    }
}

logoutUser();

header('Location: login.php?msg=logged_out');
exit;
