/**
 * 💰 ميزانية التصنيفات الشهرية (Category Budgets)
 * ---------------------------------------------------------------
 * يتيح للمستخدم تحديد سقف إنفاق شهري لكل تصنيف، ثم يعرض نسبة
 * الاستهلاك لحظياً داخل ترويسة كل تصنيف مع تنبيه لوني:
 *   أخضر < 80% | برتقالي 80-100% | أحمر > 100%
 * تُحفظ الميزانيات في localStorage وتُطبَّق على كل شهر.
 */
const BudgetManager = {
    STORAGE_KEY: "hamouda-category-budgets",

    // تحميل الميزانيات المحفوظة إلى AppState (تُستدعى مرة عند بدء التطبيق)
    init() {
        try {
            AppState.categoryBudgets = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch (e) {
            AppState.categoryBudgets = {};
        }
    },

    // حفظ كل الميزانيات دفعة واحدة
    saveAll(budgets) {
        AppState.categoryBudgets = budgets;
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(budgets));
        } catch (e) {
            console.log("تعذّر حفظ الميزانيات في التخزين المحلي");
        }
    },

    // ميزانية تصنيف معيّن (0 إذا لم تُحدد)
    getBudget(category) {
        return (AppState.categoryBudgets && AppState.categoryBudgets[category]) || 0;
    },

    // HTML شارة الميزانية لترويسة التصنيف (فارغ إذا لا توجد ميزانية)
    progressHtml(category, spent) {
        const budget = this.getBudget(category);
        if (!budget || budget <= 0) return "";
        const pct = (spent / budget) * 100;
        const cls = pct >= 100 ? "budget-over" : pct >= 80 ? "budget-warn" : "budget-ok";
        return `<span class="budget-badge ${cls}" title="ميزانية شهرية: $${formatMoney(budget)}">🎯 $${formatMoney(spent)} / $${formatMoney(budget)} (${pct.toFixed(0)}%)</span>`;
    },

    // فتح/إغلاق نافذة إعدادات الميزانية
    toggleModal(show) {
        const modal = document.getElementById("budgetModalOverlay");
        if (!modal) return;
        if (show) this.populateModal();
        modal.style.display = show ? "flex" : "none";
    },

    // ملء النافذة بكل التصنيفات الموجودة في البيانات + متوسط إنفاقها الشهري
    populateModal() {
        const container = document.getElementById("budgetRowsContainer");
        if (!container) return;

        // متوسط الإنفاق الشهري لكل تصنيف (مجموع كل شهر ÷ عدد الأشهر التي ظهر فيها)
        const catMonthSum = {};   // category -> { monthKey: sum }
        const catMonths = {};     // category -> Set<monthKey>
        AppState.parsedRowsData.forEach((r) => {
            const cat = r.category;
            if (!catMonthSum[cat]) {
                catMonthSum[cat] = {};
                catMonths[cat] = new Set();
            }
            catMonthSum[cat][r.monthKey] = (catMonthSum[cat][r.monthKey] || 0) + (r.amount || 0);
            catMonths[cat].add(r.monthKey);
        });

        const categories = Object.keys(catMonthSum).sort((a, b) => {
            const avgA = Object.values(catMonthSum[a]).reduce((s, v) => s + v, 0) / catMonths[a].size;
            const avgB = Object.values(catMonthSum[b]).reduce((s, v) => s + v, 0) / catMonths[b].size;
            return avgB - avgA;
        });

        if (!categories.length) {
            container.innerHTML = "<p style='text-align:center; padding:20px;'>لا توجد بيانات محمّلة بعد — ارفع ملف CSV أولاً.</p>";
            return;
        }

        container.innerHTML = categories.map((cat) => {
            const monthCount = catMonths[cat].size;
            const avg = Object.values(catMonthSum[cat]).reduce((s, v) => s + v, 0) / monthCount;
            const current = this.getBudget(cat);
            return `
                <div class="budget-row">
                    <div class="budget-cat-info">
                        <span class="budget-cat-name">📁 ${cat}</span>
                        <span class="budget-cat-avg">متوسط شهري: $${formatMoney(avg)} (${monthCount} شهر)</span>
                    </div>
                    <input type="number" min="0" step="0.01" class="budget-input"
                           data-category="${cat.replace(/"/g, "&quot;")}"
                           value="${current > 0 ? current : ""}"
                           placeholder="0.00" />
                </div>`;
        }).join("");
    },

    // حفظ الميزانيات من النافذة وإعادة الحساب
    saveFromModal() {
        const inputs = document.querySelectorAll("#budgetRowsContainer .budget-input");
        const budgets = {};
        inputs.forEach((inp) => {
            const cat = inp.getAttribute("data-category");
            const val = parseFloat(inp.value) || 0;
            if (val > 0) budgets[cat] = val;
        });
        this.saveAll(budgets);
        this.toggleModal(false);
        if (typeof recalculateAndRenderUI === "function") recalculateAndRenderUI();
    }
};

// ربط دوال الميزانية بالنافذة العامة للاستدعاء من الـ HTML
window.toggleBudgetModal = (show) => BudgetManager.toggleModal(show);
window.saveBudgetSettings = () => BudgetManager.saveFromModal();
