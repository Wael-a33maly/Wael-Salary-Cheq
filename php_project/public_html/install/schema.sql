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

-- --------------------------------------------------------
-- 9) جدول الحسابات البنكية (bank_accounts)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'معرف الحساب مثل acc-cbk-main',
  `account_name` VARCHAR(150) NOT NULL COMMENT 'اسم الحساب في النظام',
  `bank_name` VARCHAR(100) NOT NULL COMMENT 'اسم البنك الرسمي e.g. البنك التجاري الكويتي',
  `bank_code` VARCHAR(20) NOT NULL DEFAULT 'CBK' COMMENT 'كود البنك المختصر (CBK, NBK, KFH...)',
  `account_number` VARCHAR(50) NOT NULL COMMENT 'رقم الحساب المصرفي',
  `iban` VARCHAR(50) NOT NULL COMMENT 'رقم الآيبان الدولي',
  `branch_name` VARCHAR(100) DEFAULT NULL COMMENT 'فرع البنك',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'د.ك' COMMENT 'العملة الرسمية',
  `current_balance` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'الرصيد الدفتري الحالي',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'هل هو الحساب الافتراضي لإصدار الشيكات',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `cheque_template` VARCHAR(50) NOT NULL DEFAULT 'CBK',
  `cheque_width_cm` DECIMAL(5,2) NOT NULL DEFAULT 18.00 COMMENT 'عرض الشيك بالسنتيمتر (18.0 سم)',
  `cheque_height_cm` DECIMAL(5,2) NOT NULL DEFAULT 9.00 COMMENT 'ارتفاع الشيك بالسنتيمتر (9.0 سم)',
  `cheque_image_url` LONGTEXT DEFAULT NULL COMMENT 'صورة أو ستامب الشيك المعتمد',
  `cheque_image_name` VARCHAR(255) DEFAULT NULL,
  `active_template_id` VARCHAR(50) DEFAULT NULL COMMENT 'معرف القالب النشط',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10) جدول قسائم ومقاسات الشيكات بالسنتيمتر (cheque_templates)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cheque_templates` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'معرف القالب e.g. tpl-cbk-std',
  `bank_account_id` VARCHAR(50) NOT NULL COMMENT 'مرتبط بالحساب البنكي',
  `name` VARCHAR(100) NOT NULL COMMENT 'اسم المقاس e.g. شيك تجاري قياسي',
  `width_cm` DECIMAL(5,2) NOT NULL DEFAULT 18.00 COMMENT 'العرض بالسنتيمتر',
  `height_cm` DECIMAL(5,2) NOT NULL DEFAULT 9.00 COMMENT 'الارتفاع بالسنتيمتر',
  `cheque_image_url` LONGTEXT DEFAULT NULL,
  `cheque_image_name` VARCHAR(255) DEFAULT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT DEFAULT NULL,
  `date_left_mm` DECIMAL(6,2) DEFAULT 142.00,
  `date_top_mm` DECIMAL(6,2) DEFAULT 12.00,
  `date_width_mm` DECIMAL(6,2) DEFAULT 32.00,
  `date_height_mm` DECIMAL(6,2) DEFAULT 7.50,
  `payee_left_mm` DECIMAL(6,2) DEFAULT 30.00,
  `payee_top_mm` DECIMAL(6,2) DEFAULT 24.00,
  `payee_width_mm` DECIMAL(6,2) DEFAULT 115.00,
  `payee_height_mm` DECIMAL(6,2) DEFAULT 8.00,
  `words_left_mm` DECIMAL(6,2) DEFAULT 28.00,
  `words_top_mm` DECIMAL(6,2) DEFAULT 35.00,
  `words_width_mm` DECIMAL(6,2) DEFAULT 122.00,
  `words_height_mm` DECIMAL(6,2) DEFAULT 15.00,
  `amount_left_mm` DECIMAL(6,2) DEFAULT 128.00,
  `amount_top_mm` DECIMAL(6,2) DEFAULT 48.00,
  `amount_width_mm` DECIMAL(6,2) DEFAULT 44.00,
  `amount_height_mm` DECIMAL(6,2) DEFAULT 10.00,
  `date_font_size` INT DEFAULT 13,
  `payee_font_size` INT DEFAULT 14,
  `words_font_size` INT DEFAULT 12,
  `amount_font_size` INT DEFAULT 15,
  INDEX (`bank_account_id`),
  CONSTRAINT `fk_tpl_bank` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11) جدول دفاتر الشيكات (cheque_books)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cheque_books` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'معرف الدفتر e.g. cb-cbk-01',
  `bank_account_id` VARCHAR(50) NOT NULL COMMENT 'مرتبط بالحساب البنكي',
  `book_code` VARCHAR(50) NOT NULL COMMENT 'كود الدفتر e.g. BK-CBK-2026-01',
  `book_name` VARCHAR(100) NOT NULL COMMENT 'اسم الدفتر',
  `serial_from` INT UNSIGNED NOT NULL COMMENT 'بداية التسلسل e.g. 100001',
  `serial_to` INT UNSIGNED NOT NULL COMMENT 'نهاية التسلسل e.g. 100050',
  `total_leaves` INT UNSIGNED NOT NULL DEFAULT 50 COMMENT 'عدد الأوراق',
  `current_serial` INT UNSIGNED NOT NULL COMMENT 'الرقم التسلسلي التالي للإصدار',
  `received_date` DATE NOT NULL COMMENT 'تاريخ استلام الدفتر من البنك',
  `status` ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`bank_account_id`),
  CONSTRAINT `fk_book_bank` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12) جدول المستفيدين (beneficiaries)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `beneficiaries` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'معرف المستفيد e.g. ben-1',
  `name_ar` VARCHAR(150) NOT NULL COMMENT 'الاسم بالعربية كما يطبع على الشيك',
  `name_en` VARCHAR(150) DEFAULT NULL COMMENT 'الاسم بالإنجليزية',
  `bank_account_id` VARCHAR(50) NOT NULL DEFAULT 'all' COMMENT 'مرتبط بحساب بنكي معين أو all',
  `category` VARCHAR(50) NOT NULL DEFAULT 'company' COMMENT 'فئة المستفيد: company, vendor, employee...',
  `civil_id_or_cr` VARCHAR(50) DEFAULT NULL COMMENT 'الرقم المدني أو السجل التجاري',
  `bank_name` VARCHAR(100) DEFAULT NULL,
  `iban` VARCHAR(50) DEFAULT NULL,
  `phone_number` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13) جدول الشيكات المصدرة (issued_cheques)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `issued_cheques` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'معرف الشيك e.g. chk-1001',
  `bank_account_id` VARCHAR(50) NOT NULL COMMENT 'الحساب البنكي',
  `cheque_book_id` VARCHAR(50) NOT NULL COMMENT 'دفتر الشيكات',
  `cheque_number` INT UNSIGNED NOT NULL COMMENT 'رقم الشيك العددي',
  `cheque_number_str` VARCHAR(20) NOT NULL COMMENT 'رقم الشيك كنص منسق 00100001',
  `beneficiary_id` VARCHAR(50) DEFAULT NULL,
  `beneficiary_name` VARCHAR(150) NOT NULL COMMENT 'اسم المستفيد المطبوع',
  `amount` DECIMAL(12,3) NOT NULL COMMENT 'مبلغ الشيك بالدينار الكويتي',
  `amount_in_words_ar` TEXT NOT NULL COMMENT 'تفقيط المبلغ بالعربية',
  `amount_in_words_en` TEXT DEFAULT NULL COMMENT 'تفقيط المبلغ بالإنجليزية',
  `tafqeet_lang` VARCHAR(10) NOT NULL DEFAULT 'ar' COMMENT 'لغة التفقيط المعتمدة',
  `issue_date` DATE NOT NULL COMMENT 'تاريخ التحرير',
  `due_date` DATE NOT NULL COMMENT 'تاريخ الاستحقاق',
  `status` ENUM('issued', 'cashed', 'cancelled') NOT NULL DEFAULT 'issued' COMMENT 'حالة الشيك: صادر/معلق، منصرف، ملغى',
  `cashed_date` DATE DEFAULT NULL COMMENT 'تاريخ الصرف من البنك',
  `cancelled_date` DATE DEFAULT NULL COMMENT 'تاريخ الإلغاء',
  `cancel_reason` TEXT DEFAULT NULL,
  `is_crossed` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'تسطير الشيك (للمستفيد الأول فقط)',
  `bearer_crossed` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'شطب عبارة أو لحامله',
  `purpose` VARCHAR(255) NOT NULL COMMENT 'البيان والغرض من الإصدار',
  `notes` TEXT DEFAULT NULL,
  `template_id` VARCHAR(50) DEFAULT NULL COMMENT 'معرف القالب المستخدم',
  `template_name` VARCHAR(100) DEFAULT NULL COMMENT 'اسم المقاس بالسنتيمتر',
  `cheque_width_cm` DECIMAL(5,2) DEFAULT 18.00,
  `cheque_height_cm` DECIMAL(5,2) DEFAULT 9.00,
  `created_by` VARCHAR(100) NOT NULL DEFAULT 'admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`bank_account_id`),
  INDEX (`cheque_book_id`),
  INDEX (`due_date`),
  INDEX (`status`),
  CONSTRAINT `fk_chk_bank` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_chk_book` FOREIGN KEY (`cheque_book_id`) REFERENCES `cheque_books` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 14) جدول إعدادات معايرة طباعة الشيكات (cheque_print_settings)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cheque_print_settings` (
  `id` INT UNSIGNED PRIMARY KEY DEFAULT 1,
  `offset_x` DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT 'إزاحة أفقية عامة بالملليمتر',
  `offset_y` DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT 'إزاحة رأسية عامة بالملليمتر',
  `show_background_on_print` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'طباعة خلفية الشيك أم نصوص فقط',
  `default_crossing` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'تسطير افتراضي',
  `default_bearer_crossing` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'شطب عبارة أو لحامله',
  `default_printer_name` VARCHAR(100) DEFAULT NULL,
  `cheque_due_date_alert_days` INT NOT NULL DEFAULT 7 COMMENT 'أيام تنبيه استحقاق الشيكات',
  `template_mode` VARCHAR(30) NOT NULL DEFAULT 'scanned_image',
  `custom_cheque_image_url` LONGTEXT DEFAULT NULL,
  `custom_cheque_image_name` VARCHAR(255) DEFAULT NULL,
  `date_offset_x` DECIMAL(6,2) DEFAULT 0.00,
  `date_offset_y` DECIMAL(6,2) DEFAULT 0.00,
  `payee_offset_x` DECIMAL(6,2) DEFAULT 0.00,
  `payee_offset_y` DECIMAL(6,2) DEFAULT 0.00,
  `words_offset_x` DECIMAL(6,2) DEFAULT 0.00,
  `words_offset_y` DECIMAL(6,2) DEFAULT 0.00,
  `amount_offset_x` DECIMAL(6,2) DEFAULT 0.00,
  `amount_offset_y` DECIMAL(6,2) DEFAULT 0.00,
  `date_width` DECIMAL(6,2) DEFAULT 32.00,
  `date_height` DECIMAL(6,2) DEFAULT 7.50,
  `payee_width` DECIMAL(6,2) DEFAULT 115.00,
  `payee_height` DECIMAL(6,2) DEFAULT 8.00,
  `words_width` DECIMAL(6,2) DEFAULT 122.00,
  `words_height` DECIMAL(6,2) DEFAULT 15.00,
  `amount_width` DECIMAL(6,2) DEFAULT 44.00,
  `amount_height` DECIMAL(6,2) DEFAULT 10.00,
  `date_font_size` INT DEFAULT 13,
  `payee_font_size` INT DEFAULT 14,
  `words_font_size` INT DEFAULT 12,
  `amount_font_size` INT DEFAULT 15,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 15) جدول إعدادات مطابقة البنك (reconciliation_settings)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reconciliation_settings` (
  `id` INT UNSIGNED PRIMARY KEY DEFAULT 1,
  `auto_extract_differences` TINYINT(1) NOT NULL DEFAULT 1,
  `small_difference_limit` DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  `bank_fee_expense_account_id` VARCHAR(50) NOT NULL DEFAULT '5020-01',
  `bank_fee_expense_account_name` VARCHAR(150) NOT NULL DEFAULT 'مصروف عمولات ومصاريف بنكية',
  `allowed_date_tolerance_days` INT NOT NULL DEFAULT 3,
  `allow_batch_matching` TINYINT(1) NOT NULL DEFAULT 1,
  `auto_detect_debit_credit` TINYINT(1) NOT NULL DEFAULT 1,
  `enable_fuzzy_matching` TINYINT(1) NOT NULL DEFAULT 1,
  `mask_bank_accounts_in_reports` TINYINT(1) NOT NULL DEFAULT 0,
  `custom_bank_name` VARCHAR(100) DEFAULT NULL,
  `custom_account_number` VARCHAR(50) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 16) جدول جلسات مطابقة البنك (reconciliation_sessions)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reconciliation_sessions` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'معرف الجلسة e.g. rec-2026-09',
  `bank_account_id` VARCHAR(50) NOT NULL,
  `bank_account_name` VARCHAR(150) NOT NULL,
  `bank_account_number` VARCHAR(50) NOT NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'KWD',
  `opening_balance_bank` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `closing_balance_bank` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `opening_balance_accounting` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `closing_balance_accounting` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `adjusted_bank_balance` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `adjusted_accounting_balance` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `unreconciled_difference` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `status` ENUM('draft', 'in_progress', 'reconciled', 'approved', 'closed') NOT NULL DEFAULT 'draft',
  `total_bank_transactions` INT NOT NULL DEFAULT 0,
  `matched_bank_transactions` INT NOT NULL DEFAULT 0,
  `unmatched_bank_transactions` INT NOT NULL DEFAULT 0,
  `total_accounting_transactions` INT NOT NULL DEFAULT 0,
  `matched_accounting_transactions` INT NOT NULL DEFAULT 0,
  `unmatched_accounting_transactions` INT NOT NULL DEFAULT 0,
  `total_differences_count` INT NOT NULL DEFAULT 0,
  `resolved_differences_count` INT NOT NULL DEFAULT 0,
  `pending_differences_count` INT NOT NULL DEFAULT 0,
  `total_fees_amount` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `created_by` VARCHAR(100) NOT NULL DEFAULT 'admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`bank_account_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 17) جدول حركات كشف الحساب البنكي (reconciliation_bank_tx)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reconciliation_bank_tx` (
  `id` VARCHAR(60) PRIMARY KEY,
  `session_id` VARCHAR(50) NOT NULL,
  `row_number` INT NOT NULL DEFAULT 1,
  `transaction_date` DATE NOT NULL,
  `reference_number` VARCHAR(100) DEFAULT NULL,
  `description` TEXT NOT NULL,
  `debit` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'مدين (سحب)',
  `credit` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'دائن (إيداع)',
  `net_amount` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `balance_after` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `party_name` VARCHAR(150) DEFAULT NULL,
  `cheque_number` VARCHAR(50) DEFAULT NULL,
  `transfer_number` VARCHAR(50) DEFAULT NULL,
  `match_status` VARCHAR(30) NOT NULL DEFAULT 'unmatched',
  `matched_accounting_id` VARCHAR(60) DEFAULT NULL,
  `matched_level` VARCHAR(20) DEFAULT NULL,
  `is_excluded` TINYINT(1) NOT NULL DEFAULT 0,
  `exclusion_reason` VARCHAR(255) DEFAULT NULL,
  `has_error` TINYINT(1) NOT NULL DEFAULT 0,
  `validation_error` VARCHAR(255) DEFAULT NULL,
  INDEX (`session_id`),
  INDEX (`transaction_date`),
  INDEX (`match_status`),
  CONSTRAINT `fk_banktx_session` FOREIGN KEY (`session_id`) REFERENCES `reconciliation_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 18) جدول حركات دفتر الأستاذ العام (reconciliation_ledger_tx)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reconciliation_ledger_tx` (
  `id` VARCHAR(60) PRIMARY KEY,
  `session_id` VARCHAR(50) NOT NULL,
  `journal_entry_number` VARCHAR(50) DEFAULT NULL,
  `entry_date` DATE NOT NULL,
  `reference_number` VARCHAR(100) DEFAULT NULL,
  `description` TEXT NOT NULL,
  `counter_account_name` VARCHAR(150) DEFAULT NULL,
  `counter_account_code` VARCHAR(50) DEFAULT NULL,
  `debit` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'مدين (إيداع)',
  `credit` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'دائن (صرف)',
  `net_amount` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `cheque_number` VARCHAR(50) DEFAULT NULL,
  `transfer_number` VARCHAR(50) DEFAULT NULL,
  `party_name` VARCHAR(150) DEFAULT NULL,
  `source_module` VARCHAR(30) NOT NULL DEFAULT 'general_ledger',
  `match_status` VARCHAR(30) NOT NULL DEFAULT 'unmatched',
  `matched_bank_id` VARCHAR(60) DEFAULT NULL,
  INDEX (`session_id`),
  INDEX (`entry_date`),
  INDEX (`match_status`),
  CONSTRAINT `fk_ledgertx_session` FOREIGN KEY (`session_id`) REFERENCES `reconciliation_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 19) جدول فروقات المطابقة (reconciliation_diffs)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reconciliation_diffs` (
  `id` VARCHAR(60) PRIMARY KEY,
  `session_id` VARCHAR(50) NOT NULL,
  `bank_tx_id` VARCHAR(60) DEFAULT NULL,
  `accounting_tx_id` VARCHAR(60) DEFAULT NULL,
  `difference_type` VARCHAR(50) NOT NULL,
  `transaction_date` DATE NOT NULL,
  `reference_number` VARCHAR(100) DEFAULT NULL,
  `description` TEXT NOT NULL,
  `bank_amount` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `accounting_amount` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `difference_value` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `cause` TEXT DEFAULT NULL,
  `required_action` TEXT DEFAULT NULL,
  `responsible_person` VARCHAR(100) DEFAULT NULL,
  `processing_status` ENUM('pending', 'in_progress', 'resolved', 'closed_as_fee') NOT NULL DEFAULT 'pending',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`session_id`),
  INDEX (`processing_status`),
  CONSTRAINT `fk_diff_session` FOREIGN KEY (`session_id`) REFERENCES `reconciliation_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 20) جدول قيود تسوية المطابقة (reconciliation_jvs)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reconciliation_jvs` (
  `id` VARCHAR(60) PRIMARY KEY,
  `session_id` VARCHAR(50) NOT NULL,
  `entry_number` VARCHAR(50) NOT NULL,
  `entry_date` DATE NOT NULL,
  `bank_account_id` VARCHAR(50) NOT NULL,
  `counter_account_id` VARCHAR(50) NOT NULL,
  `counter_account_name` VARCHAR(150) NOT NULL,
  `amount` DECIMAL(12,3) NOT NULL,
  `entry_type` VARCHAR(30) NOT NULL,
  `fee_type` VARCHAR(30) DEFAULT NULL,
  `reference_number` VARCHAR(100) DEFAULT NULL,
  `description` TEXT NOT NULL,
  `created_by` VARCHAR(100) NOT NULL DEFAULT 'admin',
  `source_tx_id` VARCHAR(60) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`session_id`),
  CONSTRAINT `fk_jv_session` FOREIGN KEY (`session_id`) REFERENCES `reconciliation_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 21) جدول مسيرات الرواتب الشهرية المعتمدة (monthly_payrolls)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `monthly_payrolls` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'معرف المسير مثل 2026-10',
  `year` SMALLINT UNSIGNED NOT NULL,
  `month` TINYINT UNSIGNED NOT NULL,
  `month_name` VARCHAR(50) NOT NULL,
  `days_in_month` TINYINT UNSIGNED NOT NULL DEFAULT 30,
  `voucher_base_number` INT UNSIGNED DEFAULT 1001,
  `employee_ids` LONGTEXT DEFAULT NULL COMMENT 'JSON array of selected employee IDs',
  `inputs_json` LONGTEXT DEFAULT NULL COMMENT 'JSON object of employee input records',
  `total_basic_salary` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `total_net_salary` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `total_bank` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `total_cash` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `total_rounding_diff` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `status` VARCHAR(20) NOT NULL DEFAULT 'approved',
  `calculated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`year`),
  INDEX (`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- إدراج البيانات الأولية الافتراضية للبنوك والشيكات والمطابقة
-- --------------------------------------------------------
INSERT INTO `bank_accounts` (`id`, `account_name`, `bank_name`, `bank_code`, `account_number`, `iban`, `branch_name`, `currency`, `current_balance`, `is_default`, `status`, `cheque_template`, `cheque_width_cm`, `cheque_height_cm`, `cheque_image_url`, `active_template_id`)
VALUES 
('acc-cbk-main', 'حساب العمليات الرئيسي - التجاري', 'البنك التجاري الكويتي (CBK)', 'CBK', '1020491823', 'KW18CBKU000000001020491823', 'الفرع الرئيسي - مبارك الكبير', 'د.ك', 85400.000, 1, 'active', 'CBK', 18.00, 9.00, '/uploads/cheques/cbk_cheque_bg.jpg', 'tpl-cbk-std')
ON DUPLICATE KEY UPDATE `account_name`=VALUES(`account_name`);

INSERT INTO `cheque_templates` (`id`, `bank_account_id`, `name`, `width_cm`, `height_cm`, `cheque_image_url`, `is_default`, `notes`)
VALUES 
('tpl-cbk-std', 'acc-cbk-main', 'شيك تجاري قياسي (18×9 سم)', 18.00, 9.00, '/uploads/cheques/cbk_cheque_bg.jpg', 1, 'المقاس المعتمد للبنك التجاري الكويتي'),
('tpl-cbk-corp', 'acc-cbk-main', 'شيك شركات عريض (21×8.5 سم)', 21.00, 8.50, '/uploads/cheques/cbk_cheque_bg.jpg', 0, 'مقاس شيكات الشركات الخاصة')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

INSERT INTO `cheque_books` (`id`, `bank_account_id`, `book_code`, `book_name`, `serial_from`, `serial_to`, `total_leaves`, `current_serial`, `received_date`, `status`, `notes`)
VALUES 
('cb-cbk-01', 'acc-cbk-main', 'BK-CBK-2026-01', 'دفتر شيكات التجاري رقم 1', 100001, 100050, 50, 100006, '2026-01-01', 'active', 'دفتر الشيكات المعتمد للرواتب والموردين')
ON DUPLICATE KEY UPDATE `book_name`=VALUES(`book_name`);

INSERT INTO `beneficiaries` (`id`, `name_ar`, `name_en`, `bank_account_id`, `category`, `civil_id_or_cr`, `bank_name`, `iban`, `phone_number`, `status`)
VALUES 
('ben-1', 'شركة الأندلس لمواد البناء والمقاولات', 'Al Andalus Building Materials Co.', 'all', 'vendor', '10928374', 'بنك الكويت الوطني', 'KW82NBOK000000001092837401', '22451000', 'active'),
('ben-2', 'شركة الغانم للمعدات والآليات الثقيلة', 'Alghanim Heavy Equipment Co.', 'all', 'vendor', '98273641', 'بيت التمويل الكويتي', 'KW44KFHU000000009827364102', '24843000', 'active'),
('ben-3', 'أحمد محمود العوضي', 'Ahmed Mahmoud Al Awadhi', 'all', 'individual', '288041501234', 'البنك التجاري الكويتي', 'KW18CBKU000000002880415012', '99887766', 'active'),
('ben-4', 'المؤسسة العامة للتأمينات الاجتماعية', 'Public Institution for Social Security', 'all', 'government', '10000001', 'بنك الكويت المركزي', 'KW00CBKW000000001000000100', '114', 'active')
ON DUPLICATE KEY UPDATE `name_ar`=VALUES(`name_ar`);

INSERT INTO `cheque_print_settings` (`id`, `offset_x`, `offset_y`, `show_background_on_print`, `default_crossing`, `default_bearer_crossing`, `default_printer_name`, `cheque_due_date_alert_days`, `template_mode`)
VALUES 
(1, 0.00, 0.00, 0, 1, 1, 'EPSON LQ-350 / Cheque Printer', 7, 'scanned_image')
ON DUPLICATE KEY UPDATE `updated_at`=NOW();

INSERT INTO `reconciliation_settings` (`id`, `auto_extract_differences`, `small_difference_limit`, `bank_fee_expense_account_id`, `bank_fee_expense_account_name`, `allowed_date_tolerance_days`, `allow_batch_matching`, `auto_detect_debit_credit`, `enable_fuzzy_matching`, `mask_bank_accounts_in_reports`)
VALUES 
(1, 1, 1.000, '5020-01', 'مصروف عمولات ومصاريف بنكية', 3, 1, 1, 1, 0)
ON DUPLICATE KEY UPDATE `updated_at`=NOW();

INSERT INTO `settings` (`id`, `company_name`, `overtime_multiplier`, `residency_alert_days`, `currency`, `rounding_step`)
VALUES 
(1, 'شركة الأعمال للتجارة والمقاولات', 1.25, 60, 'د.ك', 0.050)
ON DUPLICATE KEY UPDATE `updated_at`=NOW();

SET FOREIGN_KEY_CHECKS = 1;

