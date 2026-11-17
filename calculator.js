/**
 * 🧮 آلة حاسبة فئات العملات والنقد
 * ---------------------------------------------------------------
 * نافذة منبثقة تحسب مجموع الفئات النقدية (10، 25، 50...).
 * المستخدم يقدر يضيف فئات مخصصة من الواجهة.
 */
const CurrencyCalculator = {
    toggleModal(show) {
        const modal = document.getElementById("calcModalOverlay");
        if (show) {
            if (document.getElementById("currencyRowsContainer").children.length === 0) {
                this.init();
            }
            modal.style.display = "flex";
        } else {
            modal.style.display = "none";
        }
    },
    init() {
        const container = document.getElementById("currencyRowsContainer");
        container.innerHTML = "";
        AppState.activeDenominations.forEach((denom, idx) => {
            this.appendRowHTML(container, denom, idx);
        });
        this.calculateTotal();
    },
    appendRowHTML(container, val, idx) {
        const row = document.createElement("div");
        row.className = "currency-row";
        row.setAttribute("data-index", idx);

        const isCustom = typeof val === "string" || !AppState.defaultDenominations.includes(val);

        let labelHtml = isCustom
            ? `<input type="number" class="currency-input" style="width: 65px; font-weight: bold; text-align: right;" value="${val}" placeholder="الفئة" oninput="CurrencyCalculator.updateCustomDenom(this, ${idx})">`
            : `<span class="currency-label">فئة ${val}:</span>`;

        row.innerHTML = `
            ${labelHtml}
            <input type="number" min="0" class="currency-input count-input" placeholder="العدد" oninput="CurrencyCalculator.calculateTotal()">
            <span class="currency-subtotal">= 0</span>
        `;
        container.appendChild(row);
    },
    updateCustomDenom(inputEl, idx) {
        let newVal = parseFloat(inputEl.value) || 0;
        AppState.activeDenominations[idx] = newVal;
        this.calculateTotal();
    },
    addRow() {
        const container = document.getElementById("currencyRowsContainer");
        const newIdx = AppState.activeDenominations.length;
        AppState.activeDenominations.push(0);
        this.appendRowHTML(container, 0, newIdx);
    },
    calculateTotal() {
        const rows = document.querySelectorAll("#currencyRowsContainer .currency-row");
        let total = 0;

        rows.forEach((row, i) => {
            let denom = AppState.activeDenominations[i];
            if (typeof denom !== "number" || isNaN(denom)) denom = 0;

            const countInput = row.querySelector(".count-input");
            const count = parseFloat(countInput.value) || 0;
            const subtotal = denom * count;

            row.querySelector(".currency-subtotal").innerText = `= ${formatMoney(subtotal)}`;
            total += subtotal;
        });

        document.getElementById("calcGrandTotal").innerText = `المجموع: ${formatMoney(total)}`;
    },
    reset() {
        AppState.activeDenominations = [...AppState.defaultDenominations];
        this.init();
    }
};

// ربط دوال الحاسبة بالنافذة العامة للاستدعاء السريع من الواجهة
window.toggleCurrencyCalcModal = (show) => CurrencyCalculator.toggleModal(show);
window.addNewCurrencyRow = () => CurrencyCalculator.addRow();
window.resetCurrencyCalc = () => CurrencyCalculator.reset();
