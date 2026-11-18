/**
 * 🎯 منطق أظرف الميزانية (Jars Budgeting)
 * ---------------------------------------------------------------
 * يولّد HTML قسم الأظرف الخمسة لكل شهر:
 * - يوزّع المصاريف على الأظرف حسب التصنيفات
 * - يحسب الفائض غير المصروف ويحوّله للتحويش
 * - يتتبع المدوّر (carryover) من شهر لآخر
 */

// ===============================================================
// حساب "وفر الشهر" من الأرصدة الفعلية للحسابات
//    - USD: رصيد حساب usd بالدولار مباشرة
//    - الليرة: أرصدة cash + new cash (SYP القديمة وZWL الجديدة)
//      تُحوّل للدولار حسب آخر حركة ضمن الحساب المخصص لكل عملة
//      (rate = origAmount / converted  →  ليرة لكل دولار)
//    - الأرصدة تراكمية: كل الحركات حتى نهاية الشهر المعروض
//      (الرصيد الحقيقي لا يبدأ من صفر مع بداية الفترة المحددة)
// ===============================================================
// الحساب المخصص لاستخراج سعر صرف كل عملة ليرة
const CURRENCY_RATE_ACCOUNT = { SYP: "cash", ZWL: "new cash" };

function getMonthlySavedBreakdown(monthName) {
    const monthStart = new Date(monthName + "-01T00:00:00");
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    // نهاية الفترة المحددة: الرصيد التراكمي لا يتجاوزها
    const periodEnd = AppState.periodEnd || new Date(8640000000000000);

    let usdBalance = 0;
    const ccyBalances = {};   // currency -> رصيد خام بالليرة (ضمن الفترة)
    const rateEvents = { SYP: [], ZWL: [] }; // حركات الحسابات المخصصة (كل التاريخ)

    AppState.accountFlowRows.forEach((row) => {
        if (!row.date || row.date >= monthEnd) return;

        // رصد سعر الصرف: أي حركة (ليست التحويلات فقط) في الحساب المخصص للعملة
        const rateAccount = CURRENCY_RATE_ACCOUNT[row.currency];
        if (rateAccount && row.account === rateAccount) {
            const orig = Math.abs(row.origAmount);
            const conv = Math.abs(row.converted);
            if (orig > 0 && conv > 0) {
                rateEvents[row.currency].push({ date: row.date, rate: orig / conv });
            }
        }
        // الأرصدة: رصيد تراكمي حتى نهاية هذا الشهر — يشمل حركات ما قبل الفترة
        if (row.date > periodEnd) return;

        if (row.account === "usd") {
            usdBalance += row.converted;
            return;
        }
        if (row.currency !== "SYP" && row.currency !== "ZWL") return;

        ccyBalances[row.currency] = (ccyBalances[row.currency] || 0) + row.origAmount;
    });

    // ترتيب أحداث الأسعار زمنياً لاختيار "آخر حركة قبل نهاية الشهر"
    Object.keys(rateEvents).forEach((c) =>
        rateEvents[c].sort((a, b) => a.date - b.date)
    );

    const syp = {};
    let sypUsdTotal = 0;
    ["SYP", "ZWL"].forEach((c) => {
        const balance = ccyBalances[c] || 0;
        if (balance === 0) return;

        const events = rateEvents[c] || [];
        const chosen = events.length ? events[events.length - 1] : null;
        const rate = chosen ? chosen.rate : null;
        const usd = rate ? balance / rate : 0;
        syp[c] = { balance: balance, rate: rate, usd: usd };
        sypUsdTotal += usd;
    });

    return {
        usd: usdBalance,
        syp: syp,
        sypUsdTotal: sypUsdTotal,
        total: usdBalance + sypUsdTotal
    };
}

// توليد HTML أظرف شهر معيّن
// @param monthCategoriesMap {category: {description: amount}}
// @param totalMonthExpense مجموع مصاريف الشهر
// @param currentMonthCarryover المدوّر القادم من الشهر السابق
// @param monthName مفتاح الشهر "YYYY-MM"
// @returns { html: string, monthSurplus: number }
function generateJarsHtmlForMonth(monthCategoriesMap, totalMonthExpense, currentMonthCarryover, monthName) {
    const totalIncome = AppState.monthlySalary[monthName] || 0;
    const csvAdditions = AppState.csvPositiveAdditions[monthName] || 0;

    // الإضافة اليدوية: من الذاكرة، أو من التخزين المحلي إذا أول زيارة لهذا الشهر
    if (AppState.monthAdditions[monthName] === undefined) {
        AppState.monthAdditions[monthName] = getStoredMonthAddition(monthName);
    }
    const manualAdditions = AppState.monthAdditions[monthName];
    const totalMonthAdditions = csvAdditions + manualAdditions;

    // جمع مصاريف كل ظرف حسب تصنيفاته — تُولَّد المفاتيح ديناميكياً من JARS_MAPPING
    // حتى أي ظرف جديد يُضاف في config.js يعمل تلقائياً بدون تعديل هنا
    let monthJarsTotals = {};
    Object.keys(JARS_MAPPING).forEach((key) => (monthJarsTotals[key] = 0));

    Object.keys(monthCategoriesMap).forEach((cat) => {
        let catSum = Object.values(monthCategoriesMap[cat]).reduce((a, b) => a + b, 0);
        for (const jarKey in JARS_MAPPING) {
            if (JARS_MAPPING[jarKey].categories.map((c) => c.toLowerCase()).includes(cat.toLowerCase())) {
                monthJarsTotals[jarKey] += catSum;
                break;
            }
        }
    });

    const totalAvailableBudget = totalIncome + currentMonthCarryover + totalMonthAdditions;
    const unspentSurplus = totalAvailableBudget - totalMonthExpense;

    // "وفر الشهر" = الرصيد الفعلي المتبقي في الحسابات:
    // رصيد USD مباشرة + أرصدة الليرة (SYP/ZWL) محوّلة حسب آخر سعر تحويل بالشهر
    const savedBreakdown = getMonthlySavedBreakdown(monthName);
    if (savedBreakdown.total > 0 && monthJarsTotals.savings !== undefined) {
        monthJarsTotals.savings += savedBreakdown.total;
    }

    // بطاقات تفصيل المتبقي حسب العملة: الرصيد الخام + المعادل الدولاري + السعر المستخدم
    const savedCards = [];
    const pushSavedCard = (icon, title, rawText, usdText, subText) => {
        savedCards.push(
            `<div class='saved-ccy-card'>` +
            `<div class='saved-ccy-title'>${icon} ${title}</div>` +
            `<div class='saved-ccy-raw'>${rawText}</div>` +
            `<div class='saved-ccy-usd'>${usdText}</div>` +
            (subText ? `<div class='saved-ccy-rate'>${subText}</div>` : "") +
            `</div>`
        );
    };
    if (Math.abs(savedBreakdown.usd) >= 1) {
        pushSavedCard("💵", "USD", `$${formatMoney(savedBreakdown.usd)}`, "بالدولار مباشرة", "");
    }
    ["SYP", "ZWL"].forEach((c) => {
        const s = savedBreakdown.syp[c];
        if (!s || s.balance === 0 || Math.abs(s.usd) < 1) return;
        const title = c === "SYP" ? "ليرة قديمة (SYP)" : "ليرة جديدة (ZWL)";
        const rateText = s.rate ? `السعر: ${formatMoney(s.rate)} ${c}/$` : "⚠️ لا يوجد سعر تحويل";
        pushSavedCard(
            "💷", title,
            `${formatMoney(s.balance)} ${c}`,
            s.rate ? `≈ $${formatMoney(s.usd)}` : "≈ $0.00",
            rateText
        );
    });
    const savedBreakdownHtml = savedCards.length
        ? `<div class='saved-breakdown'><div class='saved-breakdown-title'>💰 تفصيل المتبقي من الأموال:</div><div class='saved-breakdown-grid'>${savedCards.join("")}</div></div>`
        : "";

    // تدفقات الديون لهذا الشهر: 4 بطاقات حسب اتجاه التحويل ورصيد حساب الدين بعده
    const debtFlows = AppState.debtMonthlyFlows[monthName] || { repaid: 0, collected: 0, newDebt: 0, lent: 0 };

    let jarsBodyId = `jars_body_${monthName.replace("-", "_")}`;

    let html = `<div class='jars-section-box'>
        <div style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; user-select: none;"
             onclick="toggleSectionBox('${jarsBodyId}', this)">
            <h3 style='margin:0; font-size:14pt;'><span class='collapse-icon' style='font-family:monospace; margin-left:5px;'>▼</span> 🎯 ميزانية الأظرف الخمسة لهذا الشهر (الراتب المكتشف: <span style='color: #3182ce; font-weight: bold;'>$${formatMoney(totalIncome)}</span>)</h3>
            <span style='font-size: 11pt; color: var(--text-muted); font-weight: bold;'>اضغط للفتح / الطي</span>
        </div>

        <div id="${jarsBodyId}" style="display: none; margin-top: 15px; border-top: 1px dashed var(--border-jars); padding-top: 15px;">
        <div class='month-stats-grid'>
            <div class='month-stat-card'><div class='stat-label'>📈 المدوّر السابق</div><div class='stat-value'>$${formatMoney(currentMonthCarryover)}</div></div>
            <div class='month-stat-card'><div class='stat-label'>💸 الصرف الكلي للشهر</div><div class='stat-value' style='color:#E53E3E;'>$${formatMoney(totalMonthExpense)}</div></div>
            <div class='month-stat-card stat-highlight'><div class='stat-label'>✨ المتبقي من الأموال</div><div class='stat-value' style='color:#38A169;'>$${formatMoney(savedBreakdown.total)}</div></div>
        </div>
        <div class='debt-stats-grid'>
            <div class='month-stat-card debt-repaid-card'><div class='stat-label'>💸 الديون يلي انا سددتها</div><div class='stat-value' style='color:#38A169;'>$${formatMoney(debtFlows.repaid)}</div></div>
            <div class='month-stat-card debt-collected-card'><div class='stat-label'>🤝 الديون يلي انا حصلتها</div><div class='stat-value' style='color:#3182CE;'>$${formatMoney(debtFlows.collected)}</div></div>
            <div class='month-stat-card debt-newdebt-card'><div class='stat-label'>📥 ديون تسجّلت عليّ جديدة هالشهر</div><div class='stat-value' style='color:#DD6B20;'>$${formatMoney(debtFlows.newDebt)}</div></div>
            <div class='month-stat-card debt-lent-card'><div class='stat-label'>🤲 ديون دينت فيها حسابات تانية</div><div class='stat-value' style='color:#805AD5;'>$${formatMoney(debtFlows.lent)}</div></div>
        </div>
        ${savedBreakdownHtml}
        ${totalIncome === 0 ? `<p style='text-align:center; font-size:12px; color:#DD6B20; margin:0 0 10px 0;'>⚠️ لم يُكتشف راتب لهذا الشهر — المستهدفات أدناه ستظهر بقيمة صفر. تأكد من تصنيف Salary في Monefy.</p>` : ""}

        <div style="background: var(--table-stripe); padding: 10px; border-radius: 8px; border: 1px dashed var(--border-jars); max-width: 420px; margin: 0 auto 15px auto; text-align: center; font-size: 12px; line-height: 1.5; color: var(--text-main);">
            <div style="margin-bottom: 5px;">📥 إضافات تلقائية من الـ CSV: <strong style='color:#38A169;'>$${formatMoney(csvAdditions)}</strong></div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
                <label for="additions-input-${monthName}" style="margin: 0; font-weight: bold;">➕ تكملة يدوية من عندك ($):</label>
                <input type="number" id="additions-input-${monthName}" value="${manualAdditions}" onblur="updateAdditionsMemory('${monthName}', this)" style="padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; width: 80px; text-align: center; font-weight: bold; background: var(--bg-input); color: var(--text-main);">
            </div>
            <div style="margin-top: 6px; border-top: 1px solid var(--border-color); padding-top: 4px; font-weight: bold;">
                🔥 إجمالي إضافات الشهر الكلية: $${formatMoney(totalMonthAdditions)}
            </div>
        </div>`;

    // شريط تقدم لكل ظرف
    for (const key in JARS_MAPPING) {
        const jar = JARS_MAPPING[key];
        const targetAmount = totalIncome * jar.targetPercent;
        const actualAmount = monthJarsTotals[key] || 0;
        const percentOfTarget = targetAmount > 0 ? (actualAmount / targetAmount) * 100 : 0;

        const isOverBudget = jar.warnOnOver && actualAmount > targetAmount;
        const barColor = isOverBudget ? "#E53E3E" : jar.color;

        html += `
            <div style='display: flex; flex-direction: column; gap: 6px; padding: 10px 0; border-bottom: 1px solid var(--border-color);'>
                <div style='display: flex; justify-content: space-between; align-items: center; font-size: 12px; flex-wrap: wrap; gap: 5px;'>
                    <span style='font-weight: bold;'>📍 ${jar.name}</span>
                    <span style='text-align: left;'>
                        الفعلي: <strong style='color:${barColor};'>$${formatMoney(actualAmount)}</strong>
                        <span style='color: var(--text-muted); font-size: 11px;'>/ المستهدف: $${formatMoney(targetAmount)} (${percentOfTarget.toFixed(1)}%)</span>
                    </span>
                </div>
                <div style='background-color: var(--table-stripe); height: 16px; border-radius: 8px; overflow: hidden; margin: 5px 0; position: relative; border: 1px solid var(--border-color); width: 100%; box-sizing: border-box;'>
                    <div style='width: ${Math.min(percentOfTarget, 100)}%; background-color: ${barColor}; height: 100%; border-radius: 8px; transition: width 0.3s ease;'></div>
                </div>
            </div>`;
    }
    html += `</div></div>`;
    return { html: html, monthSurplus: unspentSurplus };
}
