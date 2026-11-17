/**
 * 📋 نظام أقسام التقارير العامة (Report Sections Registry)
 * ---------------------------------------------------------------
 * كل قسم تقرير مستقل: دالة render(data) تُرجع HTML جاهز.
 *
 * ✅ لإضافة وظيفة/تقرير جديد:
 *    1) اكتب دالة render ترجع HTML (استخدم كلاسات global-block-wrapper و collapse-icon)
 *    2) سجّلها بسطر واحد في ReportSectionsRegistry بالأسفل
 *    لن يتأثر أي كود موجود.
 *
 * @param data كائن يحوي نتائج التحليل:
 *   - descriptionMonths: { desc: Set<monthKey> }
 *   - descriptionAmounts: { desc: [amounts] }
 *   - categoryMonthsTracker / categoryAmountsTracker
 *   - friendsDebts / personalAccounts / monthlySalary
 */

// --- القسم 1: الاشتراكات الثابتة والمصاريف الدورية ---
function renderSubscriptionsSection(data) {
    const boxId = "subscription_body_box";

    let rowsHtml = "";
    let hasSubs = false;

    Object.keys(data.descriptionMonths)
        .sort((a, b) => {
            let sizeA = data.descriptionMonths[a].size;
            let sizeB = data.descriptionMonths[b].size;
            if (sizeA !== sizeB) return sizeB - sizeA;
            let avgA = data.descriptionAmounts[a].reduce((x, y) => x + y, 0) / sizeA;
            let avgB = data.descriptionAmounts[b].reduce((x, y) => x + y, 0) / sizeB;
            return avgB - avgA;
        })
        .forEach((desc) => {
            if (data.descriptionMonths[desc].size >= 2) {
                hasSubs = true;
                let avg = data.descriptionAmounts[desc].reduce((a, b) => a + b, 0) / data.descriptionMonths[desc].size;
                rowsHtml += `<tr><td>🔄 ${desc}</td><td style='text-align:center;'>${data.descriptionMonths[desc].size} أشهر</td><td style='font-weight: bold;'>$${formatMoney(avg)} / شهر</td></tr>`;
            }
        });

    let bodyContent = hasSubs
        ? `<div class='table-responsive-wrapper'>
            <table>
                <tr><th>الوصف</th><th>عدد الأشهر</th><th>متوسط الصرف</th></tr>
                ${rowsHtml}
            </table>
        </div>`
        : `<p style='text-align:center;'>لم يتم اكتشاف أي نفقات أو اشتراكات متكررة في هذه الفترة يا حمودة.</p>`;

    return `<div class='global-block-wrapper' style='border: 2px solid #319795; margin-top: 35px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 📦 قائمة الاشتراكات الثابتة والمصاريف الدورية المتكررة
        </h2>
        <div id='${boxId}' style='display: none;'>
        ${bodyContent}</div></div>`;
}

// --- القسم 2: تحليلات التصنيفات التكرارية ---
function renderCategoryTrendsSection(data) {
    const boxId = "category_trent_body_box";
    const tracker = data.categoryMonthsTracker;
    const amounts = data.categoryAmountsTracker;

    let rowsHtml = "";
    let hasTrends = false;

    if (tracker) {
        Object.keys(tracker)
            .sort((a, b) => {
                let sizeA = tracker[a].size;
                let sizeB = tracker[b].size;
                if (sizeA !== sizeB) return sizeB - sizeA;
                let avgA = amounts[a].reduce((x, y) => x + y, 0) / sizeA;
                let avgB = amounts[b].reduce((x, y) => x + y, 0) / sizeB;
                return avgB - avgA;
            })
            .forEach((cat) => {
                if (tracker[cat].size >= 2) {
                    hasTrends = true;
                    let avg = amounts[cat].reduce((a, b) => a + b, 0) / tracker[cat].size;
                    rowsHtml += `<tr>
                        <td style='font-weight: bold;'>📁 ${cat}</td>
                        <td style='text-align:center;'>${tracker[cat].size} أشهر</td>
                        <td style='font-weight: bold;'>$${formatMoney(avg)} / شهر</td>
                    </tr>`;
                }
            });
    }

    if (!hasTrends) {
        return `<div class='global-block-wrapper' style='border: 2px solid #38A169; margin-top: 25px;'>
            <h2 style='color:#38A169; text-align:center;'>🗂️ تحليلات التصنيفات التكرارية</h2>
            <p style='text-align:center; color:var(--text-muted);'>لا توجد تصنيفات متكررة لأكثر من شهرين حالياً.</p>
        </div>`;
    }

    return `<div class='global-block-wrapper' style='border: 2px solid #38A169; margin-top: 25px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 🗂️ تحليلات التصنيفات التكرارية عبر الأشهر
        </h2>
        <p style='text-align:center; color:var(--text-muted); font-size:14px; margin-bottom:20px;'>موجز استهلاك الأقسام الرئيسية (مرتبة تنازلياً بحسب التكرار ثم القيمة الماليّة)</p>
        <div id='${boxId}' style='display: none;'>
        <div class='table-responsive-wrapper'><table>
            <tr><th>اسم التصنيف الرئيسي</th><th>معدل التكرار الزمني</th><th>المتوسط المالي الشهري</th></tr>
            ${rowsHtml}
        </table></div></div></div>`;
}

// --- القسم 3: سجل ديون الأصدقاء ---
function renderFriendsDebtsSection(data) {
    const boxId = "friends_debts_body_box";

    let rowsHtml = "";
    let hasDebtsData = false;

    if (data.friendsDebts) {
        let sortedFriends = Object.keys(data.friendsDebts).sort((a, b) => {
            let friendA = data.friendsDebts[a];
            let friendB = data.friendsDebts[b];
            if (friendA.currency !== friendB.currency) {
                return friendA.currency.localeCompare(friendB.currency);
            }
            return Math.abs(friendB.realBalance) - Math.abs(friendA.realBalance);
        });

        sortedFriends.forEach((friend) => {
            let debtObj = data.friendsDebts[friend];
            let balance = debtObj.balance;
            let realBalance = debtObj.realBalance;
            let currency = debtObj.currency || "$";

            if (Math.abs(balance) < 0.01) return;

            hasDebtsData = true;
            let statusText = balance > 0 ? `🟢 دائن (إلك معه مَصاري)` : `🔴 مَدين (عليك إلو مَصاري)`;
            let colorStyle = balance > 0 ? `color:#38A169;` : `color:#E53E3E;`;
            let displayRealBalance =
                currency === "$"
                    ? `$${formatMoney(Math.abs(realBalance))}`
                    : `£${formatMoney(Math.abs(realBalance))}`;

            rowsHtml += `<tr>
                <td style='font-weight: bold;'>👤 ${friend}</td>
                <td style='font-weight: bold; color: var(--text-main);'>${displayRealBalance}</td>
                <td style='font-weight: bold; color: #718096;'>$${Math.abs(formatMoney(balance))}</td>
                <td style='font-weight: bold; ${colorStyle}'>${statusText}</td>
            </tr>`;
        });
    }

    if (!hasDebtsData) {
        return `<div class='global-block-wrapper' style='border: 2px solid #805AD5; margin-top: 35px;'>
            <h2 style='color:#2B6CB0; text-align:center;'>👥 سجل حسابات ديون الأصدقاء</h2>
            <p style='text-align:center; color:var(--text-muted);'>لم يتم العثور على أي معاملات ديون نشطة مع الأصدقاء يا حمودة.</p>
        </div>`;
    }

    return `<div class='global-block-wrapper' style='border: 2px solid #805AD5; margin-top: 35px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 👥 سجل حسابات ديون الأصدقاء والمعاملات البينية
        </h2>
        <p style='text-align:center; color:var(--text-muted); font-size:14px; margin-bottom:20px;'>موجز الصافي المالي (مرتبة بحسب العملة ثم القيمة الحقيقية تنازلياً)</p>
        <div id='${boxId}' style='display: none;'>
        <div class='table-responsive-wrapper'><table>
            <tr><th>اسم الحساب (صديق)</th><th>الصافي بالعملة الموحدة</th><th>الصافي التقريبي بالدولار</th><th>الحالة الماليّة لحمودة</th></tr>
            ${rowsHtml}
        </table></div></div></div>`;
}

// --- القسم 4: حاسبة التخطيط المالي ---
function renderBudgetCalculatorSection(data) {
    const boxId = "budget_calculator_body_box";

    const salaryValues = Object.values(data.monthlySalary);
    const targetBaseIncome = salaryValues.length > 0
        ? salaryValues.reduce((a, b) => a + b, 0) / salaryValues.length
        : 0;

    let rowsHtml = "";
    for (const key in JARS_MAPPING) {
        const jar = JARS_MAPPING[key];
        const estimatedAllowance = targetBaseIncome * jar.targetPercent;
        rowsHtml += `<tr>
            <td style='font-weight: bold;'>📍 ${jar.name}</td>
            <td style='font-weight: bold;'>$${formatMoney(estimatedAllowance)}</td>
            <td style='font-size: 12px; color: var(--text-muted); max-width: 250px;'>${jar.advice || ""}</td>
        </tr>`;
    }

    return `<div class='global-block-wrapper' style='border: 2px solid #2B6CB0; margin-top: 25px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 🧮 حاسبة التخطيط المالي الافتراضي المستهدف
        </h2>
        <p style='text-align:center; color:var(--text-muted); font-size:14px; margin-bottom:20px;'>دليل توزيع الراتب الاسترشادي بناءً على متوسط الراتب المكتشف من الـ CSV وقدره: <strong style='color:#90cdf4;'>$${formatMoney(targetBaseIncome)}</strong></p>
        <div id='${boxId}' style='display: none;'>
        <div class='table-responsive-wrapper'><table>
            <tr><th>اسم ظرف التوزيع المستهدف</th><th>الحصة المالية الصافية</th><th>توجيهات الاستهلاك الذكي لـ حمودة</th></tr>
            ${rowsHtml}
        </table></div></div></div>`;
}

// --- القسم 5: سجل أرصدة الحسابات الشخصية ---
function renderPersonalAccountsSection(data) {
    const boxId = "personal_accounts_body_box";

    let rowsHtml = "";
    let hasPersonalData = false;

    if (data.personalAccounts) {
        Object.keys(data.personalAccounts).forEach((accName) => {
            let accObj = data.personalAccounts[accName];
            hasPersonalData = true;

            let displayReal = accObj.currency === "$"
                ? `$${formatMoney(accObj.realBalance)}`
                : `£${formatMoney(accObj.realBalance)}`;

            rowsHtml += `<tr>
                <td style='font-weight: bold;'>💳 ${accName}</td>
                <td style='font-weight: bold; color: var(--text-main);'>${displayReal}</td>
            </tr>`;
        });
    }

    if (!hasPersonalData) {
        return `<div class='global-block-wrapper' style='border: 2px solid #2D3748; margin-top: 35px;'>
            <h2 style='text-align:center;'>🏦 سجل أرصدة الحسابات الشخصية</h2>
            <p style='text-align:center;'>لم يتم العثور على أي بيانات للحسابات الشخصية.</p>
        </div>`;
    }

    return `<div class='global-block-wrapper' style='border: 2px solid #2D3748; margin-top: 35px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 🏦 سجل أرصدة الحسابات الشخصية
        </h2>
        <p style='text-align:center; color:var(--text-muted); font-size:14px; margin-bottom:20px;'>موجز الأرصدة الحالية للحسابات الشخصية والمالية</p>
        <div id='${boxId}' style='display: none;'>
        <div class='table-responsive-wrapper'><table>
            <tr><th>اسم الحساب الشخصي</th><th>الرصيد بالعملة الحقيقية</th></tr>
            ${rowsHtml}
        </table></div></div></div>`;
}

// ===============================================================
// 📌 سجل الأقسام — الترتيب هنا هو ترتيب الظهور في الصفحة
//    لإضافة قسم جديد: اكتب دالة render(data) وأضفها هنا.
// ===============================================================
const ReportSectionsRegistry = [
    { key: "subscriptions",    render: renderSubscriptionsSection },
    { key: "categoryTrends",   render: renderCategoryTrendsSection },
    { key: "friendsDebts",     render: renderFriendsDebtsSection },
    { key: "budgetCalculator", render: renderBudgetCalculatorSection },
    { key: "personalAccounts", render: renderPersonalAccountsSection }
];
