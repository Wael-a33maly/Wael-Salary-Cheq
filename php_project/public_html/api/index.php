<?php
/**
 * واجهة برمجة التطبيقات المركزية الموحدة — API Gateway
 * تربط تطبيق الواجهة بقاعدة بيانات MySQL على استضافة Hostinger
 * لتمكين المزامنة الحية لكافة أقسام النظام (طباعة الشيكات، مطابقة البنك، الرواتب، الفروع، والموظفين)
 */

declare(strict_types=1);

// إعدادات الترويسة لطلبات الـ REST API ودعم CORS الكامل
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$configFile = dirname(__DIR__) . '/config/db.php';
$lockFile = dirname(__DIR__) . '/install/install.lock';

// التحقق من اكتمال التثبيت
if (!file_exists($configFile)) {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'installed' => false,
        'message' => 'النظام غير مثبت بعد، يرجى تشغيل معالج التنصيب /install/'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once dirname(__DIR__) . '/config/config.php';
require_once $configFile;

try {
    $pdo = getDbConnection();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'تعذر الاتصال بقاعدة البيانات: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = trim($_GET['action'] ?? '');
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?? [];

// =========================================================================
// 1. فحص الاتصال والحالة (ping)
// =========================================================================
if ($action === 'ping' || $action === 'health') {
    echo json_encode([
        'success' => true,
        'installed' => true,
        'database' => 'connected',
        'timestamp' => date('Y-m-d H:i:s'),
        'server_timezone' => date_default_timezone_get()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// =========================================================================
// 2. جلب كامل بيانات النظام دفعة واحدة (Bootstrap)
// =========================================================================
if ($action === 'bootstrap') {
    try {
        // الحسابات البنكية مع قوالبها
        $bankAccountsStmt = $pdo->query("SELECT * FROM bank_accounts ORDER BY is_default DESC, account_name ASC");
        $bankAccounts = $bankAccountsStmt->fetchAll(PDO::FETCH_ASSOC);

        // جلب قوالب الشيكات
        $templatesStmt = $pdo->query("SELECT * FROM cheque_templates ORDER BY is_default DESC, name ASC");
        $templates = $templatesStmt->fetchAll(PDO::FETCH_ASSOC);

        // تجميع القوالب داخل كل بنك
        $templatesByBank = [];
        foreach ($templates as $tpl) {
            $bankId = $tpl['bank_account_id'];
            if (!isset($templatesByBank[$bankId])) {
                $templatesByBank[$bankId] = [];
            }
            $templatesByBank[$bankId][] = [
                'id' => $tpl['id'],
                'name' => $tpl['name'],
                'widthCm' => (float)$tpl['width_cm'],
                'heightCm' => (float)$tpl['height_cm'],
                'chequeImageUrl' => $tpl['cheque_image_url'],
                'chequeImageName' => $tpl['cheque_image_name'],
                'isDefault' => (bool)$tpl['is_default'],
                'notes' => $tpl['notes'],
                'dateLeftMm' => (float)$tpl['date_left_mm'],
                'dateTopMm' => (float)$tpl['date_top_mm'],
                'dateWidthMm' => (float)$tpl['date_width_mm'],
                'dateHeightMm' => (float)$tpl['date_height_mm'],
                'payeeLeftMm' => (float)$tpl['payee_left_mm'],
                'payeeTopMm' => (float)$tpl['payee_top_mm'],
                'payeeWidthMm' => (float)$tpl['payee_width_mm'],
                'payeeHeightMm' => (float)$tpl['payee_height_mm'],
                'wordsLeftMm' => (float)$tpl['words_left_mm'],
                'wordsTopMm' => (float)$tpl['words_top_mm'],
                'wordsWidthMm' => (float)$tpl['words_width_mm'],
                'wordsHeightMm' => (float)$tpl['words_height_mm'],
                'amountLeftMm' => (float)$tpl['amount_left_mm'],
                'amountTopMm' => (float)$tpl['amount_top_mm'],
                'amountWidthMm' => (float)$tpl['amount_width_mm'],
                'amountHeightMm' => (float)$tpl['amount_height_mm'],
                'dateFontSize' => (int)$tpl['date_font_size'],
                'payeeFontSize' => (int)$tpl['payee_font_size'],
                'wordsFontSize' => (int)$tpl['words_font_size'],
                'amountFontSize' => (int)$tpl['amount_font_size'],
            ];
        }

        $formattedBankAccounts = [];
        foreach ($bankAccounts as $acc) {
            $formattedBankAccounts[] = [
                'id' => $acc['id'],
                'accountName' => $acc['account_name'],
                'bankName' => $acc['bank_name'],
                'bankCode' => $acc['bank_code'],
                'accountNumber' => $acc['account_number'],
                'iban' => $acc['iban'],
                'branchName' => $acc['branch_name'] ?? '',
                'currency' => $acc['currency'],
                'currentBalance' => (float)$acc['current_balance'],
                'isDefault' => (bool)$acc['is_default'],
                'status' => $acc['status'],
                'chequeTemplate' => $acc['cheque_template'],
                'chequeWidthCm' => (float)$acc['cheque_width_cm'],
                'chequeHeightCm' => (float)$acc['cheque_height_cm'],
                'chequeImageUrl' => $acc['cheque_image_url'],
                'chequeImageName' => $acc['cheque_image_name'],
                'activeTemplateId' => $acc['active_template_id'],
                'chequeTemplates' => $templatesByBank[$acc['id']] ?? [],
            ];
        }

        // دفاتر الشيكات
        $chequeBooksStmt = $pdo->query("SELECT * FROM cheque_books ORDER BY id ASC");
        $chequeBooks = [];
        while ($b = $chequeBooksStmt->fetch(PDO::FETCH_ASSOC)) {
            $chequeBooks[] = [
                'id' => $b['id'],
                'bankAccountId' => $b['bank_account_id'],
                'bookCode' => $b['book_code'],
                'bookName' => $b['book_name'],
                'serialFrom' => (int)$b['serial_from'],
                'serialTo' => (int)$b['serial_to'],
                'totalLeaves' => (int)$b['total_leaves'],
                'currentSerial' => (int)$b['current_serial'],
                'receivedDate' => $b['received_date'],
                'status' => $b['status'],
                'notes' => $b['notes'],
            ];
        }

        // المستفيدين
        $benStmt = $pdo->query("SELECT * FROM beneficiaries ORDER BY name_ar ASC");
        $beneficiaries = [];
        while ($ben = $benStmt->fetch(PDO::FETCH_ASSOC)) {
            $beneficiaries[] = [
                'id' => $ben['id'],
                'nameAr' => $ben['name_ar'],
                'nameEn' => $ben['name_en'],
                'bankAccountId' => $ben['bank_account_id'],
                'category' => $ben['category'],
                'civilIdOrCR' => $ben['civil_id_or_cr'],
                'bankName' => $ben['bank_name'],
                'iban' => $ben['iban'],
                'phoneNumber' => $ben['phone_number'],
                'notes' => $ben['notes'],
                'status' => $ben['status'],
                'createdAt' => $ben['created_at'],
            ];
        }

        // الشيكات المصدرة
        $chequesStmt = $pdo->query("SELECT * FROM issued_cheques ORDER BY due_date DESC, cheque_number DESC");
        $issuedCheques = [];
        while ($chk = $chequesStmt->fetch(PDO::FETCH_ASSOC)) {
            $issuedCheques[] = [
                'id' => $chk['id'],
                'bankAccountId' => $chk['bank_account_id'],
                'chequeBookId' => $chk['cheque_book_id'],
                'chequeNumber' => (int)$chk['cheque_number'],
                'chequeNumberStr' => $chk['cheque_number_str'],
                'beneficiaryId' => $chk['beneficiary_id'],
                'beneficiaryName' => $chk['beneficiary_name'],
                'amount' => (float)$chk['amount'],
                'amountInWordsAr' => $chk['amount_in_words_ar'],
                'amountInWordsEn' => $chk['amount_in_words_en'],
                'tafqeetLang' => $chk['tafqeet_lang'],
                'issueDate' => $chk['issue_date'],
                'dueDate' => $chk['due_date'],
                'status' => $chk['status'],
                'cashedDate' => $chk['cashed_date'],
                'cancelledDate' => $chk['cancelled_date'],
                'cancelReason' => $chk['cancel_reason'],
                'isCrossed' => (bool)$chk['is_crossed'],
                'bearerCrossed' => (bool)$chk['bearer_crossed'],
                'purpose' => $chk['purpose'],
                'notes' => $chk['notes'],
                'templateId' => $chk['template_id'],
                'templateName' => $chk['template_name'],
                'chequeWidthCm' => (float)$chk['cheque_width_cm'],
                'chequeHeightCm' => (float)$chk['cheque_height_cm'],
                'createdBy' => $chk['created_by'],
                'createdAt' => $chk['created_at'],
            ];
        }

        // إعدادات المعايرة
        $printSettingsRow = $pdo->query("SELECT * FROM cheque_print_settings WHERE id = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        $printSettings = $printSettingsRow ? [
            'offsetX' => (float)$printSettingsRow['offset_x'],
            'offsetY' => (float)$printSettingsRow['offset_y'],
            'showBackgroundOnPrint' => (bool)$printSettingsRow['show_background_on_print'],
            'defaultCrossing' => (bool)$printSettingsRow['default_crossing'],
            'defaultBearerCrossing' => (bool)$printSettingsRow['default_bearer_crossing'],
            'defaultPrinterName' => $printSettingsRow['default_printer_name'],
            'chequeDueDateAlertDays' => (int)$printSettingsRow['cheque_due_date_alert_days'],
            'templateMode' => $printSettingsRow['template_mode'],
            'customChequeImageUrl' => $printSettingsRow['custom_cheque_image_url'],
            'customChequeImageName' => $printSettingsRow['custom_cheque_image_name'],
            'dateOffsetX' => (float)$printSettingsRow['date_offset_x'],
            'dateOffsetY' => (float)$printSettingsRow['date_offset_y'],
            'payeeOffsetX' => (float)$printSettingsRow['payee_offset_x'],
            'payeeOffsetY' => (float)$printSettingsRow['payee_offset_y'],
            'wordsOffsetX' => (float)$printSettingsRow['words_offset_x'],
            'wordsOffsetY' => (float)$printSettingsRow['words_offset_y'],
            'amountOffsetX' => (float)$printSettingsRow['amount_offset_x'],
            'amountOffsetY' => (float)$printSettingsRow['amount_offset_y'],
            'dateWidth' => (float)$printSettingsRow['date_width'],
            'dateHeight' => (float)$printSettingsRow['date_height'],
            'payeeWidth' => (float)$printSettingsRow['payee_width'],
            'payeeHeight' => (float)$printSettingsRow['payee_height'],
            'wordsWidth' => (float)$printSettingsRow['words_width'],
            'wordsHeight' => (float)$printSettingsRow['words_height'],
            'amountWidth' => (float)$printSettingsRow['amount_width'],
            'amountHeight' => (float)$printSettingsRow['amount_height'],
            'dateFontSize' => (int)$printSettingsRow['date_font_size'],
            'payeeFontSize' => (int)$printSettingsRow['payee_font_size'],
            'wordsFontSize' => (int)$printSettingsRow['words_font_size'],
            'amountFontSize' => (int)$printSettingsRow['amount_font_size'],
        ] : null;

        // إعدادات مطابقة البنك
        $recSettingsRow = $pdo->query("SELECT * FROM reconciliation_settings WHERE id = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        $reconciliationSettings = $recSettingsRow ? [
            'autoExtractDifferences' => (bool)$recSettingsRow['auto_extract_differences'],
            'smallDifferenceLimit' => (float)$recSettingsRow['small_difference_limit'],
            'bankFeeExpenseAccountId' => $recSettingsRow['bank_fee_expense_account_id'],
            'bankFeeExpenseAccountName' => $recSettingsRow['bank_fee_expense_account_name'],
            'allowedDateToleranceDays' => (int)$recSettingsRow['allowed_date_tolerance_days'],
            'allowBatchMatching' => (bool)$recSettingsRow['allow_batch_matching'],
            'autoDetectDebitCredit' => (bool)$recSettingsRow['auto_detect_debit_credit'],
            'enableFuzzyMatching' => (bool)$recSettingsRow['enable_fuzzy_matching'],
            'maskBankAccountsInReports' => (bool)$recSettingsRow['mask_bank_accounts_in_reports'],
            'customBankName' => $recSettingsRow['custom_bank_name'],
            'customAccountNumber' => $recSettingsRow['custom_account_number'],
        ] : null;

        // جلسات مطابقة البنك
        $recSessionsStmt = $pdo->query("SELECT * FROM reconciliation_sessions ORDER BY period_end DESC");
        $recSessions = [];
        while ($s = $recSessionsStmt->fetch(PDO::FETCH_ASSOC)) {
            $recSessions[] = [
                'id' => $s['id'],
                'bankAccountId' => $s['bank_account_id'],
                'bankAccountName' => $s['bank_account_name'],
                'bankAccountNumber' => $s['bank_account_number'],
                'periodStart' => $s['period_start'],
                'periodEnd' => $s['period_end'],
                'currency' => $s['currency'],
                'openingBalanceBank' => (float)$s['opening_balance_bank'],
                'closingBalanceBank' => (float)$s['closing_balance_bank'],
                'openingBalanceAccounting' => (float)$s['opening_balance_accounting'],
                'closingBalanceAccounting' => (float)$s['closing_balance_accounting'],
                'adjustedBankBalance' => (float)$s['adjusted_bank_balance'],
                'adjustedAccountingBalance' => (float)$s['adjusted_accounting_balance'],
                'unreconciledDifference' => (float)$s['unreconciled_difference'],
                'status' => $s['status'],
                'totalBankTransactions' => (int)$s['total_bank_transactions'],
                'matchedBankTransactions' => (int)$s['matched_bank_transactions'],
                'unmatchedBankTransactions' => (int)$s['unmatched_bank_transactions'],
                'totalAccountingTransactions' => (int)$s['total_accounting_transactions'],
                'matchedAccountingTransactions' => (int)$s['matched_accounting_transactions'],
                'unmatchedAccountingTransactions' => (int)$s['unmatched_accounting_transactions'],
                'totalDifferencesCount' => (int)$s['total_differences_count'],
                'resolvedDifferencesCount' => (int)$s['resolved_differences_count'],
                'pendingDifferencesCount' => (int)$s['pending_differences_count'],
                'totalFeesAmount' => (float)$s['total_fees_amount'],
                'createdBy' => $s['created_by'],
                'createdAt' => $s['created_at'],
                'updatedAt' => $s['updated_at'],
            ];
        }

        // الفروع والأقسام والموظفين
        $branches = $pdo->query("SELECT * FROM branches ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
        $departments = $pdo->query("SELECT * FROM departments ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
        $employees = $pdo->query("SELECT * FROM employees ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
        $companySettings = $pdo->query("SELECT * FROM settings WHERE id = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => [
                'bankAccounts' => $formattedBankAccounts,
                'chequeBooks' => $chequeBooks,
                'beneficiaries' => $beneficiaries,
                'issuedCheques' => $issuedCheques,
                'printSettings' => $printSettings,
                'reconciliationSettings' => $reconciliationSettings,
                'reconciliationSessions' => $recSessions,
                'branches' => $branches,
                'departments' => $departments,
                'employees' => $employees,
                'companySettings' => $companySettings,
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// =========================================================================
// 3. إصدار أو تحديث شيك (Issue / Update Cheque)
// =========================================================================
if ($action === 'save_cheque') {
    try {
        $c = $inputData;
        if (empty($c['id']) || empty($c['bankAccountId']) || empty($c['beneficiaryName']) || !isset($c['amount'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'البيانات غير مكتملة لإصدار الشيك'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO issued_cheques (
                id, bank_account_id, cheque_book_id, cheque_number, cheque_number_str,
                beneficiary_id, beneficiary_name, amount, amount_in_words_ar, amount_in_words_en,
                tafqeet_lang, issue_date, due_date, status, is_crossed, bearer_crossed,
                purpose, notes, template_id, template_name, cheque_width_cm, cheque_height_cm,
                created_by, created_at
            ) VALUES (
                :id, :bank_account_id, :cheque_book_id, :cheque_number, :cheque_number_str,
                :beneficiary_id, :beneficiary_name, :amount, :amount_in_words_ar, :amount_in_words_en,
                :tafqeet_lang, :issue_date, :due_date, :status, :is_crossed, :bearer_crossed,
                :purpose, :notes, :template_id, :template_name, :cheque_width_cm, :cheque_height_cm,
                :created_by, NOW()
            )
            ON DUPLICATE KEY UPDATE
                bank_account_id = VALUES(bank_account_id),
                cheque_book_id = VALUES(cheque_book_id),
                cheque_number = VALUES(cheque_number),
                cheque_number_str = VALUES(cheque_number_str),
                beneficiary_id = VALUES(beneficiary_id),
                beneficiary_name = VALUES(beneficiary_name),
                amount = VALUES(amount),
                amount_in_words_ar = VALUES(amount_in_words_ar),
                amount_in_words_en = VALUES(amount_in_words_en),
                tafqeet_lang = VALUES(tafqeet_lang),
                issue_date = VALUES(issue_date),
                due_date = VALUES(due_date),
                status = VALUES(status),
                is_crossed = VALUES(is_crossed),
                bearer_crossed = VALUES(bearer_crossed),
                purpose = VALUES(purpose),
                notes = VALUES(notes),
                template_id = VALUES(template_id),
                template_name = VALUES(template_name),
                cheque_width_cm = VALUES(cheque_width_cm),
                cheque_height_cm = VALUES(cheque_height_cm)
        ");

        $stmt->execute([
            ':id' => $c['id'],
            ':bank_account_id' => $c['bankAccountId'],
            ':cheque_book_id' => $c['chequeBookId'] ?? '',
            ':cheque_number' => (int)($c['chequeNumber'] ?? 0),
            ':cheque_number_str' => $c['chequeNumberStr'] ?? strval($c['chequeNumber'] ?? ''),
            ':beneficiary_id' => $c['beneficiaryId'] ?? null,
            ':beneficiary_name' => $c['beneficiaryName'],
            ':amount' => (float)$c['amount'],
            ':amount_in_words_ar' => $c['amountInWordsAr'] ?? '',
            ':amount_in_words_en' => $c['amountInWordsEn'] ?? '',
            ':tafqeet_lang' => $c['tafqeetLang'] ?? 'ar',
            ':issue_date' => $c['issueDate'] ?? date('Y-m-d'),
            ':due_date' => $c['dueDate'] ?? date('Y-m-d'),
            ':status' => $c['status'] ?? 'issued',
            ':is_crossed' => !empty($c['isCrossed']) ? 1 : 0,
            ':bearer_crossed' => !empty($c['bearerCrossed']) ? 1 : 0,
            ':purpose' => $c['purpose'] ?? 'إصدار شيك',
            ':notes' => $c['notes'] ?? '',
            ':template_id' => $c['templateId'] ?? null,
            ':template_name' => $c['templateName'] ?? null,
            ':cheque_width_cm' => isset($c['chequeWidthCm']) ? (float)$c['chequeWidthCm'] : 18.00,
            ':cheque_height_cm' => isset($c['chequeHeightCm']) ? (float)$c['chequeHeightCm'] : 9.00,
            ':created_by' => $c['createdBy'] ?? 'admin',
        ]);

        // تحديث الرقم التسلسلي في دفتر الشيكات إذا كان إصداراً جديداً
        if (!empty($c['chequeBookId']) && !empty($c['chequeNumber'])) {
            $updBook = $pdo->prepare("
                UPDATE cheque_books 
                SET current_serial = GREATEST(current_serial, :next_serial)
                WHERE id = :book_id
            ");
            $updBook->execute([
                ':next_serial' => (int)$c['chequeNumber'] + 1,
                ':book_id' => $c['chequeBookId'],
            ]);
        }

        echo json_encode(['success' => true, 'message' => 'تم حفظ الشيك بقاعدة البيانات بنجاح', 'id' => $c['id']], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// =========================================================================
// 4. تحديث حالة الشيك (صرف / إلغاء)
// =========================================================================
if ($action === 'update_cheque_status') {
    try {
        $id = $inputData['id'] ?? '';
        $status = $inputData['status'] ?? '';
        $date = $inputData['date'] ?? date('Y-m-d');
        $reason = $inputData['reason'] ?? '';

        if (!$id || !$status) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'معرف الشيك والحالة مطلوبان'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($status === 'cashed') {
            $stmt = $pdo->prepare("UPDATE issued_cheques SET status = 'cashed', cashed_date = :dt, cancelled_date = NULL, cancel_reason = NULL WHERE id = :id");
            $stmt->execute([':dt' => $date, ':id' => $id]);
        } elseif ($status === 'cancelled') {
            $stmt = $pdo->prepare("UPDATE issued_cheques SET status = 'cancelled', cancelled_date = :dt, cancel_reason = :rs WHERE id = :id");
            $stmt->execute([':dt' => $date, ':rs' => $reason, ':id' => $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE issued_cheques SET status = 'issued', cashed_date = NULL, cancelled_date = NULL, cancel_reason = NULL WHERE id = :id");
            $stmt->execute([':id' => $id]);
        }

        echo json_encode(['success' => true, 'message' => 'تم تحديث حالة الشيك في قاعدة البيانات'], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// =========================================================================
// 5. حفظ إعدادات المعايرة وأبعاد الحقول
// =========================================================================
if ($action === 'save_print_settings') {
    try {
        $s = $inputData;
        $stmt = $pdo->prepare("
            INSERT INTO cheque_print_settings (
                id, offset_x, offset_y, show_background_on_print, default_crossing,
                default_bearer_crossing, default_printer_name, cheque_due_date_alert_days,
                template_mode, custom_cheque_image_url, custom_cheque_image_name,
                date_offset_x, date_offset_y, payee_offset_x, payee_offset_y,
                words_offset_x, words_offset_y, amount_offset_x, amount_offset_y,
                date_width, date_height, payee_width, payee_height,
                words_width, words_height, amount_width, amount_height,
                date_font_size, payee_font_size, words_font_size, amount_font_size,
                updated_at
            ) VALUES (
                1, :offset_x, :offset_y, :show_bg, :default_cross,
                :default_bearer, :printer_name, :alert_days,
                :tpl_mode, :img_url, :img_name,
                :d_ox, :d_oy, :p_ox, :p_oy,
                :w_ox, :w_oy, :a_ox, :a_oy,
                :d_w, :d_h, :p_w, :p_h,
                :w_w, :w_h, :a_w, :a_h,
                :d_fs, :p_fs, :w_fs, :a_fs,
                NOW()
            )
            ON DUPLICATE KEY UPDATE
                offset_x = VALUES(offset_x),
                offset_y = VALUES(offset_y),
                show_background_on_print = VALUES(show_background_on_print),
                default_crossing = VALUES(default_crossing),
                default_bearer_crossing = VALUES(default_bearer_crossing),
                default_printer_name = VALUES(default_printer_name),
                cheque_due_date_alert_days = VALUES(cheque_due_date_alert_days),
                template_mode = VALUES(template_mode),
                custom_cheque_image_url = VALUES(custom_cheque_image_url),
                custom_cheque_image_name = VALUES(custom_cheque_image_name),
                date_offset_x = VALUES(date_offset_x),
                date_offset_y = VALUES(date_offset_y),
                payee_offset_x = VALUES(payee_offset_x),
                payee_offset_y = VALUES(payee_offset_y),
                words_offset_x = VALUES(words_offset_x),
                words_offset_y = VALUES(words_offset_y),
                amount_offset_x = VALUES(amount_offset_x),
                amount_offset_y = VALUES(amount_offset_y),
                date_width = VALUES(date_width),
                date_height = VALUES(date_height),
                payee_width = VALUES(payee_width),
                payee_height = VALUES(payee_height),
                words_width = VALUES(words_width),
                words_height = VALUES(words_height),
                amount_width = VALUES(amount_width),
                amount_height = VALUES(amount_height),
                date_font_size = VALUES(date_font_size),
                payee_font_size = VALUES(payee_font_size),
                words_font_size = VALUES(words_font_size),
                amount_font_size = VALUES(amount_font_size),
                updated_at = NOW()
        ");

        $stmt->execute([
            ':offset_x' => (float)($s['offsetX'] ?? 0),
            ':offset_y' => (float)($s['offsetY'] ?? 0),
            ':show_bg' => !empty($s['showBackgroundOnPrint']) ? 1 : 0,
            ':default_cross' => !empty($s['defaultCrossing']) ? 1 : 0,
            ':default_bearer' => !empty($s['defaultBearerCrossing']) ? 1 : 0,
            ':printer_name' => $s['defaultPrinterName'] ?? null,
            ':alert_days' => (int)($s['chequeDueDateAlertDays'] ?? 7),
            ':tpl_mode' => $s['templateMode'] ?? 'scanned_image',
            ':img_url' => $s['customChequeImageUrl'] ?? null,
            ':img_name' => $s['customChequeImageName'] ?? null,
            ':d_ox' => (float)($s['dateOffsetX'] ?? 0),
            ':d_oy' => (float)($s['dateOffsetY'] ?? 0),
            ':p_ox' => (float)($s['payeeOffsetX'] ?? 0),
            ':p_oy' => (float)($s['payeeOffsetY'] ?? 0),
            ':w_ox' => (float)($s['wordsOffsetX'] ?? 0),
            ':w_oy' => (float)($s['wordsOffsetY'] ?? 0),
            ':a_ox' => (float)($s['amountOffsetX'] ?? 0),
            ':a_oy' => (float)($s['amountOffsetY'] ?? 0),
            ':d_w' => (float)($s['dateWidth'] ?? 32),
            ':d_h' => (float)($s['dateHeight'] ?? 7.5),
            ':p_w' => (float)($s['payeeWidth'] ?? 115),
            ':p_h' => (float)($s['payeeHeight'] ?? 8),
            ':w_w' => (float)($s['wordsWidth'] ?? 122),
            ':w_h' => (float)($s['wordsHeight'] ?? 15),
            ':a_w' => (float)($s['amountWidth'] ?? 44),
            ':a_h' => (float)($s['amountHeight'] ?? 10),
            ':d_fs' => (int)($s['dateFontSize'] ?? 13),
            ':p_fs' => (int)($s['payeeFontSize'] ?? 14),
            ':w_fs' => (int)($s['wordsFontSize'] ?? 12),
            ':a_fs' => (int)($s['amountFontSize'] ?? 15),
        ]);

        echo json_encode(['success' => true, 'message' => 'تم حفظ إعدادات المعايرة بقاعدة البيانات'], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// =========================================================================
// 6. حفظ الحسابات البنكية والقوالب (Save Bank Accounts & Size Templates)
// =========================================================================
if ($action === 'save_bank_accounts') {
    try {
        $accounts = $inputData['accounts'] ?? [];
        if (!is_array($accounts)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'مصفوفة الحسابات البنكية غير صالحة'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $pdo->beginTransaction();

        $bankStmt = $pdo->prepare("
            INSERT INTO bank_accounts (
                id, account_name, bank_name, bank_code, account_number, iban,
                branch_name, currency, current_balance, is_default, status,
                cheque_template, cheque_width_cm, cheque_height_cm, cheque_image_url,
                cheque_image_name, active_template_id
            ) VALUES (
                :id, :name, :bname, :bcode, :accnum, :iban,
                :branch, :curr, :bal, :def, :stat,
                :tpl, :w_cm, :h_cm, :img, :img_name, :active_tpl
            )
            ON DUPLICATE KEY UPDATE
                account_name = VALUES(account_name),
                bank_name = VALUES(bank_name),
                bank_code = VALUES(bank_code),
                account_number = VALUES(account_number),
                iban = VALUES(iban),
                branch_name = VALUES(branch_name),
                currency = VALUES(currency),
                current_balance = VALUES(current_balance),
                is_default = VALUES(is_default),
                status = VALUES(status),
                cheque_template = VALUES(cheque_template),
                cheque_width_cm = VALUES(cheque_width_cm),
                cheque_height_cm = VALUES(cheque_height_cm),
                cheque_image_url = VALUES(cheque_image_url),
                cheque_image_name = VALUES(cheque_image_name),
                active_template_id = VALUES(active_template_id)
        ");

        $tplStmt = $pdo->prepare("
            INSERT INTO cheque_templates (
                id, bank_account_id, name, width_cm, height_cm,
                cheque_image_url, cheque_image_name, is_default, notes,
                date_left_mm, date_top_mm, date_width_mm, date_height_mm,
                payee_left_mm, payee_top_mm, payee_width_mm, payee_height_mm,
                words_left_mm, words_top_mm, words_width_mm, words_height_mm,
                amount_left_mm, amount_top_mm, amount_width_mm, amount_height_mm,
                date_font_size, payee_font_size, words_font_size, amount_font_size
            ) VALUES (
                :id, :bank_id, :name, :w_cm, :h_cm,
                :img, :img_name, :is_def, :notes,
                :d_x, :d_y, :d_w, :d_h,
                :p_x, :p_y, :p_w, :p_h,
                :w_x, :w_y, :w_w, :w_h,
                :a_x, :a_y, :a_w, :a_h,
                :d_fs, :p_fs, :w_fs, :a_fs
            )
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                width_cm = VALUES(width_cm),
                height_cm = VALUES(height_cm),
                cheque_image_url = VALUES(cheque_image_url),
                cheque_image_name = VALUES(cheque_image_name),
                is_default = VALUES(is_default),
                notes = VALUES(notes),
                date_left_mm = VALUES(date_left_mm),
                date_top_mm = VALUES(date_top_mm),
                date_width_mm = VALUES(date_width_mm),
                date_height_mm = VALUES(date_height_mm),
                payee_left_mm = VALUES(payee_left_mm),
                payee_top_mm = VALUES(payee_top_mm),
                payee_width_mm = VALUES(payee_width_mm),
                payee_height_mm = VALUES(payee_height_mm),
                words_left_mm = VALUES(words_left_mm),
                words_top_mm = VALUES(words_top_mm),
                words_width_mm = VALUES(words_width_mm),
                words_height_mm = VALUES(words_height_mm),
                amount_left_mm = VALUES(amount_left_mm),
                amount_top_mm = VALUES(amount_top_mm),
                amount_width_mm = VALUES(amount_width_mm),
                amount_height_mm = VALUES(amount_height_mm),
                date_font_size = VALUES(date_font_size),
                payee_font_size = VALUES(payee_font_size),
                words_font_size = VALUES(words_font_size),
                amount_font_size = VALUES(amount_font_size)
        ");

        foreach ($accounts as $acc) {
            $bankStmt->execute([
                ':id' => $acc['id'],
                ':name' => $acc['accountName'],
                ':bname' => $acc['bankName'],
                ':bcode' => $acc['bankCode'] ?? 'CBK',
                ':accnum' => $acc['accountNumber'],
                ':iban' => $acc['iban'],
                ':branch' => $acc['branchName'] ?? '',
                ':curr' => $acc['currency'] ?? 'د.ك',
                ':bal' => (float)($acc['currentBalance'] ?? 0),
                ':def' => !empty($acc['isDefault']) ? 1 : 0,
                ':stat' => $acc['status'] ?? 'active',
                ':tpl' => $acc['chequeTemplate'] ?? 'CBK',
                ':w_cm' => isset($acc['chequeWidthCm']) ? (float)$acc['chequeWidthCm'] : 18.00,
                ':h_cm' => isset($acc['chequeHeightCm']) ? (float)$acc['chequeHeightCm'] : 9.00,
                ':img' => $acc['chequeImageUrl'] ?? null,
                ':img_name' => $acc['chequeImageName'] ?? null,
                ':active_tpl' => $acc['activeTemplateId'] ?? null,
            ]);

            if (!empty($acc['chequeTemplates']) && is_array($acc['chequeTemplates'])) {
                foreach ($acc['chequeTemplates'] as $tpl) {
                    $tplStmt->execute([
                        ':id' => $tpl['id'],
                        ':bank_id' => $acc['id'],
                        ':name' => $tpl['name'],
                        ':w_cm' => (float)$tpl['widthCm'],
                        ':h_cm' => (float)$tpl['heightCm'],
                        ':img' => $tpl['chequeImageUrl'] ?? null,
                        ':img_name' => $tpl['chequeImageName'] ?? null,
                        ':is_def' => !empty($tpl['isDefault']) ? 1 : 0,
                        ':notes' => $tpl['notes'] ?? '',
                        ':d_x' => (float)($tpl['dateLeftMm'] ?? 142),
                        ':d_y' => (float)($tpl['dateTopMm'] ?? 12),
                        ':d_w' => (float)($tpl['dateWidthMm'] ?? 32),
                        ':d_h' => (float)($tpl['dateHeightMm'] ?? 7.5),
                        ':p_x' => (float)($tpl['payeeLeftMm'] ?? 30),
                        ':p_y' => (float)($tpl['payeeTopMm'] ?? 24),
                        ':p_w' => (float)($tpl['payeeWidthMm'] ?? 115),
                        ':p_h' => (float)($tpl['payeeHeightMm'] ?? 8),
                        ':w_x' => (float)($tpl['wordsLeftMm'] ?? 28),
                        ':w_y' => (float)($tpl['wordsTopMm'] ?? 35),
                        ':w_w' => (float)($tpl['wordsWidthMm'] ?? 122),
                        ':w_h' => (float)($tpl['wordsHeightMm'] ?? 15),
                        ':a_x' => (float)($tpl['amountLeftMm'] ?? 128),
                        ':a_y' => (float)($tpl['amountTopMm'] ?? 48),
                        ':a_w' => (float)($tpl['amountWidthMm'] ?? 44),
                        ':a_h' => (float)($tpl['amountHeightMm'] ?? 10),
                        ':d_fs' => (int)($tpl['dateFontSize'] ?? 13),
                        ':p_fs' => (int)($tpl['payeeFontSize'] ?? 14),
                        ':w_fs' => (int)($tpl['wordsFontSize'] ?? 12),
                        ':a_fs' => (int)($tpl['amountFontSize'] ?? 15),
                    ]);
                }
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'تم حفظ الحسابات البنكية والقوالب بقاعدة البيانات'], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// =========================================================================
// 7. حفظ دفاتر الشيكات (Save Cheque Books)
// =========================================================================
if ($action === 'save_cheque_books') {
    try {
        $books = $inputData['books'] ?? [];
        if (!is_array($books)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'مصفوفة الدفاتر غير صالحة'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO cheque_books (
                id, bank_account_id, book_code, book_name, serial_from, serial_to,
                total_leaves, current_serial, received_date, status, notes
            ) VALUES (
                :id, :bank_id, :code, :name, :s_from, :s_to,
                :leaves, :curr_s, :rec_dt, :status, :notes
            )
            ON DUPLICATE KEY UPDATE
                book_name = VALUES(book_name),
                serial_from = VALUES(serial_from),
                serial_to = VALUES(serial_to),
                total_leaves = VALUES(total_leaves),
                current_serial = VALUES(current_serial),
                received_date = VALUES(received_date),
                status = VALUES(status),
                notes = VALUES(notes)
        ");

        foreach ($books as $b) {
            $stmt->execute([
                ':id' => $b['id'],
                ':bank_id' => $b['bankAccountId'],
                ':code' => $b['bookCode'],
                ':name' => $b['bookName'],
                ':s_from' => (int)$b['serialFrom'],
                ':s_to' => (int)$b['serialTo'],
                ':leaves' => (int)$b['totalLeaves'],
                ':curr_s' => (int)$b['currentSerial'],
                ':rec_dt' => $b['receivedDate'],
                ':status' => $b['status'] ?? 'active',
                ':notes' => $b['notes'] ?? '',
            ]);
        }

        echo json_encode(['success' => true, 'message' => 'تم حفظ دفاتر الشيكات بقاعدة البيانات'], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// =========================================================================
// 8. حفظ المستفيدين (Save Beneficiaries)
// =========================================================================
if ($action === 'save_beneficiaries') {
    try {
        $bens = $inputData['beneficiaries'] ?? [];
        if (!is_array($bens)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'مصفوفة المستفيدين غير صالحة'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO beneficiaries (
                id, name_ar, name_en, bank_account_id, category,
                civil_id_or_cr, bank_name, iban, phone_number, notes, status
            ) VALUES (
                :id, :name_ar, :name_en, :bank_id, :cat,
                :cr, :bank_name, :iban, :phone, :notes, :status
            )
            ON DUPLICATE KEY UPDATE
                name_ar = VALUES(name_ar),
                name_en = VALUES(name_en),
                bank_account_id = VALUES(bank_account_id),
                category = VALUES(category),
                civil_id_or_cr = VALUES(civil_id_or_cr),
                bank_name = VALUES(bank_name),
                iban = VALUES(iban),
                phone_number = VALUES(phone_number),
                notes = VALUES(notes),
                status = VALUES(status)
        ");

        foreach ($bens as $b) {
            $stmt->execute([
                ':id' => $b['id'],
                ':name_ar' => $b['nameAr'],
                ':name_en' => $b['nameEn'] ?? null,
                ':bank_id' => $b['bankAccountId'] ?? 'all',
                ':cat' => $b['category'] ?? 'company',
                ':cr' => $b['civilIdOrCR'] ?? null,
                ':bank_name' => $b['bankName'] ?? null,
                ':iban' => $b['iban'] ?? null,
                ':phone' => $b['phoneNumber'] ?? null,
                ':notes' => $b['notes'] ?? null,
                ':status' => $b['status'] ?? 'active',
            ]);
        }

        echo json_encode(['success' => true, 'message' => 'تم حفظ المستفيدين بقاعدة البيانات'], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// =========================================================================
// 9. حفظ جلسة مطابقة البنك والحركات والفروقات
// =========================================================================
if ($action === 'save_reconciliation_session') {
    try {
        $sess = $inputData['session'] ?? null;
        $bankTxList = $inputData['bankTransactions'] ?? [];
        $ledgerTxList = $inputData['ledgerTransactions'] ?? [];
        $diffList = $inputData['differences'] ?? [];
        $jvList = $inputData['journalEntries'] ?? [];

        if (!$sess || empty($sess['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'بيانات جلسة المطابقة مطلوبة'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $pdo->beginTransaction();

        // 1. حفظ رأس الجلسة
        $sessStmt = $pdo->prepare("
            INSERT INTO reconciliation_sessions (
                id, bank_account_id, bank_account_name, bank_account_number,
                period_start, period_end, currency,
                opening_balance_bank, closing_balance_bank,
                opening_balance_accounting, closing_balance_accounting,
                adjusted_bank_balance, adjusted_accounting_balance, unreconciled_difference,
                status, total_bank_transactions, matched_bank_transactions, unmatched_bank_transactions,
                total_accounting_transactions, matched_accounting_transactions, unmatched_accounting_transactions,
                total_differences_count, resolved_differences_count, pending_differences_count,
                total_fees_amount, created_by, updated_at
            ) VALUES (
                :id, :bank_id, :bank_name, :bank_acc,
                :p_start, :p_end, :curr,
                :op_b, :cl_b, :op_a, :cl_a,
                :adj_b, :adj_a, :unrec,
                :status, :tot_b, :mat_b, :unm_b,
                :tot_a, :mat_a, :unm_a,
                :tot_diff, :res_diff, :pen_diff,
                :tot_fees, :creator, NOW()
            )
            ON DUPLICATE KEY UPDATE
                bank_account_name = VALUES(bank_account_name),
                bank_account_number = VALUES(bank_account_number),
                period_start = VALUES(period_start),
                period_end = VALUES(period_end),
                opening_balance_bank = VALUES(opening_balance_bank),
                closing_balance_bank = VALUES(closing_balance_bank),
                opening_balance_accounting = VALUES(opening_balance_accounting),
                closing_balance_accounting = VALUES(closing_balance_accounting),
                adjusted_bank_balance = VALUES(adjusted_bank_balance),
                adjusted_accounting_balance = VALUES(adjusted_accounting_balance),
                unreconciled_difference = VALUES(unreconciled_difference),
                status = VALUES(status),
                total_bank_transactions = VALUES(total_bank_transactions),
                matched_bank_transactions = VALUES(matched_bank_transactions),
                unmatched_bank_transactions = VALUES(unmatched_bank_transactions),
                total_accounting_transactions = VALUES(total_accounting_transactions),
                matched_accounting_transactions = VALUES(matched_accounting_transactions),
                unmatched_accounting_transactions = VALUES(unmatched_accounting_transactions),
                total_differences_count = VALUES(total_differences_count),
                resolved_differences_count = VALUES(resolved_differences_count),
                pending_differences_count = VALUES(pending_differences_count),
                total_fees_amount = VALUES(total_fees_amount),
                updated_at = NOW()
        ");

        $sessStmt->execute([
            ':id' => $sess['id'],
            ':bank_id' => $sess['bankAccountId'],
            ':bank_name' => $sess['bankAccountName'] ?? 'البنك',
            ':bank_acc' => $sess['bankAccountNumber'] ?? '',
            ':p_start' => $sess['periodStart'],
            ':p_end' => $sess['periodEnd'],
            ':curr' => $sess['currency'] ?? 'KWD',
            ':op_b' => (float)($sess['openingBalanceBank'] ?? 0),
            ':cl_b' => (float)($sess['closingBalanceBank'] ?? 0),
            ':op_a' => (float)($sess['openingBalanceAccounting'] ?? 0),
            ':cl_a' => (float)($sess['closingBalanceAccounting'] ?? 0),
            ':adj_b' => (float)($sess['adjustedBankBalance'] ?? 0),
            ':adj_a' => (float)($sess['adjustedAccountingBalance'] ?? 0),
            ':unrec' => (float)($sess['unreconciledDifference'] ?? 0),
            ':status' => $sess['status'] ?? 'draft',
            ':tot_b' => (int)($sess['totalBankTransactions'] ?? count($bankTxList)),
            ':mat_b' => (int)($sess['matchedBankTransactions'] ?? 0),
            ':unm_b' => (int)($sess['unmatchedBankTransactions'] ?? 0),
            ':tot_a' => (int)($sess['totalAccountingTransactions'] ?? count($ledgerTxList)),
            ':mat_a' => (int)($sess['matchedAccountingTransactions'] ?? 0),
            ':unm_a' => (int)($sess['unmatchedAccountingTransactions'] ?? 0),
            ':tot_diff' => (int)($sess['totalDifferencesCount'] ?? count($diffList)),
            ':res_diff' => (int)($sess['resolvedDifferencesCount'] ?? 0),
            ':pen_diff' => (int)($sess['pendingDifferencesCount'] ?? 0),
            ':tot_fees' => (float)($sess['totalFeesAmount'] ?? 0),
            ':creator' => $sess['createdBy'] ?? 'admin',
        ]);

        // 2. إدخال حركات البنك
        if (!empty($bankTxList)) {
            $btxStmt = $pdo->prepare("
                INSERT INTO reconciliation_bank_tx (
                    id, session_id, row_number, transaction_date, reference_number,
                    description, debit, credit, net_amount, balance_after,
                    party_name, cheque_number, transfer_number, match_status,
                    matched_accounting_id, matched_level, is_excluded
                ) VALUES (
                    :id, :sess_id, :row_num, :dt, :ref,
                    :desc, :deb, :crd, :net, :bal,
                    :party, :chk, :trf, :status,
                    :m_acc, :m_lvl, :excl
                )
                ON DUPLICATE KEY UPDATE
                    match_status = VALUES(match_status),
                    matched_accounting_id = VALUES(matched_accounting_id),
                    matched_level = VALUES(matched_level),
                    is_excluded = VALUES(is_excluded)
            ");

            foreach ($bankTxList as $btx) {
                $btxStmt->execute([
                    ':id' => $btx['id'],
                    ':sess_id' => $sess['id'],
                    ':row_num' => (int)($btx['rowNumber'] ?? 1),
                    ':dt' => $btx['transactionDate'],
                    ':ref' => $btx['referenceNumber'] ?? '',
                    ':desc' => $btx['description'],
                    ':deb' => (float)($btx['debit'] ?? 0),
                    ':crd' => (float)($btx['credit'] ?? 0),
                    ':net' => (float)($btx['netAmount'] ?? 0),
                    ':bal' => (float)($btx['balanceAfter'] ?? 0),
                    ':party' => $btx['partyName'] ?? null,
                    ':chk' => $btx['chequeNumber'] ?? null,
                    ':trf' => $btx['transferNumber'] ?? null,
                    ':status' => $btx['matchStatus'] ?? 'unmatched',
                    ':m_acc' => $btx['matchedAccountingId'] ?? null,
                    ':m_lvl' => $btx['matchedLevel'] ?? null,
                    ':excl' => !empty($btx['isExcluded']) ? 1 : 0,
                ]);
            }
        }

        // 3. إدخال حركات الأستاذ العام
        if (!empty($ledgerTxList)) {
            $ltxStmt = $pdo->prepare("
                INSERT INTO reconciliation_ledger_tx (
                    id, session_id, journal_entry_number, entry_date, reference_number,
                    description, counter_account_name, counter_account_code,
                    debit, credit, net_amount, cheque_number, transfer_number,
                    party_name, source_module, match_status, matched_bank_id
                ) VALUES (
                    :id, :sess_id, :jv_num, :dt, :ref,
                    :desc, :cnt_name, :cnt_code,
                    :deb, :crd, :net, :chk, :trf,
                    :party, :src, :status, :m_bank
                )
                ON DUPLICATE KEY UPDATE
                    match_status = VALUES(match_status),
                    matched_bank_id = VALUES(matched_bank_id)
            ");

            foreach ($ledgerTxList as $ltx) {
                $ltxStmt->execute([
                    ':id' => $ltx['id'],
                    ':sess_id' => $sess['id'],
                    ':jv_num' => $ltx['journalEntryNumber'] ?? '',
                    ':dt' => $ltx['entryDate'],
                    ':ref' => $ltx['referenceNumber'] ?? '',
                    ':desc' => $ltx['description'],
                    ':cnt_name' => $ltx['counterAccountName'] ?? '',
                    ':cnt_code' => $ltx['counterAccountCode'] ?? '',
                    ':deb' => (float)($ltx['debit'] ?? 0),
                    ':crd' => (float)($ltx['credit'] ?? 0),
                    ':net' => (float)($ltx['netAmount'] ?? 0),
                    ':chk' => $ltx['chequeNumber'] ?? null,
                    ':trf' => $ltx['transferNumber'] ?? null,
                    ':party' => $ltx['partyName'] ?? null,
                    ':src' => $ltx['sourceModule'] ?? 'general_ledger',
                    ':status' => $ltx['matchStatus'] ?? 'unmatched',
                    ':m_bank' => $ltx['matchedBankId'] ?? null,
                ]);
            }
        }

        // 4. إدخال الفروقات
        if (!empty($diffList)) {
            $diffStmt = $pdo->prepare("
                INSERT INTO reconciliation_diffs (
                    id, session_id, bank_tx_id, accounting_tx_id, difference_type,
                    transaction_date, reference_number, description,
                    bank_amount, accounting_amount, difference_value,
                    cause, required_action, responsible_person, processing_status, notes
                ) VALUES (
                    :id, :sess_id, :btx, :atx, :diff_t,
                    :dt, :ref, :desc,
                    :b_amt, :a_amt, :diff_val,
                    :cause, :action, :resp, :status, :notes
                )
                ON DUPLICATE KEY UPDATE
                    processing_status = VALUES(processing_status),
                    cause = VALUES(cause),
                    required_action = VALUES(required_action),
                    notes = VALUES(notes)
            ");

            foreach ($diffList as $df) {
                $diffStmt->execute([
                    ':id' => $df['id'],
                    ':sess_id' => $sess['id'],
                    ':btx' => $df['bankTxId'] ?? null,
                    ':atx' => $df['accountingTxId'] ?? null,
                    ':diff_t' => $df['differenceType'],
                    ':dt' => $df['transactionDate'] ?? date('Y-m-d'),
                    ':ref' => $df['referenceNumber'] ?? '',
                    ':desc' => $df['description'] ?? '',
                    ':b_amt' => (float)($df['bankAmount'] ?? 0),
                    ':a_amt' => (float)($df['accountingAmount'] ?? 0),
                    ':diff_val' => (float)($df['differenceValue'] ?? 0),
                    ':cause' => $df['cause'] ?? '',
                    ':action' => $df['requiredAction'] ?? '',
                    ':resp' => $df['responsiblePerson'] ?? '',
                    ':status' => $df['processingStatus'] ?? 'pending',
                    ':notes' => $df['notes'] ?? '',
                ]);
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'تم حفظ جلسة المطابقة وكافة الحركات في قاعدة البيانات بنجاح', 'id' => $sess['id']], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// =========================================================================
// 10. جلب حركات جلسة مطابقة محددة
// =========================================================================
if ($action === 'get_session_details') {
    try {
        $sessionId = $_GET['session_id'] ?? '';
        if (!$sessionId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'معرف الجلسة مطلوب'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $bTxStmt = $pdo->prepare("SELECT * FROM reconciliation_bank_tx WHERE session_id = :sid ORDER BY row_number ASC, transaction_date ASC");
        $bTxStmt->execute([':sid' => $sessionId]);
        $bankTransactions = [];
        while ($r = $bTxStmt->fetch(PDO::FETCH_ASSOC)) {
            $bankTransactions[] = [
                'id' => $r['id'],
                'importId' => $r['session_id'],
                'rowNumber' => (int)$r['row_number'],
                'transactionDate' => $r['transaction_date'],
                'referenceNumber' => $r['reference_number'] ?? '',
                'description' => $r['description'],
                'debit' => (float)$r['debit'],
                'credit' => (float)$r['credit'],
                'netAmount' => (float)$r['net_amount'],
                'balanceAfter' => (float)$r['balance_after'],
                'partyName' => $r['party_name'],
                'chequeNumber' => $r['cheque_number'],
                'transferNumber' => $r['transfer_number'],
                'matchStatus' => $r['match_status'],
                'matchedAccountingId' => $r['matched_accounting_id'],
                'matchedLevel' => $r['matched_level'],
                'isExcluded' => (bool)$r['is_excluded'],
            ];
        }

        $lTxStmt = $pdo->prepare("SELECT * FROM reconciliation_ledger_tx WHERE session_id = :sid ORDER BY entry_date ASC");
        $lTxStmt->execute([':sid' => $sessionId]);
        $ledgerTransactions = [];
        while ($r = $lTxStmt->fetch(PDO::FETCH_ASSOC)) {
            $ledgerTransactions[] = [
                'id' => $r['id'],
                'journalEntryNumber' => $r['journal_entry_number'] ?? '',
                'entryDate' => $r['entry_date'],
                'referenceNumber' => $r['reference_number'] ?? '',
                'description' => $r['description'],
                'counterAccountName' => $r['counter_account_name'] ?? '',
                'counterAccountCode' => $r['counter_account_code'] ?? '',
                'debit' => (float)$r['debit'],
                'credit' => (float)$r['credit'],
                'netAmount' => (float)$r['net_amount'],
                'chequeNumber' => $r['cheque_number'],
                'transferNumber' => $r['transfer_number'],
                'partyName' => $r['party_name'],
                'sourceModule' => $r['source_module'],
                'matchStatus' => $r['match_status'],
                'matchedBankId' => $r['matched_bank_id'],
            ];
        }

        $diffStmt = $pdo->prepare("SELECT * FROM reconciliation_diffs WHERE session_id = :sid ORDER BY transaction_date ASC");
        $diffStmt->execute([':sid' => $sessionId]);
        $differences = [];
        while ($r = $diffStmt->fetch(PDO::FETCH_ASSOC)) {
            $differences[] = [
                'id' => $r['id'],
                'sessionId' => $r['session_id'],
                'bankTxId' => $r['bank_tx_id'],
                'accountingTxId' => $r['accounting_tx_id'],
                'differenceType' => $r['difference_type'],
                'transactionDate' => $r['transaction_date'],
                'referenceNumber' => $r['reference_number'] ?? '',
                'description' => $r['description'],
                'bankAmount' => (float)$r['bank_amount'],
                'accountingAmount' => (float)$r['accounting_amount'],
                'differenceValue' => (float)$r['difference_value'],
                'cause' => $r['cause'] ?? '',
                'requiredAction' => $r['required_action'] ?? '',
                'responsiblePerson' => $r['responsible_person'] ?? '',
                'processingStatus' => $r['processing_status'],
                'notes' => $r['notes'] ?? '',
                'createdAt' => $r['created_at'],
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'bankTransactions' => $bankTransactions,
                'ledgerTransactions' => $ledgerTransactions,
                'differences' => $differences,
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// إجراء غير معروف
http_response_code(400);
echo json_encode(['success' => false, 'error' => 'الإجراء المطلوب غير صالح أو غير معرّف: ' . htmlspecialchars($action)], JSON_UNESCAPED_UNICODE);
