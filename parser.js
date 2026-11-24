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

// Is this row the old pound currency (SYP)? (real value divided by 100)
// Note: the new pound (ZWL) real value is already ready, no division
function isOldPoundCurrency(currencyStr, description) {
    const checkCurrency = (currencyStr || "").toLowerCase();
    const checkDesc = (description || "").toLowerCase();
    return checkCurrency === "syp" || checkDesc.includes("syp");
}

// Extract the real value from REAL_AMOUNT column with old-pound handling
function parseRealAmount(realAmountStr, currencyStr, description) {
    let cleanRealStr = realAmountStr ? realAmountStr.replace(/[^\d.-]/g, "") : "";
    let parsed = parseFloat(cleanRealStr);
    if (isNaN(parsed)) parsed = 0;
    if (isOldPoundCurrency(currencyStr, description)) parsed = parsed / 100;
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
        // Track transfers between debt accounts and personal accounts:
        // debt balance < 0 = I owe them | > 0 = they owe me
        // (transfers between two debt accounts are ignored)
        const amt = parseFloat(fields.amountStr) || 0;
        let isFlow = false;
        if (isTransferCategory(fields.category)) {
            const counterparty = getTransferCounterparty(fields.category);
            isFlow = !!(counterparty && !DEBT_ACCOUNTS_SET.has(counterparty));
        }
        // Raw row for chronological balance reconstruction (netting runs after parsing)
        AppState.debtAccountRows.push({
            date: rowDate,
            account: fields.account,
            amt: amt,
            monthKey: rowDate.getFullYear() + "-" + String(rowDate.getMonth() + 1).padStart(2, "0"),
            isFlow: isFlow
        });
        handleFriendDebt(fields);
        return;
    }

    // 3) التحويلات الداخلية تُتجاهل
    if (isTransferCategory(fields.category)) return;

    // 4) الرواتب / الإضافات / المصاريف داخل الفترة
    handleExpenseRow(fields, rowDate, startDate, endDate);
}

// Net debt transfers per account per month, then classify into 4 buckets.
// Net > 0 = I paid them net | net < 0 = they paid me net.
// Classification uses the debt account balance after the LAST transfer of that month (chronological).
function finalizeDebtMonthlyFlows() {
    // Reconstruct each debt account balance chronologically (file order may not be sorted)
    const byAccount = {};
    AppState.debtAccountRows.forEach((r) => {
        (byAccount[r.account] = byAccount[r.account] || []).push(r);
    });

    const groups = {}; // monthKey -> account -> { net, balBefore }
    Object.keys(byAccount).forEach((acc) => {
        const rows = byAccount[acc].sort((a, b) => a.date - b.date);

        // Pass واحد: صافي التدفقات الشهرية + الرصيد قبل أول تدفق بالشهر.
        // نستخدم رصيد ما قبل حركات الشهر (وليس رصيد نهاية الشهر) لأن حركات الشهر
        // نفسها قد تقلب إشارة الرصيد (مثلاً دفعة تسوية أخيرة تصفّر الدين).
        let bal = 0;
        const monthFirstFlowBal = {};
        rows.forEach((r) => {
            if (r.isFlow && monthFirstFlowBal[r.monthKey] === undefined) {
                monthFirstFlowBal[r.monthKey] = bal; // الرصيد قبل أول تدفق بالشهر
            }
            bal += r.amt;
            if (!r.isFlow) return;
            if (!groups[r.monthKey]) groups[r.monthKey] = {};
            const g = groups[r.monthKey][acc] || (groups[r.monthKey][acc] = { net: 0, balBefore: 0 });
            g.net += r.amt;
            g.balBefore = monthFirstFlowBal[r.monthKey];
        });
    });

    console.log("[DebtDebug] groups=", JSON.stringify(groups));

    // تسجيل تفصيلي: كل صف تدفق مع تاريخه ومبلغه والرصيد قبل حركات الشهر — لتشخيص أي مبلغ غلط
    const flowRowsDetail = {};
    Object.keys(byAccount).forEach((acc) => {
        const rows = byAccount[acc].sort((a, b) => a.date - b.date);
        let bal = 0;
        const monthFirstFlowBal = {};
        rows.forEach((r) => {
            if (r.isFlow && monthFirstFlowBal[r.monthKey] === undefined) {
                monthFirstFlowBal[r.monthKey] = bal;
            }
            bal += r.amt;
        });
        rows.forEach((r) => {
            if (!r.isFlow) return;
            const mk = r.monthKey;
            if (!flowRowsDetail[mk]) flowRowsDetail[mk] = {};
            if (!flowRowsDetail[mk][acc]) flowRowsDetail[mk][acc] = [];
            flowRowsDetail[mk][acc].push({
                date: r.date.toISOString().slice(0, 10),
                amt: r.amt,
                balBefore: monthFirstFlowBal[mk]
            });
        });
    });
    console.log("[DebtDebug] flowRowsDetail=", JSON.stringify(flowRowsDetail, null, 1));

    // حصر الأشهر على فترة التحليل المحددة (بداية/نهاية) — تجنب أشهر خارج الفترة
    const inPeriod = (mk) => {
        if (!AppState.periodStart || !AppState.periodEnd) return true;
        const [y, m] = mk.split("-").map(Number);
        const monthStart = new Date(y, m - 1, 1);
        const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
        return monthEnd >= AppState.periodStart && monthStart <= AppState.periodEnd;
    };
    Object.keys(groups).forEach((mk) => {
        if (!inPeriod(mk)) return;
        const flow = { repaid: 0, collected: 0, newDebt: 0, lent: 0 };
        Object.keys(groups[mk]).forEach((acc) => {
            const g = groups[mk][acc];
            if (g.net === 0) return;
            const absNet = Math.abs(g.net);
            if (g.net > 0) {
                // net I paid the debt account
                if (g.balBefore < 0) flow.repaid += absNet;
                else flow.lent += absNet;
            } else {
                // net the debt account paid me
                if (g.balBefore >= 0) flow.collected += absNet;
                else flow.newDebt += absNet;
            }
        });
        AppState.debtMonthlyFlows[mk] = flow;
    });
}

// --- Main function: read and parse the file ---
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
        AppState.debtAccountRows = [];

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

        finalizeDebtMonthlyFlows();
        // تطبيق ربط الأوصاف المتشابهة قبل إعادة الرسم
        if (typeof DescriptionMapper !== "undefined" && DescriptionMapper.applyAllMappings) {
            DescriptionMapper.applyAllMappings();
        }
        AppState.isFileAlreadyLoaded = true;
        recalculateAndRenderUI();
    };
    reader.onerror = function () {
        alert("تعذّر قراءة الملف يا حمودة! تأكد إنو الملف غير محمي أو تالف.");
    };
    reader.readAsText(file, "UTF-8");
}
