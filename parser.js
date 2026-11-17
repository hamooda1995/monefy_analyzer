/**
 * 📥 معالجة ملفات الـ CSV وتحليل البيانات
 * ---------------------------------------------------------------
 * يقرأ ملف Monefy CSV ويصنّف كل صف إلى:
 * - حسابات شخصية (أرصدة)
 * - ديون أصدقاء (أرصدة)
 * - رواتب / إضافات موجبة / مصاريف
 */

// تحديد رمز العملة من عمود العملة أو الوصف ($ أو /£)
function getCurrencySymbol(currencyStr, description) {
    const checkCurrency = (currencyStr || "").toLowerCase();
    const checkDesc = (description || "").toLowerCase();

    if (checkCurrency === "syp" || checkDesc.includes("syp")) return "/£";
    if (checkCurrency === "zwl" || checkDesc.includes("zwl")) return "/£";
    return "$";
}

// هل هذا الصف عملة الجنيه السوري/الزيمبابوي؟ (تُقسم القيمة الحقيقية على 100)
function isPoundCurrency(currencyStr, description) {
    const checkCurrency = (currencyStr || "").toLowerCase();
    const checkDesc = (description || "").toLowerCase();
    return checkCurrency === "syp" || checkDesc.includes("syp") ||
           checkCurrency === "zwl" || checkDesc.includes("zwl");
}

// استخراج القيمة الحقيقية من عمود REAL_AMOUNT مع معالجة عملة الجنيه
function parseRealAmount(realAmountStr, currencyStr, description) {
    let cleanRealStr = realAmountStr ? realAmountStr.replace(/[^\d.-]/g, "") : "";
    let parsed = parseFloat(cleanRealStr);
    if (isNaN(parsed)) parsed = 0;
    if (isPoundCurrency(currencyStr, description)) parsed = parsed / 100;
    return parsed;
}

// استخراج الحقول الأساسية من أعمدة السطر
function extractRowFields(columns) {
    return {
        dateStr: clean(columns.at(CSV_INDICES.DATE)),
        account: clean(columns.at(CSV_INDICES.ACCOUNT)),
        category: clean(columns.at(CSV_INDICES.CATEGORY)),
        amountStr: clean(columns.at(CSV_INDICES.AMOUNT)).replace(/[^\d.-]/g, ""),
        currency: clean(columns.at(CSV_INDICES.CURRENCY)),
        realAmount: clean(columns.at(CSV_INDICES.REAL_AMOUNT)),
        description:
            columns.length >= 8 && clean(columns.at(CSV_INDICES.DESC)).length > 0
                ? clean(columns.at(CSV_INDICES.DESC))
                : "بدون وصف"
    };
}

// --- معالجة صف حساب شخصي (تراكم رصيد) ---
function handlePersonalAccount(fields, rowDate, startDate, endDate) {
    const accountName = fields.account;
    if (!AppState.personalAccounts[accountName]) {
        AppState.personalAccounts[accountName] = {
            balance: 0,
            realBalance: 0,
            currency: getCurrencySymbol(fields.currency, fields.description)
        };
    }

    const convertedAmount = parseFloat(fields.amountStr);
    const realValue = parseRealAmount(fields.realAmount, fields.currency, fields.description);

    AppState.personalAccounts[accountName].balance += convertedAmount;
    AppState.personalAccounts[accountName].realBalance += realValue;

    // تحويلات حساب "ثروة" داخل الفترة تُحسب كمصروف استثماري
    const lowerAcc = accountName.toLowerCase();
    if (rowDate >= startDate && rowDate <= endDate &&
        (lowerAcc === "ثروة" || lowerAcc === "ثروه")) {
        const monthKey = rowDate.getFullYear() + "-" + String(rowDate.getMonth() + 1).padStart(2, "0");
        AppState.parsedRowsData.push({
            date: rowDate,
            monthKey: monthKey,
            category: "Investment",
            description: "تحويل استثماري لحساب ثروة 💰",
            amount: parseFloat(fields.amountStr),
            isTransfer: true // تحويل داخلي — مُعلَّم للتمييز مستقبلاً عن المصاريف الحقيقية
        });
    }
}

// --- معالجة صف دين صديق (تراكم رصيد ثم تجاهل الصف) ---
function handleFriendDebt(fields) {
    const accountName = fields.account;
    const convertedAmount = parseFloat(fields.amountStr);
    const realValue = parseRealAmount(fields.realAmount, fields.currency, fields.description);

    if (!AppState.friendsDebts[accountName]) {
        AppState.friendsDebts[accountName] = {
            balance: 0,
            realBalance: 0,
            currency: getCurrencySymbol(fields.currency, fields.description)
        };
    }

    AppState.friendsDebts[accountName].balance += convertedAmount;
    AppState.friendsDebts[accountName].realBalance += realValue;

    // تصفير الأرصدة الضئيلة جداً (تُعتبر مسددة)
    if (Math.abs(AppState.friendsDebts[accountName].balance) < 0.02 ||
        Math.abs(AppState.friendsDebts[accountName].realBalance) < 1.0) {
        AppState.friendsDebts[accountName].balance = 0;
        AppState.friendsDebts[accountName].realBalance = 0;
    }
    return; // الصف ضئيل — يُعتبر مسدداً
}

// --- معالجة صف مصروف/راتب/إضافة داخل الفترة المحددة ---
function handleExpenseRow(fields, rowDate, startDate, endDate) {
    if (rowDate < startDate || rowDate > endDate) return;

    const convertedAmount = parseFloat(fields.amountStr);
    const monthKey = rowDate.getFullYear() + "-" + String(rowDate.getMonth() + 1).padStart(2, "0");

    if (fields.category.toLowerCase() === "salary") {
        AppState.monthlySalary[monthKey] =
            (AppState.monthlySalary[monthKey] || 0) + Math.abs(convertedAmount);
        return;
    }

    if (convertedAmount >= 0) {
        AppState.csvPositiveAdditions[monthKey] =
            (AppState.csvPositiveAdditions[monthKey] || 0) + convertedAmount;
        return;
    }

    AppState.parsedRowsData.push({
        date: rowDate,
        monthKey: monthKey,
        category: fields.category,
        description: fields.description,
        amount: Math.abs(convertedAmount)
    });
}

// هل التصنيف تحويل داخلي بين الحسابات (يُتجاهل)؟
function isTransferCategory(category) {
    const lower = category.toLowerCase();
    return category.startsWith("To '") || category.startsWith("From '") ||
           lower.includes("to '") || lower.includes("from '");
}

// استخراج اسم الحساب المقابل من تصنيف التحويل مثل "To 'محمد'" أو "From 'USD'"
function getTransferCounterparty(category) {
    const m = (category || "").match(/(?:to|from)\s*'(.*?)'/i);
    return m ? m[1].trim().toLowerCase() : "";
}

// معالجة سطر CSV واحد (لا تُرجع قيمة — الاستهلاك ضمني)
function processCsvRow(columns, startDate, endDate) {
    if (columns.length < 7) return;

    const fields = extractRowFields(columns);
    const rowDate = parseJavaDate(fields.dateStr);
    if (!rowDate || isNaN(rowDate.getTime())) return;

    const lowerAccName = fields.account.toLowerCase();

    // تسجيل حركات حسابات الأرصدة (usd / cash / new cash) — تُسجَّل كل الصفوف
    // حتى خارج الفترة المحددة، لأن الأرصدة تراكمية وتحتاج كامل التاريخ
    if (BALANCE_TRACKED_ACCOUNTS_SET.has(lowerAccName)) {
        AppState.accountFlowRows.push({
            date: rowDate,
            monthKey: rowDate.getFullYear() + "-" + String(rowDate.getMonth() + 1).padStart(2, "0"),
            account: lowerAccName,
            currency: (fields.currency || "").toUpperCase(),
            origAmount: parseFloat((fields.realAmount || "").replace(/[^\d.-]/g, "")) || 0,
            converted: parseFloat(fields.amountStr) || 0,
            isTransfer: isTransferCategory(fields.category)
        });
    }

    // 1) الحسابات الشخصية
    if (PERSONAL_ACCOUNTS_SET.has(lowerAccName)) {
        handlePersonalAccount(fields, rowDate, startDate, endDate);
    }

    // 2) حسابات ديون الأصدقاء (تُستهلك دائماً)
    if (DEBT_ACCOUNTS_SET.has(lowerAccName)) {
        // تتبع التحويلات بين الحسابات الشخصية وحسابات الديون:
        // مبلغ موجب داخل حساب الدين = دين جديد حصل | سالب = دين سُدد
        // (التحويلات بين حسابي دين وحساب دين آخر تُتجاهل)
        if (isTransferCategory(fields.category)) {
            const counterparty = getTransferCounterparty(fields.category);
            if (counterparty && !DEBT_ACCOUNTS_SET.has(counterparty)) {
                const monthKey = rowDate.getFullYear() + "-" + String(rowDate.getMonth() + 1).padStart(2, "0");
                const amt = parseFloat(fields.amountStr) || 0;
                if (!AppState.debtMonthlyFlows[monthKey]) {
                    AppState.debtMonthlyFlows[monthKey] = { incurred: 0, repaid: 0 };
                }
                if (amt >= 0) {
                    AppState.debtMonthlyFlows[monthKey].incurred += amt;
                } else {
                    AppState.debtMonthlyFlows[monthKey].repaid += Math.abs(amt);
                }
            }
        }
        handleFriendDebt(fields);
        return;
    }

    // 3) التحويلات الداخلية تُتجاهل
    if (isTransferCategory(fields.category)) return;

    // 4) الرواتب / الإضافات / المصاريف داخل الفترة
    handleExpenseRow(fields, rowDate, startDate, endDate);
}

// --- الدالة الرئيسية: قراءة الملف وتحليله ---
function processAndDisplay(isExplicitClick) {
    const fileInput = document.getElementById("csvFile");
    const startDateInput = document.getElementById("startDate").value;
    const endDateInput = document.getElementById("endDate").value;

    if (!isExplicitClick && AppState.isFileAlreadyLoaded) {
        recalculateAndRenderUI();
        return;
    }

    if (!fileInput.files || !fileInput.files.length) {
        if (isExplicitClick)
            alert("الرجاء اختيار ملف الـ CSV وتحديد تواريخ البدء والنهاية أولاً يا حمودة!");
        return;
    }
    if (isExplicitClick) {
        AppState.isDataAnalyzed = true;
    }

    const file = fileInput.files[0];
    const startDate = new Date(startDateInput);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateInput);
    endDate.setHours(23, 59, 59, 999);

    // حفظ الفترة المحددة — تُستخدم لحصر حساب "وفر الشهر" على الفترة فقط
    AppState.periodStart = startDate;
    AppState.periodEnd = endDate;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
            alert("الملف فاضي أو تالف يا حمودة! تأكد إنو اخترت ملف CSV صحيح من تطبيق Monefy.");
            return;
        }

        const separator = text.includes("\t") ? "\t" : ",";
        AppState.parsedRowsData = [];
        AppState.accountFlowRows = [];
        AppState.csvPositiveAdditions = {};
        AppState.monthlySalary = {};
        AppState.friendsDebts = {};
        AppState.personalAccounts = {};
        AppState.debtMonthlyFlows = {};

        for (let i = 1; i < lines.length; i++) {
            let line = lines[i];
            let columns =
                separator === "," ? line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/) : line.split("\t");
            try {
                processCsvRow(columns, startDate, endDate);
            } catch (err) {
                console.log("خطأ في تحليل السطر:", line, err);
            }
        }

        AppState.isFileAlreadyLoaded = true;
        recalculateAndRenderUI();
    };
    reader.onerror = function () {
        alert("تعذّر قراءة الملف يا حمودة! تأكد إنو الملف غير محمي أو تالف.");
    };
    reader.readAsText(file, "UTF-8");
}
