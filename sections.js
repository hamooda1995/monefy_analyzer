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
// كاشف ذكي: يجمّع المصاريف المتكررة (نفس الوصف بعد التطبيع) عبر أشهر مختلفة
function renderSubscriptionsSection(data) {
    const boxId = "subscription_body_box";

    // تطبيع الوصف للمقارنة (حروف صغيرة + إزالة المسافات الزائدة)
    const normalize = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

    // تجميع الصفوف حسب الوصف المطبّع
    const groups = {}; // normDesc -> { display, months:Set, amounts:[], categories:Set, lastDate, lastMonthKey, total }
    let maxMonthKey = "";
    AppState.parsedRowsData.forEach((row) => {
        if (row.monthKey > maxMonthKey) maxMonthKey = row.monthKey;
        const norm = normalize(row.description);
        if (!norm || norm === "بدون وصف") return;
        if (!groups[norm]) {
            groups[norm] = {
                display: row.description,
                months: new Set(),
                amounts: [],
                categories: new Set(),
                lastDate: row.date,
                lastMonthKey: row.monthKey,
                total: 0
            };
        }
        const g = groups[norm];
        g.months.add(row.monthKey);
        g.amounts.push(row.amount || 0);
        g.categories.add(row.category);
        g.total += row.amount || 0;
        if (row.date > g.lastDate) g.lastDate = row.date;
        if (row.monthKey > g.lastMonthKey) g.lastMonthKey = row.monthKey;
    });

    // المتكرر = ظهر في شهرين مختلفين على الأقل
    // الترتيب: عدد الأشهر تنازلياً أولاً (الأكثر تكراراً)، ثم المتوسط الشهري
    // الحالة: نشط = ظهر خلال آخر شهرين | متوقف = مرّ شهران كاملان بدون ظهور
    const monthIndex = (mk) => {
        const parts = (mk || "").split("-").map(Number);
        return parts[0] * 12 + (parts[1] - 1);
    };
    const maxMonthIdx = monthIndex(maxMonthKey);

    const recurring = Object.values(groups)
        .filter((g) => g.months.size >= 2)
        .map((g) => ({
            ...g,
            avg: g.total / g.months.size,
            monthCount: g.months.size,
            isActive: maxMonthIdx - monthIndex(g.lastMonthKey) <= 1
        }))
        .sort((a, b) => {
            if (b.monthCount !== a.monthCount) return b.monthCount - a.monthCount;
            return b.avg - a.avg;
        });

    // الإجمالي الشهري يشمل الاشتراكات النشطة فقط (المتوقفة لا تُحتسب كالتزام حالي)
    const grandMonthly = recurring.filter((g) => g.isActive).reduce((s, g) => s + g.avg, 0);

    let rowsHtml = "";
    recurring.forEach((g) => {
        const cat = Array.from(g.categories).join("، ");
        const lastStr = `${g.lastDate.getDate()}/${g.lastDate.getMonth() + 1}/${g.lastDate.getFullYear()}`;
        const statusBadge = g.isActive
            ? `<span class='budget-badge budget-ok'>🟢 نشط</span>`
            : `<span class='budget-badge budget-warn'>⏸️ متوقف</span>`;
        rowsHtml += `<tr>
            <td style='font-weight: bold;'>🔄 ${g.display}</td>
            <td>${cat}</td>
            <td style='text-align:center;'>${g.monthCount} أشهر</td>
            <td style='font-weight: bold;'>$${formatMoney(g.avg)}</td>
            <td>$${formatMoney(g.total)}</td>
            <td style='text-align:center;'>${lastStr}</td>
            <td style='text-align:center;'>${statusBadge}</td>
        </tr>`;
    });

    let bodyContent;
    if (recurring.length) {
        bodyContent = `
            <div style='text-align:center; margin-bottom:15px;'>
                <span class='budget-badge budget-warn' style='font-size:13pt;'>💸 إجمالي الالتزامات الشهرية المتكررة: $${formatMoney(grandMonthly)}</span>
            </div>
            <div class='table-responsive-wrapper'>
            <table>
                <tr><th>الوصف</th><th>التصنيف</th><th>التكرار</th><th>المتوسط / شهر</th><th>الإجمالي</th><th>آخر ظهور</th><th>الحالة</th></tr>
                ${rowsHtml}
            </table>
        </div>`;
    } else {
        bodyContent = `<p style='text-align:center;'>لم يتم اكتشاف أي نفقات أو اشتراكات متكررة في هذه الفترة يا حمودة.</p>`;
    }

    return `<div class='global-block-wrapper' style='border: 2px solid #319795; margin-top: 35px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 📦 كاشف الاشتراكات الثابتة والمصاريف الدورية المتكررة
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

// --- القسم: مقارنة إنفاق آخر شهر مع متوسط كامل فترة التحليل ---
// يقارن إنفاق آخر شهر بالبيانات مع متوسط إنفاق كل الأشهر السابقة لكل تصنيف
function renderBenchmarkSection(data) {
    const boxId = "benchmark_body_box";

    // monthKey -> category -> sum
    const monthCat = {};
    const monthSet = new Set();
    AppState.parsedRowsData.forEach((row) => {
        if (!monthCat[row.monthKey]) monthCat[row.monthKey] = {};
        monthCat[row.monthKey][row.category] = (monthCat[row.monthKey][row.category] || 0) + (row.amount || 0);
        monthSet.add(row.monthKey);
    });

    const months = Array.from(monthSet).sort();
    if (months.length < 2) {
        return `<div class='global-block-wrapper' style='border: 2px solid #DD6B20; margin-top: 25px;'>
            <h2 style='color:#DD6B20; text-align:center;'>📈 مقارنة الإنفاق مع المتوسط</h2>
            <p style='text-align:center; color:var(--text-muted);'>تحتاج بيانات شهرين على الأقل لإجراء المقارنة يا حمودة.</p>
        </div>`;
    }

    const latest = months[months.length - 1];
    const prevMonths = months.slice(0, -1); // كل الأشهر السابقة (كامل فترة التحليل)
    const prevCount = prevMonths.length;
    const latestCats = monthCat[latest] || {};

    // كل التصنيفات التي ظهرت بالشهر الحالي أو أي شهر سابق
    const allCats = new Set(Object.keys(latestCats));
    prevMonths.forEach((mk) => Object.keys(monthCat[mk] || {}).forEach((c) => allCats.add(c)));

    let currentTotal = 0;
    let prevAvgTotal = 0;
    const items = [];

    Array.from(allCats).forEach((cat) => {
        const current = latestCats[cat] || 0;
        const prevSum = prevMonths.reduce((s, mk) => s + ((monthCat[mk] || {})[cat] || 0), 0);
        const prevAvg = prevSum / prevCount;
        if (current === 0 && prevAvg === 0) return;

        currentTotal += current;
        prevAvgTotal += prevAvg;

        let badge = "";
        if (prevAvg === 0) {
            badge = `<span class='budget-badge budget-warn'>🆕 جديد</span>`;
        } else {
            const pct = ((current - prevAvg) / prevAvg) * 100;
            if (pct > 10) badge = `<span class='budget-badge budget-over'>📈 +${pct.toFixed(0)}%</span>`;
            else if (pct < -10) badge = `<span class='budget-badge budget-ok'>📉 ${pct.toFixed(0)}%</span>`;
            else badge = `<span class='budget-badge budget-ok'>➡️ ${pct.toFixed(0)}%</span>`;
        }

        items.push({ cat, current, prevAvg, badge });
    });

    // ترتيب: الأعلى إنفاقاً بالشهر الحالي أولاً
    items.sort((a, b) => b.current - a.current);

    const rowsHtml = items.map((it) => `<tr>
        <td style='font-weight: bold;'>📁 ${it.cat}</td>
        <td style='font-weight: bold;'>$${formatMoney(it.current)}</td>
        <td>$${formatMoney(it.prevAvg)}</td>
        <td style='text-align:center;'>${it.badge}</td>
    </tr>`).join("");

    // إجمالي الشهر الحالي مقابل متوسط كل الأشهر السابقة
    let totalBadge = "";
    if (prevAvgTotal > 0) {
        const totalPct = ((currentTotal - prevAvgTotal) / prevAvgTotal) * 100;
        if (totalPct > 10) totalBadge = `<span class='budget-badge budget-over'>📈 +${totalPct.toFixed(1)}%</span>`;
        else if (totalPct < -10) totalBadge = `<span class='budget-badge budget-ok'>📉 ${totalPct.toFixed(1)}%</span>`;
        else totalBadge = `<span class='budget-badge budget-ok'>➡️ ${totalPct.toFixed(1)}%</span>`;
    }

    return `<div class='global-block-wrapper' style='border: 2px solid #DD6B20; margin-top: 25px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 📈 مقارنة إنفاق آخر شهر مع متوسط كامل الفترة
        </h2>
        <p style='text-align:center; color:var(--text-muted); font-size:14px; margin-bottom:20px;'>
            إنفاق شهر <strong>${latest}</strong> (مجموع كل المصاريف خلال هذا الشهر) مقابل متوسط إنفاق <strong>${prevCount}</strong> أشهر سابقة: ${prevMonths.join("، ")}
        </p>
        <div id='${boxId}' style='display: none;'>
        <div class='table-responsive-wrapper'><table>
            <tr><th>التصنيف</th><th>إنفاق ${latest}</th><th>متوسط ${prevCount} أشهر سابقة</th><th>التغيّر</th></tr>
            ${rowsHtml}
            <tr class='category-total-row'>
                <td style='font-weight: bold;'>── الإجمالي الكلي</td>
                <td style='font-weight: bold;'>$${formatMoney(currentTotal)}</td>
                <td style='font-weight: bold;'>$${formatMoney(prevAvgTotal)}</td>
                <td style='text-align:center;'>${totalBadge}</td>
            </tr>
        </table></div></div></div>`;
}

// --- القسم: اتجاهات المصاريف عبر الأشهر ---
// يعرض إجمالي المصاريف لكل شهر كأعمدة بيانية + جدول بالتغيّر الشهري والمقارنة بالمتوسط
function renderExpenseTrendsSection(data) {
    const boxId = "expense_trends_body_box";

    // إجمالي المصاريف لكل شهر
    const monthExpenses = {};
    AppState.parsedRowsData.forEach((row) => {
        monthExpenses[row.monthKey] = (monthExpenses[row.monthKey] || 0) + (row.amount || 0);
    });

    const months = Object.keys(monthExpenses).sort();
    if (months.length < 2) {
        return `<div class='global-block-wrapper' style='border: 2px solid #E53E3E; margin-top: 25px;'>
            <h2 style='color:#E53E3E; text-align:center;'>📉 اتجاهات المصاريف</h2>
            <p style='text-align:center; color:var(--text-muted);'>تحتاج بيانات شهرين على الأقل لعرض الاتجاه يا حمودة.</p>
        </div>`;
    }

    const values = months.map((mk) => monthExpenses[mk]);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const avgVal = values.reduce((a, b) => a + b, 0) / values.length;
    const highestIdx = values.indexOf(maxVal);
    const lowestIdx = values.indexOf(minVal);

    // الاتجاه العام: من أول شهر لآخر شهر
    const firstVal = values[0];
    const lastVal = values[values.length - 1];
    const overallPct = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
    const trendIcon = overallPct > 5 ? "📈" : overallPct < -5 ? "📉" : "➡️";
    const trendColor = overallPct > 5 ? "#E53E3E" : overallPct < -5 ? "#38A169" : "#718096";

    // أعمدة بيانية (أخضر = تحت المتوسط، أحمر = فوق المتوسط)
    let barsHtml = "";
    months.forEach((mk, i) => {
        const val = values[i];
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const barColor = val > avgVal
            ? "linear-gradient(90deg,#E53E3E,#FC8181)"
            : "linear-gradient(90deg,#38A169,#68D391)";
        barsHtml += `<div class='chart-bar-row'>
            <div class='chart-label'>${mk}</div>
            <div class='chart-bar-container'>
                <div class='chart-bar-fill' style='width:${pct.toFixed(1)}%; background:${barColor};'></div>
            </div>
            <div class='chart-value'>$${formatMoney(val)}</div>
        </div>`;
    });

    // جدول: التغيّر عن الشهر السابق + المقارنة بالمتوسط
    let rowsHtml = "";
    months.forEach((mk, i) => {
        const val = values[i];
        let momBadge = `<span style='color:var(--text-muted);'>—</span>`;
        if (i > 0) {
            const prev = values[i - 1];
            const pct = prev > 0 ? ((val - prev) / prev) * 100 : 0;
            if (pct > 10) momBadge = `<span class='budget-badge budget-over'>📈 +${pct.toFixed(0)}%</span>`;
            else if (pct < -10) momBadge = `<span class='budget-badge budget-ok'>📉 ${pct.toFixed(0)}%</span>`;
            else momBadge = `<span class='budget-badge budget-ok'>➡️ ${pct.toFixed(0)}%</span>`;
        }
        const vsAvg = avgVal > 0 ? ((val - avgVal) / avgVal) * 100 : 0;
        const vsAvgBadge = vsAvg > 10
            ? `<span class='budget-badge budget-over'>+${vsAvg.toFixed(0)}%</span>`
            : `<span class='budget-badge budget-ok'>${vsAvg.toFixed(0)}%</span>`;
        rowsHtml += `<tr>
            <td style='font-weight: bold;'>${mk}</td>
            <td style='font-weight: bold;'>$${formatMoney(val)}</td>
            <td style='text-align:center;'>${momBadge}</td>
            <td style='text-align:center;'>${vsAvgBadge}</td>
        </tr>`;
    });

    return `<div class='global-block-wrapper' style='border: 2px solid #E53E3E; margin-top: 25px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 📉 اتجاهات المصاريف عبر الأشهر
        </h2>
        <p style='text-align:center; color:var(--text-muted); font-size:14px; margin-bottom:20px;'>إجمالي المصاريف لكل شهر — الأخضر = تحت المتوسط، الأحمر = فوق المتوسط</p>
        <div id='${boxId}' style='display: none;'>
        <div class='month-stats-grid'>
            <div class='month-stat-card'><div class='stat-label'>📊 متوسط شهري</div><div class='stat-value'>$${formatMoney(avgVal)}</div></div>
            <div class='month-stat-card'><div class='stat-label'>🔺 أعلى شهر</div><div class='stat-value' style='color:#E53E3E;'>$${formatMoney(maxVal)} (${months[highestIdx]})</div></div>
            <div class='month-stat-card'><div class='stat-label'>🔻 أقل شهر</div><div class='stat-value' style='color:#38A169;'>$${formatMoney(minVal)} (${months[lowestIdx]})</div></div>
            <div class='month-stat-card'><div class='stat-label'>${trendIcon} الاتجاه العام</div><div class='stat-value' style='color:${trendColor};'>${overallPct >= 0 ? "+" : ""}${overallPct.toFixed(1)}%</div></div>
        </div>
        <div class='native-chart-wrapper' style='margin-top:15px;'>
            ${barsHtml}
        </div>
        <div class='table-responsive-wrapper' style='margin-top:15px;'><table>
            <tr><th>الشهر</th><th>إجمالي المصاريف</th><th>التغيّر عن الشهر السابق</th><th>مقارنة بالمتوسط</th></tr>
            ${rowsHtml}
        </table></div></div></div>`;
}

// --- القسم: مؤشر الادخار (Savings Rate) ---
// نسبة الادخار = (الدخل - المصاريف) / الدخل × 100 لكل شهر
function renderSavingsRateSection(data) {
    const boxId = "savings_rate_body_box";

    // مصاريف كل شهر
    const monthExpenses = {};
    AppState.parsedRowsData.forEach((row) => {
        monthExpenses[row.monthKey] = (monthExpenses[row.monthKey] || 0) + (row.amount || 0);
    });

    // كل الأشهر: اتحاد أشهر المصاريف وأشهر الرواتب وأشهر تدفق الديون
    const monthSet = new Set([
        ...Object.keys(monthExpenses),
        ...Object.keys(data.monthlySalary || {}),
        ...Object.keys(AppState.debtMonthlyFlows || {})
    ]);
    const months = Array.from(monthSet).sort();

    if (!months.length) {
        return `<div class='global-block-wrapper' style='border: 2px solid #38A169; margin-top: 25px;'>
            <h2 style='color:#38A169; text-align:center;'>💰 مؤشر الادخار</h2>
            <p style='text-align:center; color:var(--text-muted);'>لا توجد بيانات كافية لحساب مؤشر الادخار.</p>
        </div>`;
    }

    // تقييم نسبة الادخار
    const rateBadge = (rate) => {
        if (rate < 0) return `<span class='budget-badge budget-over'>🔴 عجز (${rate.toFixed(0)}%)</span>`;
        if (rate < 10) return `<span class='budget-badge budget-warn'>🟠 ضعيف (${rate.toFixed(0)}%)</span>`;
        if (rate < 20) return `<span class='budget-badge budget-warn'>🟡 متوسط (${rate.toFixed(0)}%)</span>`;
        if (rate < 30) return `<span class='budget-badge budget-ok'>🟢 جيد (${rate.toFixed(0)}%)</span>`;
        return `<span class='budget-badge budget-ok'>💎 ممتاز (${rate.toFixed(0)}%)</span>`;
    };

    let rowsHtml = "";
    let totalSalary = 0, totalCsvAdd = 0, totalManualAdd = 0, totalDebtIn = 0, totalDebtOut = 0, totalExpenses = 0, monthsWithIncome = 0;

    months.forEach((mk) => {
        const salary = (data.monthlySalary && data.monthlySalary[mk]) || 0;
        const csvAdd = (AppState.csvPositiveAdditions && AppState.csvPositiveAdditions[mk]) || 0;
        const manualAdd = (AppState.monthAdditions && AppState.monthAdditions[mk]) || 0;
        const additions = csvAdd + manualAdd; // الإضافات = تلقائية من CSV + يدوية

        // تدفق الديون الفعلي هالشهر: داخلة (محصلة + دين جديد) / خارجة (مسددة + مقرضة)
        const df = (AppState.debtMonthlyFlows && AppState.debtMonthlyFlows[mk]) || { collected: 0, newDebt: 0, repaid: 0, lent: 0 };
        const debtIn = (df.collected || 0) + (df.newDebt || 0);
        const debtOut = (df.repaid || 0) + (df.lent || 0);

        const income = salary + additions + debtIn; // الدخل = راتب + إضافات + ديون داخلة
        const expenses = (monthExpenses[mk] || 0) + debtOut; // المصاريف = مصاريف + ديون خارجة
        const remaining = income - expenses;
        const rate = income > 0 ? (remaining / income) * 100 : null;

        if (income > 0) {
            totalSalary += salary;
            totalCsvAdd += csvAdd;
            totalManualAdd += manualAdd;
            totalDebtIn += debtIn;
            totalDebtOut += debtOut;
            totalExpenses += expenses;
            monthsWithIncome++;
        }

        const rateCell = rate === null
            ? `<span style='color:var(--text-muted);'>— (لا يوجد دخل مكتشف)</span>`
            : rateBadge(rate);

        rowsHtml += `<tr>
            <td style='font-weight: bold;'>${mk}</td>
            <td>$${formatMoney(salary)}</td>
            <td>$${formatMoney(csvAdd)}</td>
            <td>$${formatMoney(manualAdd)}</td>
            <td style='color:#38A169;'>+$${formatMoney(debtIn)}</td>
            <td>$${formatMoney(monthExpenses[mk] || 0)}</td>
            <td style='color:#E53E3E;'>−$${formatMoney(debtOut)}</td>
            <td style='font-weight: bold; color: ${remaining >= 0 ? "#38A169" : "#E53E3E"};'>$${formatMoney(remaining)}</td>
            <td style='text-align:center;'>${rateCell}</td>
        </tr>`;
    });

    // المتوسط العام عبر كل الأشهر التي فيها دخل
    const totalIncome = totalSalary + totalCsvAdd + totalManualAdd + totalDebtIn;
    const overallRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : null;
    const overallBadge = overallRate === null ? "" : rateBadge(overallRate);

    return `<div class='global-block-wrapper' style='border: 2px solid #38A169; margin-top: 25px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 💰 مؤشر الادخار (Savings Rate)
        </h2>
        <p style='text-align:center; color:var(--text-muted); font-size:14px; margin-bottom:20px;'>نسبة الادخار = (الدخل − المصاريف) ÷ الدخل × 100 — الدخل = راتب + إضافات CSV + إضافات يدوية + ديون محصلة — المصاريف = مصاريف + ديون مسددة — القاعدة الذهبية: 20% فأكثر</p>
        <div id='${boxId}' style='display: none;'>
        <div class='table-responsive-wrapper'><table>
            <tr><th>الشهر</th><th>الراتب</th><th>إضافات CSV</th><th>إضافات يدوية</th><th>ديون داخلة</th><th>المصاريف</th><th>ديون خارجة</th><th>المتبقي</th><th>نسبة الادخار</th></tr>
            ${rowsHtml}
            <tr class='category-total-row'>
                <td style='font-weight: bold;'>── المتوسط العام (${monthsWithIncome} شهر)</td>
                <td style='font-weight: bold;'>$${formatMoney(totalSalary)}</td>
                <td style='font-weight: bold;'>$${formatMoney(totalCsvAdd)}</td>
                <td style='font-weight: bold;'>$${formatMoney(totalManualAdd)}</td>
                <td style='font-weight: bold; color:#38A169;'>+$${formatMoney(totalDebtIn)}</td>
                <td style='font-weight: bold;'>$${formatMoney(totalExpenses - totalDebtOut)}</td>
                <td style='font-weight: bold; color:#E53E3E;'>−$${formatMoney(totalDebtOut)}</td>
                <td style='font-weight: bold;'>$${formatMoney(totalIncome - totalExpenses)}</td>
                <td style='text-align:center;'>${overallBadge}</td>
            </tr>
        </table></div></div></div>`;
}

// --- القسم: توقع نهاية الشهر (Month-End Projection) ---
// يتوقع إجمالي مصاريف آخر شهر بناءً على الإيقاع الحالي (المصروف ÷ الأيام المنقضية × أيام الشهر)
function renderProjectionSection(data) {
    const boxId = "projection_body_box";

    // جمع بيانات كل شهر: المجموع + آخر تاريخ معاملة
    const monthStats = {}; // monthKey -> { total, lastDate }
    AppState.parsedRowsData.forEach((row) => {
        if (!monthStats[row.monthKey]) monthStats[row.monthKey] = { total: 0, lastDate: row.date };
        monthStats[row.monthKey].total += row.amount || 0;
        if (row.date > monthStats[row.monthKey].lastDate) monthStats[row.monthKey].lastDate = row.date;
    });

    const months = Object.keys(monthStats).sort();
    if (!months.length) {
        return `<div class='global-block-wrapper' style='border: 2px solid #805AD5; margin-top: 25px;'>
            <h2 style='color:#805AD5; text-align:center;'>🔮 توقع نهاية الشهر</h2>
            <p style='text-align:center; color:var(--text-muted);'>لا توجد بيانات كافية للتوقع.</p>
        </div>`;
    }

    const latest = months[months.length - 1];
    const stats = monthStats[latest];
    const [year, month] = latest.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = Math.max(stats.lastDate.getDate(), 1);
    const dailyAvg = stats.total / daysElapsed;
    const projected = dailyAvg * daysInMonth;

    // متوسط مصاريف الأشهر السابقة
    const prevTotals = months.slice(0, -1).map((mk) => monthStats[mk].total);
    const prevAvg = prevTotals.length ? prevTotals.reduce((a, b) => a + b, 0) / prevTotals.length : 0;

    // دخل الشهر الحالي (راتب + إضافات CSV + إضافات يدوية)
    const salary = (data.monthlySalary && data.monthlySalary[latest]) || 0;
    const csvAdd = (AppState.csvPositiveAdditions && AppState.csvPositiveAdditions[latest]) || 0;
    const manualAdd = (AppState.monthAdditions && AppState.monthAdditions[latest]) || 0;
    const income = salary + csvAdd + manualAdd;

    // حساب المدور (carryover) المتاح للشهر الحالي:
    // نفس منطق الأوعية — فائض كل شهر = الدخل + المدور + الإضافات − المصاريف، والسالب يُصفَّر
    let carryover = parseFloat(document.getElementById("initial-carryover-input")?.value) || 0;
    months.slice(0, -1).forEach((mk) => {
        const incM = (data.monthlySalary?.[mk] || 0)
            + (AppState.csvPositiveAdditions?.[mk] || 0)
            + (AppState.monthAdditions?.[mk] || 0);
        const surplus = incM + carryover - (monthStats[mk].total || 0);
        carryover = surplus > 0 ? surplus : 0;
    });

    // المتوقع المعدّل: 20% إيقاع خطي + 80% متوسط الأشهر السابقة (أدق للعمليات لمرة وحدة)
    const blendedProjected = prevAvg > 0 ? (0.2 * projected + 0.8 * prevAvg) : projected;

    // تدفق الديون الفعلي هالشهر فقط (مش الأرصدة القائمة):
    // collected = استلمت من ديون | newDebt = استلمت دين جديد | repaid = سددت دين | lent = أقرضت
    const debtFlow = (AppState.debtMonthlyFlows && AppState.debtMonthlyFlows[latest]) || { collected: 0, newDebt: 0, repaid: 0, lent: 0 };
    const netDebtFlow = (debtFlow.collected + debtFlow.newDebt) - (debtFlow.repaid + debtFlow.lent);

    const available = income + carryover + netDebtFlow; // المتاح = الدخل + المدور + صافي تدفق الديون الفعلي
    const projectedRemaining = available - blendedProjected;
    const projectedRate = income > 0 ? ((income - blendedProjected) / income) * 100 : null;

    // تنبيهات ذكية
    let alertsHtml = "";
    if (available > 0 && blendedProjected > available) {
        alertsHtml += `<div class='budget-badge budget-over' style='font-size:13pt; display:block; margin:6px auto; width:fit-content;'>🔴 متوقع عجز: المصاريف المتوقعة بتتجاوز المتاح بـ $${formatMoney(blendedProjected - available)}</div>`;
    } else if (prevAvg > 0 && blendedProjected > prevAvg * 1.1) {
        alertsHtml += `<div class='budget-badge budget-warn' style='font-size:13pt; display:block; margin:6px auto; width:fit-content;'>⚠️ متوقع تجاوز متوسط الإنفاق السابق بأكثر من 10%</div>`;
    } else if (projectedRate !== null && projectedRate >= 20) {
        alertsHtml += `<div class='budget-badge budget-ok' style='font-size:13pt; display:block; margin:6px auto; width:fit-content;'>🟢 وتيرة ادخار ممتازة متوقعة (${projectedRate.toFixed(0)}%)</div>`;
    } else {
        alertsHtml += `<div class='budget-badge budget-ok' style='font-size:13pt; display:block; margin:6px auto; width:fit-content;'>✅ وتيرة الإنفاق ضمن المعدل الطبيعي</div>`;
    }

    // متوسطات التصنيفات التاريخية (الأشهر السابقة) لتحسين توقع كل تصنيف
    const catHist = {}; // cat -> { total, months:Set }
    AppState.parsedRowsData.forEach((row) => {
        if (row.monthKey === latest) return;
        if (!catHist[row.category]) catHist[row.category] = { total: 0, months: new Set() };
        catHist[row.category].total += row.amount || 0;
        catHist[row.category].months.add(row.monthKey);
    });
    const catHistAvg = {};
    Object.keys(catHist).forEach((cat) => {
        catHistAvg[cat] = catHist[cat].total / catHist[cat].months.size;
    });

    // أعلى التصنيفات إنفاقاً هذا الشهر مع توقعها (60% إيقاع خطي + 40% متوسط تاريخي)
    const catMonth = {};
    AppState.parsedRowsData.forEach((row) => {
        if (row.monthKey !== latest) return;
        catMonth[row.category] = (catMonth[row.category] || 0) + (row.amount || 0);
    });
    const topCats = Object.entries(catMonth)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([cat, sum]) => {
            const linear = (sum / daysElapsed) * daysInMonth;
            const hist = catHistAvg[cat];
            const catProjected = hist ? (0.2 * linear + 0.8 * hist) : linear;
            return `<tr>
                <td style='font-weight: bold;'>📁 ${cat}</td>
                <td>$${formatMoney(sum)}</td>
                <td>$${formatMoney(catProjected)}</td>
            </tr>`;
        }).join("");

    const rateBadge = projectedRate === null
        ? `<span style='color:var(--text-muted);'>— (لا يوجد دخل مكتشف)</span>`
        : projectedRate < 0
            ? `<span class='budget-badge budget-over'>🔴 عجز متوقع (${projectedRate.toFixed(0)}%)</span>`
            : projectedRate < 10
                ? `<span class='budget-badge budget-warn'>🟠 ضعيف متوقع (${projectedRate.toFixed(0)}%)</span>`
                : projectedRate < 20
                    ? `<span class='budget-badge budget-warn'>🟡 متوسط متوقع (${projectedRate.toFixed(0)}%)</span>`
                    : `<span class='budget-badge budget-ok'>🟢 جيد+ متوقع (${projectedRate.toFixed(0)}%)</span>`;

    return `<div class='global-block-wrapper' style='border: 2px solid #805AD5; margin-top: 25px;'>
        <h2 onclick="toggleSectionBox('${boxId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 🔮 توقع نهاية الشهر
        </h2>
        <p style='text-align:center; color:var(--text-muted); font-size:14px; margin-bottom:20px;'>
            شهر <strong>${latest}</strong>: المصروف حتى الآن $${formatMoney(stats.total)} خلال ${daysElapsed} يوم (من ${daysInMonth}) — التوقع = المصروف ÷ الأيام المنقضية × أيام الشهر
        </p>
        <div id='${boxId}' style='display: none;'>
        ${alertsHtml}
        <div class='table-responsive-wrapper'><table>
            <tr><th>البند</th><th>القيمة</th></tr>
            <tr><td>💸 المصروف حتى الآن (${daysElapsed} يوم)</td><td style='font-weight: bold;'>$${formatMoney(stats.total)}</td></tr>
            <tr><td>📊 المتوسط اليومي</td><td style='font-weight: bold;'>$${formatMoney(dailyAvg)}</td></tr>
            <tr><td>🔮 المتوقع الخطي (نفس الإيقاع)</td><td>$${formatMoney(projected)}</td></tr>
            <tr><td>📈 متوسط مصاريف الأشهر السابقة (${prevTotals.length} شهر)</td><td>$${formatMoney(prevAvg)}</td></tr>
            <tr><td>🎯 المتوقع المعدّل (20% إيقاع + 80% تاريخي)</td><td style='font-weight: bold; font-size:14pt;'>$${formatMoney(blendedProjected)}</td></tr>
            <tr><td>💰 الدخل المتوقع (راتب + إضافات)</td><td>$${formatMoney(income)}</td></tr>
            <tr><td>🔁 المدور من الأشهر السابقة</td><td>$${formatMoney(carryover)}</td></tr>
            <tr><td>👥 ديون محصلة فعلياً هالشهر</td><td style='color:#38A169;'>+$${formatMoney(debtFlow.collected)}</td></tr>
            <tr><td>👥 ديون جديدة مستلمة هالشهر</td><td style='color:#38A169;'>+$${formatMoney(debtFlow.newDebt)}</td></tr>
            <tr><td>👥 ديون مسددة (دفعت) هالشهر</td><td style='color:#E53E3E;'>−$${formatMoney(debtFlow.repaid)}</td></tr>
            <tr><td>👥 قروض أعطيتها هالشهر</td><td style='color:#E53E3E;'>−$${formatMoney(debtFlow.lent)}</td></tr>
            <tr><td>⚖️ صافي تدفق الديون هالشهر</td><td style='font-weight: bold;'>${netDebtFlow >= 0 ? "+" : "−"}$${formatMoney(Math.abs(netDebtFlow))}</td></tr>
            <tr><td>💵 المتاح المتوقع (دخل + مدور + صافي ديون)</td><td style='font-weight: bold;'>$${formatMoney(available)}</td></tr>
            <tr><td>🧮 المتبقي المتوقع</td><td style='font-weight: bold; color: ${projectedRemaining >= 0 ? "#38A169" : "#E53E3E"};'>$${formatMoney(projectedRemaining)}</td></tr>
            <tr><td>💰 نسبة الادخار المتوقعة</td><td style='text-align:center;'>${rateBadge}</td></tr>
        </table></div>
        ${topCats ? `<h3 style='text-align:center; margin-top:25px; color:var(--text-header);'>🏆 أعلى التصنيفات إنفاقاً — التوقع لنهاية الشهر</h3>
        <p style='text-align:center; color:var(--text-muted); font-size:12px; margin-bottom:10px;'>التوقع لكل تصنيف = 20% إيقاع خطي + 80% متوسط التصنيف بالأشهر السابقة</p>
        <div class='table-responsive-wrapper'><table>
            <tr><th>التصنيف</th><th>المصروف حتى الآن</th><th>المتوقع لنهاية الشهر</th></tr>
            ${topCats}
        </table></div>` : ""}
        </div></div>`;
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
    { key: "benchmark",        render: renderBenchmarkSection },
    { key: "expenseTrends",   render: renderExpenseTrendsSection },
    { key: "savingsRate",      render: renderSavingsRateSection },
    { key: "projection",       render: renderProjectionSection },
    { key: "friendsDebts",     render: renderFriendsDebtsSection },
    { key: "budgetCalculator", render: renderBudgetCalculatorSection },
    { key: "personalAccounts", render: renderPersonalAccountsSection }
];
