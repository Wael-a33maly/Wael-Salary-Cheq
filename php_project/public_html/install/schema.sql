-- =====================================================
-- نظام الرواتب متعدد الفروع — جداول قاعدة البيانات الكاملة
-- متوافق مع MySQL 8.0+ / 5.7+ و MariaDB (Hostinger)
-- الترميز: utf8mb4 / الترتيب: utf8mb4_unicode_ci
-- المنطقة الزمنية: Asia/Kuwait (+03:00)
-- جميع المبالغ المالية بدقة DECIMAL(10,3) NOT NULL DEFAULT 0.000
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+03:00";

-- --------------------------------------------------------
-- 1) جدول المستخدمين (users)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT 'اسم المستخدم لتسجيل الدخول',
  `password` VARCHAR(255) NOT NULL COMMENT 'كلمة المرور المشفرة بواسطة bcrypt',
  `full_name` VARCHAR(100) NOT NULL COMMENT 'الاسم الكامل للمستخدم',
  `role` VARCHAR(20) NOT NULL DEFAULT 'super_admin' COMMENT 'الدور: super_admin / manager',
  `is_default_password` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 إذا كانت كلمة المرور هي الافتراضية للتنبيه بتغييرها',
  `last_login` DATETIME DEFAULT NULL COMMENT 'تاريخ ووقت آخر تسجيل دخول',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2) جدول الإعدادات العامة (settings)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT UNSIGNED PRIMARY KEY DEFAULT 1,
  `company_name` VARCHAR(150) NOT NULL DEFAULT 'شركة الأعمال للتجارة والمقاولات' COMMENT 'اسم الشركة بالكامل',
  `logo_path` VARCHAR(255) DEFAULT NULL COMMENT 'مسار ملف الشعار',
  `company_address` VARCHAR(255) DEFAULT NULL COMMENT 'عنوان الشركة في الكويت',
  `company_phone` VARCHAR(50) DEFAULT NULL COMMENT 'هاتف التواصل',
  `overtime_multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.25 COMMENT 'معامل ساعة الإضافي (افتراضي 1.25)',
  `residency_alert_days` INT UNSIGNED NOT NULL DEFAULT 60 COMMENT 'أيام التنبيه لانتهاء الإقامة (افتراضي 60 يوم)',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'KWD' COMMENT 'العملة الرسمية',
  `rounding_step` DECIMAL(5,3) NOT NULL DEFAULT 0.050 COMMENT 'خطوة تقريب النقدي للأسفل (0.050 د.ك)',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3) جدول الفروع (branches)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `branches` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT 'اسم الفرع',
  `code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'كود الفرع المميز',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'حالة الفرع',
  `notes` TEXT DEFAULT NULL COMMENT 'ملاحظات إضافية عن الفرع',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4) جدول الأقسام (departments)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `branch_id` INT UNSIGNED NOT NULL COMMENT 'معرف الفرع المرتبط',
  `name` VARCHAR(100) NOT NULL COMMENT 'اسم القسم',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'حالة القسم',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`branch_id`),
  CONSTRAINT `fk_dept_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5) جدول الموظفين (employees)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `civil_id` VARCHAR(12) NOT NULL UNIQUE COMMENT 'الرقم المدني الكويتي - 12 رقماً فريداً',
  `name` VARCHAR(150) NOT NULL COMMENT 'اسم الموظف الكامل',
  `job_title` VARCHAR(100) NOT NULL COMMENT 'المسمى الوظيفي',
  `branch_id` INT UNSIGNED NOT NULL COMMENT 'الفرع التابع له مباشرة',
  `department_id` INT UNSIGNED NOT NULL COMMENT 'القسم التابع له',
  `basic_salary` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'الراتب الأساسي بالدينار الكويتي',
  `daily_work_hours` INT UNSIGNED NOT NULL DEFAULT 8 COMMENT 'ساعات العمل اليومية للموظف (افتراضي 8)',
  `bank_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'تفعيل التحويل البنكي (1=نعم, 0=لا)',
  `bank_transfer_amount` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'مبلغ التحويل البنكي المحدد في البطاقة',
  `bank_name` VARCHAR(100) DEFAULT NULL COMMENT 'اسم البنك المحلي',
  `iban` VARCHAR(40) DEFAULT NULL COMMENT 'رقم الآيبان الدولي',
  `residence_number` VARCHAR(50) DEFAULT NULL COMMENT 'رقم الإقامة أو الجواز',
  `residence_expiry_date` DATE DEFAULT NULL COMMENT 'تاريخ انتهاء الإقامة (اختياري)',
  `hire_date` DATE NOT NULL COMMENT 'تاريخ التعيين',
  `status` ENUM('active', 'suspended', 'resigned') NOT NULL DEFAULT 'active' COMMENT 'الحالة: نشط/موقوف/مستقيل',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`branch_id`),
  INDEX (`department_id`),
  INDEX (`status`),
  INDEX (`residence_expiry_date`),
  CONSTRAINT `fk_emp_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_emp_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6) جدول السجلات الشهرية للموظفين (monthly_records)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `monthly_records` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT UNSIGNED NOT NULL COMMENT 'معرف الموظف',
  `month` TINYINT UNSIGNED NOT NULL COMMENT 'الشهر (1-12)',
  `year` SMALLINT UNSIGNED NOT NULL COMMENT 'السنة الميلادية',
  `absent_days` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'أيام الغياب',
  `absent_hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'ساعات الغياب',
  `overtime_hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'ساعات العمل الإضافي',
  `advance_deduction` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'مبلغ السلفة المخصومة لهذا الشهر',
  `bank_amount` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'مبلغ البنك المعتمد لهذا الشهر',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_emp_month_year` (`employee_id`, `month`, `year`),
  CONSTRAINT `fk_record_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7) جدول قسائم الرواتب المحسوبة (payslips)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payslips` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT UNSIGNED NOT NULL COMMENT 'معرف الموظف',
  `month` TINYINT UNSIGNED NOT NULL COMMENT 'الشهر (1-12)',
  `year` SMALLINT UNSIGNED NOT NULL COMMENT 'السنة الميلادية',
  `days_in_month` TINYINT UNSIGNED NOT NULL COMMENT 'عدد أيام الشهر الفعلية (28-31)',
  `basic_salary` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'الراتب الأساسي',
  `daily_work_hours` INT UNSIGNED NOT NULL DEFAULT 8 COMMENT 'ساعات العمل اليومية للموظف',
  `daily_rate` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'قيمة اليوم = الأساسي ÷ أيام الشهر',
  `hourly_rate` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'قيمة الساعة = قيمة اليوم ÷ ساعات العمل',
  `overtime_rate_multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.25 COMMENT 'معامل الإضافي المعتمد وقت الحساب',
  `overtime_hourly_rate` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'قيمة ساعة الإضافي',
  `absent_days` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `absent_hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `absent_days_deduction` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'خصم الأيام = أيام الغياب × قيمة اليوم',
  `absent_hours_deduction` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'خصم الساعات = ساعات الغياب × قيمة الساعة',
  `salary_after_deductions` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'الأساسي − إجمالي الخصومات',
  `overtime_hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `overtime_amount` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'مبلغ الإضافي',
  `advance_deduction` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'مبلغ السلفة المخصومة',
  `net_salary` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'الصافي = بعد الخصم − السلفة + الإضافي',
  `bank_amount` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'المبلغ البنكي (لا يتجاوز الصافي)',
  `raw_cash` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'النقدي الخام = الصافي − البنكي',
  `final_cash` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'النقدي النهائي مقرب للأسفل لأقرب 0.050 د.ك',
  `rounding_diff` DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'فرق التقريب لصالح الشركة = الخام − النهائي',
  `calculated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `calculated_by` INT UNSIGNED DEFAULT NULL COMMENT 'المستخدم الذي اعتمد الحساب',
  UNIQUE KEY `uniq_slip_emp_month_year` (`employee_id`, `month`, `year`),
  CONSTRAINT `fk_slip_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8) جدول سجل التدقيق والتعديلات (audit_log)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL COMMENT 'معرف المستخدم القائم بالإجراء',
  `action` VARCHAR(50) NOT NULL COMMENT 'نوع الإجراء: INSTALL, LOGIN, BRANCH_CREATE, SALARY_SAVE...',
  `table_name` VARCHAR(50) DEFAULT NULL COMMENT 'الجدول المتأثر',
  `record_id` INT UNSIGNED DEFAULT NULL COMMENT 'معرف السجل المتأثر',
  `old_values` LONGTEXT DEFAULT NULL COMMENT 'القيم السابقة بصيغة JSON',
  `new_values` LONGTEXT DEFAULT NULL COMMENT 'القيم الجديدة بصيغة JSON',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'عنوان IP للمستخدم',
  `user_agent` VARCHAR(255) DEFAULT NULL COMMENT 'متصفح المستخدم',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`user_id`),
  INDEX (`action`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
