/**
 * 💾 حالة التطبيق المركزية (Application State)
 * ---------------------------------------------------------------
 * كل بيانات التحليل تُخزن هنا. أي قسم أو وظيفة جديدة تقرأ من هنا
 * ولا تعدّل على بنية البيانات الموجودة.
 */
const AppState = {
    // هل تم تحليل البيانات وعرضها؟
    isDataAnalyzed: false,
    // هل تم تحميل ملف CSV مسبقاً؟ (لتجنب إعادة القراءة عند تغيير التواريخ)
    isFileAlreadyLoaded: false,

    // صفوف المصاريف المحللة من الـ CSV
    parsedRowsData: [],

    // حركات حسابات الأرصدة (usd / cash / new cash) — تُستخدم لحساب "وفر الشهر"
    // كل صف: { date, monthKey, account, currency, origAmount, converted, isTransfer }
    accountFlowRows: [],

    // الفترة المحددة من المستخدم (تُستخدم لحصر حساب الوفر)
    periodStart: null,
    periodEnd: null,

    // تجميعات مالية حسب الشهر (monthKey = "YYYY-MM")
    monthlySalary: {},          // الرواتب المكتشفة
    csvPositiveAdditions: {},   // الإضافات الموجبة من الـ CSV
    monthAdditions: {},         // الإضافات اليدوية المدخلة من المستخدم

    // أرصدة ديون الأصدقاء: { accountName: { balance, realBalance, currency } }
    friendsDebts: {},

    // تدفقات الديون الشهرية بين الحسابات الشخصية وحسابات الأصدقاء
    // { monthKey: { repaid, collected, newDebt, lent } } — بالقيمة الدولارية
    debtMonthlyFlows: {},

    // raw rows of debt accounts, used to rebuild balances chronologically for monthly netting
    debtAccountRows: [],

    // أرصدة الحسابات الشخصية: { accountName: { balance, realBalance, currency } }
    personalAccounts: {},

    // ميزانيات التصنيفات الشهرية: { category: budgetAmount } — تُحمَّل من localStorage
    categoryBudgets: {},

    // ربط الأوصاف المتشابهة: { originalLower: canonicalName } — تُحمَّل من localStorage
    descriptionMappings: {},

    // تصنيفات الأوصاف الموحدة: { categoryName: [keywords...] } — تُحمَّل من localStorage
    descriptionCategories: {},

    // متتبعات التصنيفات (تُبنى أثناء التحليل)
    categoryMonthsTracker: {},      // { category: Set<monthKey> }
    categoryAmountsTracker: {},     // { category: [amounts...] }
    descriptionMaxDateTracker: {},  // { "month_cat_desc": Date }

    // فئات عملة الحاسبة
    defaultDenominations: [...DEFAULT_DENOMINATIONS],
    activeDenominations: [...DEFAULT_DENOMINATIONS]
};
