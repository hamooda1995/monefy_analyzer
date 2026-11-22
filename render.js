/**
 * 🖥️ توليد واجهة النتائج (Rendering)
 * ---------------------------------------------------------------
 * يجمع بيانات AppState.parsedRowsData ويبني:
 * - بطاقات KPI
 * - قسم كل شهر (جدول + مخطط + أظرف)
 * - المخطط التحليلي الشامل
 * - أقسام التقارير العامة (عبر ReportSectionsRegistry)
 */

function recalculateAndRenderUI() {
    // ===== 1) تجميع البيانات =====
    let monthlyAnalysis = {};
    let globalCategorySums = {};
    let descriptionMonths = {};
    let descriptionAmounts = {};

    AppState.categoryMonthsTracker = {};
    AppState.categoryAmountsTracker = {};
    AppState.descriptionMaxDateTracker = {};

    let totalAllExpenses = 0;

    AppState.parsedRowsData.forEach((row) => {
        totalAllExpenses += row.amount;

        if (!monthlyAnalysis[row.monthKey]) monthlyAnalysis[row.monthKey] = {};
        if (!monthlyAnalysis[row.monthKey][row.category]) monthlyAnalysis[row.monthKey][row.category] = {};
        let dateKey = `${row.monthKey}_${row.category}_${row.description}`;
        if (
            !AppState.descriptionMaxDateTracker[dateKey] ||
            row.date > AppState.descriptionMaxDateTracker[dateKey]
        ) {
            AppState.descriptionMaxDateTracker[dateKey] = row.date;
        }

        monthlyAnalysis[row.monthKey][row.category][row.description] =
            (monthlyAnalysis[row.monthKey][row.category][row.description] || 0) + row.amount;

        globalCategorySums[row.category] = (globalCategorySums[row.category] || 0) + row.amount;

        if (row.description !== "بدون وصف") {
            if (!descriptionMonths[row.description]) descriptionMonths[row.description] = new Set();
            descriptionMonths[row.description].add(row.monthKey);
            if (!descriptionAmounts[row.description]) descriptionAmounts[row.description] = [];
            descriptionAmounts[row.description].push(row.amount);
        }

        if (!AppState.categoryMonthsTracker[row.category])
            AppState.categoryMonthsTracker[row.category] = new Set();
        AppState.categoryMonthsTracker[row.category].add(row.monthKey);

        if (!AppState.categoryAmountsTracker[row.category]) AppState.categoryAmountsTracker[row.category] = [];
        AppState.categoryAmountsTracker[row.category].push(row.amount);
    });

    const resultsContainer = document.getElementById("resultsContainer");
    resultsContainer.innerHTML = "";
    resultsContainer.style.display = "block";

    // إنشاء Fragment لتخزين العناصر مؤقتاً في الذاكرة بعيداً عن DOM
    const fragment = document.createDocumentFragment();

    let sortedMonths = Object.keys(monthlyAnalysis).sort();
    if (sortedMonths.length === 0) {
        resultsContainer.innerHTML =
            `<div class='container' style='text-align:center; font-weight:bold; color:#E53E3E; padding:20px;'>` +
            `لم يتم العثور على أي مصاريف مطابقة للفترة المحددة!<br>` +
            `<span style='font-size:13px; font-weight:normal; color:var(--text-muted);'>` +
            `تأكد من: اختيار ملف CSV صحيح، وأن التواريخ تشمل حركات Monefy الفعلية، ` +
            `وأن التصنيفات ليست تحويلات داخلية (To '/From ').</span></div>`;
        return;
    }

    let totalIncomeSum = Object.values(AppState.monthlySalary).reduce((a, b) => a + b, 0);
    let totalAutoAdditionsSum = Object.values(AppState.csvPositiveAdditions).reduce((a, b) => a + b, 0);

    // ===== 2) بطاقات KPI =====
    let kpiHtml = `
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-title">💳 إجمالي المصاريف الشاملة</div>
                <div class="kpi-value" style="color:#E53E3E;">$${formatMoney(totalAllExpenses)}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">💰 إجمالي الرواتب المكتشفة</div>
                <div class="kpi-value" style="color:#38A169;">$${formatMoney(totalIncomeSum)}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">📥 إجمالي الإضافات التلقائية</div>
                <div class="kpi-value" style="color:#3182CE;">$${formatMoney(totalAutoAdditionsSum)}</div>
            </div>
        </div>
    `;

    let kpiWrapper = document.createElement("div");
    kpiWrapper.innerHTML = kpiHtml;
    fragment.appendChild(kpiWrapper);

    // ===== 3) أقسام الأشهر =====
    let runningCarryover = parseFloat(document.getElementById("initial-carryover-input").value) || 0;
    let previousMonthTotal = 0;

    sortedMonths.forEach((monthName, mIdx) => {
        let monthTotal = 0;
        let categoriesMap = monthlyAnalysis[monthName];
        let categorySums = {};

        Object.keys(categoriesMap).forEach((cat) => {
            let sum = Object.values(categoriesMap[cat]).reduce((a, b) => a + b, 0);
            categorySums[cat] = sum;
            monthTotal += sum;
        });

        let monthBlock = document.createElement("div");
        monthBlock.className = "month-block-wrapper";

        let totalMonthContainerId = `total_month_container_${mIdx}`;
        let monthBodyId = `month_body_${mIdx}`;

        let htmlTable = `
            <div style="padding: 12px 15px; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; border: 2px solid #90cdf4;"
                 onclick="toggleSectionBox('${totalMonthContainerId}', this)">
                <span style="font-weight: bold; font-size: 15pt;"><span class="collapse-icon" style="font-family:monospace; margin-left:5px;">▼</span> 🗓️ فترة شهر: ${monthName}</span>
                <table class="month-total-table" style="width: auto; margin: 0; display: inline-table;"><tr class="month-total-row"><td style="background: #2ecc71; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11pt; border: none;">إجمالي حجم الصرف: $${formatMoney(monthTotal)}</td></tr></table>
            </div>

            <div id="${totalMonthContainerId}" style="display: none; margin-top: 15px; border-top: 1px solid #cbd5e0; padding-top: 15px;">`;

        let jarsResult = generateJarsHtmlForMonth(categoriesMap, monthTotal, runningCarryover, monthName);
        htmlTable += jarsResult.html;

        htmlTable += `
        <div class='table-responsive-wrapper'><table>
            <tr class='month-header-row'>
                <td colspan='4' onclick="toggleSectionBox('${monthBodyId}', this)" style="background: #edf2f7; color: #4a5568; font-size: 12pt; border: 1px solid #cbd5e0; padding: 8px;">
                    <button class='toggle-all-btn' onclick="toggleAllCategoriesInMonth('${monthBodyId}', event)">📁 طي/توسيع الكل</button>
                    <span class='collapse-icon'>▼</span> 📋 جدول تفاصيل الدفعات والفواتير لهذا الشهر
                </td>
            </tr>
            <tbody id='${monthBodyId}' style='display: none;'>`;

        let sortedCats = Object.keys(categorySums).sort((a, b) => categorySums[b] - categorySums[a]);
        let chartBodyId = `chart_body_${mIdx}`;

        let chartHtml = `<div class='native-chart-wrapper'><h3 onclick="toggleSectionBox('${chartBodyId}', this)" style='text-align:center; margin-bottom:15px; cursor:pointer; user-select:none;'><span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 📊 التوزيع المرئي لنفقات شهر ${monthName}</h3><div id='${chartBodyId}' style='display:none;'>`;

        sortedCats.forEach((categoryName, cIdx) => {
            let categoryTotal = categorySums[categoryName];
            let categoryPercentage = monthTotal > 0 ? (categoryTotal / monthTotal) * 100 : 0;

            chartHtml += `<div class='chart-bar-row'><div class='chart-label'>📁 ${categoryName}</div><div class='chart-bar-container'><div class='chart-bar-fill' style='width: ${categoryPercentage.toFixed(1)}%;'></div></div><div class='chart-value'>$${formatMoney(categoryTotal)} (${categoryPercentage.toFixed(1)}%)</div></div>`;

            let catRowsClass = `cat_rows_${mIdx}_${cIdx}`;
            htmlTable += `<tr class='category-header-row' onclick="toggleCategorySection('${catRowsClass}', this)" data-target-class='${catRowsClass}'><td colspan='4'><div class='cat-header-flex'><span><span class='collapse-icon'>▼</span> 📁 [${categoryName}]</span>${BudgetManager.progressHtml(categoryName, categoryTotal)}<span style='font-size: 13pt;'>إجمالي القسم: $${formatMoney(categoryTotal)} (${categoryPercentage.toFixed(1)}%)</span></div></td></tr>`;

            let descMap = categoriesMap[categoryName];
            Object.keys(descMap)
                .sort((a, b) => {
                    let dateKeyA = `${monthName}_${categoryName}_${a}`;
                    let dateKeyB = `${monthName}_${categoryName}_${b}`;
                    let dateA = AppState.descriptionMaxDateTracker[dateKeyA] || new Date(0);
                    let dateB = AppState.descriptionMaxDateTracker[dateKeyB] || new Date(0);
                    return dateA - dateB;
                })
                .forEach((descriptionName) => {
                    let amount = descMap[descriptionName];
                    let rowClass = amount >= 50.0 ? " class='alert-row'" : "";

                    let dateKey = `${monthName}_${categoryName}_${descriptionName}`;
                    let maxDate = AppState.descriptionMaxDateTracker[dateKey];
                    let displayDate = monthName;
                    if (maxDate) {
                        displayDate = `${maxDate.getDate()}-${maxDate.getMonth() + 1}-${maxDate.getFullYear()}`;
                    }

                    htmlTable += `<tr${rowClass} name='${catRowsClass}' style='display: none;'><td style='text-align:center;'>${displayDate}</td><td>${categoryName}</td><td>${descriptionName}${amount >= 50.0 ? " ⚠️ [مصروف مرتفع]" : ""}</td><td style='font-weight: bold;'>$${formatMoney(amount)}</td></tr>`;
                });

            htmlTable += `<tr class='category-total-row' name='${catRowsClass}' style='display: none;'><td colspan='3' style='text-align:right; padding-right:30px;'> ── مجموع نفقات [${categoryName}]</td><td style='font-weight: bold;'>$${formatMoney(categoryTotal)}</td></tr>`;
        });

        chartHtml += `</div></div>`;
        let momTrendText =
            previousMonthTotal > 0
                ? monthTotal - previousMonthTotal > 0
                    ? ` 📈 (زيادة عن الشهر السابق)`
                    : ` 📉 (وفر عن الشهر السابق)`
                : " 🏁 [شهر الأساس الأول]";
        htmlTable += `</tbody></table></div>`;

        let totalTableHtml = `<table class='month-total-table'><tr class='month-total-row'><td style='padding-right:20px;'>💰 إجمالي حجم الصرف لشهر (${monthName})${momTrendText}</td><td style='font-weight: bold; width: 150px; text-align: left;'>$${formatMoney(monthTotal)}</td></tr></table>`;

        let monthDataDiv = document.createElement("div");
        monthDataDiv.innerHTML = htmlTable + totalTableHtml + chartHtml + `</div>`;

        monthBlock.appendChild(monthDataDiv);
        fragment.appendChild(monthBlock);

        runningCarryover = jarsResult.monthSurplus > 0 ? jarsResult.monthSurplus : 0;
        previousMonthTotal = monthTotal;
    });

    // ===== 4) المخطط التحليلي الشامل =====
    let globalChartId = `global_chart_body`;
    let globalChartHtml = `<div class='global-block-wrapper'>
        <h2 onclick="toggleSectionBox('${globalChartId}', this)" style='text-align:center; margin-top:10px; cursor:pointer; user-select:none;'>
            <span class='collapse-icon' style='font-size:11pt; margin-left:5px;'>▼</span> 👑 المخطط التحليلي الشامل لكافة الأشهر
        </h2>
        <p style='text-align:center; font-size:14px; margin-bottom:20px;'>يوضح الحجم الإجمالي التراكمي الاستهلاكي لكل تصنيف على مدار كامل فترة الفلترة المشمولة</p>
        <div id='${globalChartId}' style='display: none;'>`;

    let globalTotalAmount = Object.values(globalCategorySums).reduce((a, b) => a + b, 0);
    Object.keys(globalCategorySums)
        .sort((a, b) => globalCategorySums[b] - globalCategorySums[a])
        .forEach((cat) => {
            let amount = globalCategorySums[cat];
            globalChartHtml += `<div class='chart-bar-row'><div class='chart-label'>👑 ${cat}</div><div class='chart-bar-container'><div class='chart-bar-fill' style='width: ${(globalTotalAmount > 0 ? (amount / globalTotalAmount) * 100 : 0).toFixed(1)}%;'></div></div><div class='chart-value'>$${formatMoney(amount)}</div></div>`;
        });
    globalChartHtml += `</div></div>`;

    let globalBlock = document.createElement("div");
    globalBlock.innerHTML = globalChartHtml;
    fragment.appendChild(globalBlock);

    // ===== 5) أقسام التقارير العامة (من sections.js) =====
    const reportData = {
        descriptionMonths: descriptionMonths,
        descriptionAmounts: descriptionAmounts,
        categoryMonthsTracker: AppState.categoryMonthsTracker,
        categoryAmountsTracker: AppState.categoryAmountsTracker,
        friendsDebts: AppState.friendsDebts,
        personalAccounts: AppState.personalAccounts,
        monthlySalary: AppState.monthlySalary
    };

    ReportSectionsRegistry.forEach((section) => {
        let sectionDiv = document.createElement("div");
        sectionDiv.innerHTML = section.render(reportData);
        fragment.appendChild(sectionDiv);
    });

    resultsContainer.appendChild(fragment);
}
