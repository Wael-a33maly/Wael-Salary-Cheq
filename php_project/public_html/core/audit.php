<?php
/**
 * نواة نظام التدقيق والتعديلات (audit_log)
 * تسجل كل الحركات الحساسة في النظام: تسجيل دخول، تعديلات الرواتب، إعدادات، إضافة موظفين...
 */

declare(strict_types=1);

/**
 * تسجيل حركة في سجل التدقيق
 *
 * @param PDO $pdo كائن الاتصال بقاعدة البيانات
 * @param int|null $userId معرف المستخدم الذي قام بالإجراء (أو null)
 * @param string $action كود الإجراء مثل: LOGIN, LOGOUT, BRANCH_ADD, SALARY_CALC...
 * @param string|null $tableName اسم الجدول المتأثر
 * @param int|null $recordId معرف السجل المتأثر
 * @param array|null $oldValues القيم القديمة كـ array
 * @param array|null $newValues القيم الجديدة كـ array
 * @return bool نجاح التسجيل
 */
function logAuditEvent(
    PDO $pdo,
    ?int $userId,
    string $action,
    ?string $tableName = null,
    ?int $recordId = null,
    ?array $oldValues = null,
    ?array $newValues = null
): bool {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 255);

        $oldJson = $oldValues !== null ? json_encode($oldValues, JSON_UNESCAPED_UNICODE) : null;
        $newJson = $newValues !== null ? json_encode($newValues, JSON_UNESCAPED_UNICODE) : null;

        $stmt = $pdo->prepare("
            INSERT INTO audit_log 
                (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at)
            VALUES 
                (:user_id, :action, :table_name, :record_id, :old_values, :new_values, :ip_address, :user_agent, NOW())
        ");

        return $stmt->execute([
            ':user_id'    => $userId,
            ':action'     => $action,
            ':table_name' => $tableName,
            ':record_id'  => $recordId,
            ':old_values' => $oldJson,
            ':new_values' => $newJson,
            ':ip_address' => $ip,
            ':user_agent' => $userAgent,
        ]);
    } catch (Throwable $e) {
        // عدم تعطيل النظام الأساسي في حال فشل تسجيل السجل
        error_log('Audit Log Failure: ' . $e->getMessage());
        return false;
    }
}
