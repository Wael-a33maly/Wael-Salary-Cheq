<?php
/**
 * نواة التحقق والمصادقة والأمان والجلسات (auth.php)
 * إدارة الجلسة الآمنة، حماية CSRF الصارمة، فحص الصلاحيات، ومحدد المحاولات
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/config/config.php';

// ضبط خصائص ملف تعريف الارتباط للجلسة قبل بدئها
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');

    $isSecure = (isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) === 'on') 
             || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    session_set_cookie_params([
        'lifetime' => 0, // تنتهي بإغلاق المتصفح
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isSecure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);

    session_start();
}

/**
 * توليد رمز CSRF وحفظه في الجلسة
 */
function getCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * إرجاع حقل مخفي لرمز CSRF لوضعه داخل النماذج
 */
function csrfField(): string {
    $token = htmlspecialchars(getCsrfToken(), ENT_QUOTES, 'UTF-8');
    return '<input type="hidden" name="csrf_token" value="' . $token . '">';
}

/**
 * التحقق الإلزامي من صحة رمز CSRF المرسل مع طلبات POST
 * تُستخدم في بداية كل معالجة POST
 */
function verifyCsrf(): bool {
    $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    if (empty($token) || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], (string)$token)) {
        http_response_code(403);
        die('خطأ أمني: رمز الحماية من تزوير الطلبات (CSRF Token) غير صالح أو انتهت صلاحيته. يرجى تحديث الصفحة والمحاولة مجدداً.');
    }
    return true;
}

/**
 * التحقق مما إذا كان المستخدم مسجّل دخوله حالياً
 */
function isAuthenticated(): bool {
    return !empty($_SESSION['user_id']) && !empty($_SESSION['logged_in']);
}

/**
 * إرجاع بيانات المستخدم الحالي من الجلسة
 */
function getCurrentUser(): ?array {
    if (!isAuthenticated()) {
        return null;
    }
    return [
        'id'                  => (int)$_SESSION['user_id'],
        'username'            => (string)($_SESSION['username'] ?? ''),
        'full_name'           => (string)($_SESSION['full_name'] ?? ''),
        'role'                => (string)($_SESSION['role'] ?? 'user'),
        'is_default_password' => (bool)($_SESSION['is_default_password'] ?? false),
    ];
}

/**
 * حماية الصفحة وإجبار المستخدم على تسجيل الدخول
 */
function requireAuth(string $loginUrl = 'login.php'): void {
    if (!isAuthenticated()) {
        $currentUrl = $_SERVER['REQUEST_URI'] ?? '';
        header('Location: ' . $loginUrl . '?redirect=' . urlencode($currentUrl));
        exit;
    }
}

/**
 * تسجيل دخول المستخدم وإنشاء الجلسة وتجديد المعرف
 */
function loginUser(array $user): void {
    session_regenerate_id(true);

    $_SESSION['logged_in']           = true;
    $_SESSION['user_id']             = (int)$user['id'];
    $_SESSION['username']            = (string)$user['username'];
    $_SESSION['full_name']           = (string)$user['full_name'];
    $_SESSION['role']                = (string)($user['role'] ?? 'super_admin');
    $_SESSION['is_default_password'] = (bool)($user['is_default_password'] ?? false);
    $_SESSION['last_activity']       = time();

    // تصفير عداد المحاولات الفاشلة بعد النجاح
    unset($_SESSION['login_attempts'], $_SESSION['login_lockout_time']);
}

/**
 * فحص محدد المحاولات (Rate Limiting) على تسجيل الدخول: 5 محاولات / 15 دقيقة
 */
function checkLoginRateLimit(): ?string {
    $now = time();
    $lockoutDuration = LOGIN_LOCKOUT_MINUTES * 60;

    if (isset($_SESSION['login_lockout_time'])) {
        $timeRemaining = $_SESSION['login_lockout_time'] - $now;
        if ($timeRemaining > 0) {
            $minutesRemaining = (int)ceil($timeRemaining / 60);
            return "تم حظر المحاولات مؤقتاً لتجاوز الحد المسموح. يرجى الانتظار {$minutesRemaining} دقيقة قبل المحاولة مرة أخرى.";
        } else {
            // انقضت مدة الحظر، تصفير السجل
            unset($_SESSION['login_attempts'], $_SESSION['login_lockout_time']);
        }
    }

    return null;
}

/**
 * تسجيل محاولة فاشلة في الجلسة وفرض الحظر عند بلوغ 5 محاولات
 */
function recordFailedLoginAttempt(): int {
    $_SESSION['login_attempts'] = ($_SESSION['login_attempts'] ?? 0) + 1;
    if ($_SESSION['login_attempts'] >= LOGIN_MAX_ATTEMPTS) {
        $_SESSION['login_lockout_time'] = time() + (LOGIN_LOCKOUT_MINUTES * 60);
    }
    return (int)$_SESSION['login_attempts'];
}

/**
 * تسجيل الخروج وتدمير الجلسة تماماً
 */
function logoutUser(): void {
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    session_destroy();
}
