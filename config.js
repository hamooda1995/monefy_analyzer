/**
 * ⚙️ الإعدادات والثوابت المركزية للتطبيق
 * ---------------------------------------------------------------
 * كل القيم الثابتة في مكان واحد. لإضافة وظيفة جديدة:
 * - تصنيف جديد لظرف معيّن؟ أضفه لقائمة categories الخاصة به هنا.
 * - حساب صديق جديد؟ أضفه لقائمة DEBT_ACCOUNTS.
 * - فئة عملة جديدة للحاسبة؟ المستخدم يقدر يضيفها من الواجهة مباشرة.
 */

// --- خريطة أظرف الميزانية (Jars System) ---
// كل ظرف: name = الاسم الظاهر، targetPercent = النسبة المستهدفة من الراتب،
// color = لون الشريط، categories = التصنيفات التي تُحسب ضمنه، advice = نص إرشادي للحاسبة
// warnOnOver = true إذا تجاوز الصرف المستهدف يُعتبر تجاوزاً للميزانية (شريط أحمر)
const JARS_MAPPING = {
    fixed: {
        name: "مصاريف ثابتة وأساسية (55%)",
        targetPercent: 0.55,
        color: "#3182CE",
        warnOnOver: true,
        categories: [
            "Rent", "Bills", "Food", "Transport", "House", "Home", "Babies",
            "Communications", "Mobile", "Android", "Car", "Health", "Moony",
            "Real estate", "Taxi"
        ],
        advice: "سقف الإنفاق الأقصى للإيجار والفواتير والطعام والمواصلات."
    },
    guiltFree: {
        name: "متعة دون تأنيب ضمير (10%)",
        targetPercent: 0.1,
        color: "#DD6B20",
        warnOnOver: true,
        categories: [
            "Eating out", "Entertainment", "Sports", "Shaving", "Clothes",
            "Electronics", "Gifts", "Shop", "YYY"
        ],
        advice: "ميزانية الرفاهية والمطاعم والتسوق غير الضروري دون تأنيب ضمير."
    },
    debt: {
        name: "سداد ديون (10%)",
        targetPercent: 0.1,
        color: "#E53E3E",
        categories: [],
        advice: "مخصصة لسداد أي التزامات سابقة أو دفعات بينية مستحقة للأصدقاء."
    },
    savings: {
        name: "تحويش للمستقبل (10%)",
        targetPercent: 0.1,
        color: "#38A169",
        categories: ["Savings", "Study"],
        advice: "تُقتطع فوراً عند استلام الدخل وتُجمد للمستقبل والطوارئ."
    },
    investing: {
        name: "استثمار وتنمية الثروة (15%)",
        targetPercent: 0.15,
        color: "#805AD5",
        categories: ["Investment", "Gold"],
        advice: "مخصصة لضخها في حساب ثروة الاستثماري أو شراء الذهب لتنمية رأس المال."
    }
};

// --- أعمدة ملف CSV الصادر من Monefy ---
const CSV_INDICES = {
    DATE: 0,
    ACCOUNT: 1,
    CATEGORY: 2,
    REAL_AMOUNT: 3,
    CURRENCY: 4,
    AMOUNT: 5,
    DESC: 7
};

// --- أسماء الحسابات الشخصية (أرصدة تُتتبع دائماً) ---
const PERSONAL_ACCOUNTS = ["usd", "new cash", "ثروة"];

// --- حسابات ديون الأصدقاء والمعاملات البينية ---
const DEBT_ACCOUNTS = [
    "محمد دولار", "عمار دولار", "عبد دولار", "حافظ", "حكيم",
    "Shop", "محمد", "عمار", "حكيم دولار", "موني", "عبد"
];

// --- نسخ سريعة بصيغة Set للبحث الفوري O(1) أثناء تحليل آلاف الصفوف ---
const PERSONAL_ACCOUNTS_SET = new Set(PERSONAL_ACCOUNTS.map((a) => a.toLowerCase()));
const DEBT_ACCOUNTS_SET = new Set(DEBT_ACCOUNTS.map((a) => a.toLowerCase()));

// --- الحسابات التي يُتتبع رصيدها لعرض "وفر الشهر" مقسماً حسب العملة ---
// usd = رصيد بالدولار مباشرة | cash + new cash = أرصدة الليرة السورية (قديمة SYP / جديدة ZWL)
const BALANCE_TRACKED_ACCOUNTS = ["usd", "cash", "new cash"];
const BALANCE_TRACKED_ACCOUNTS_SET = new Set(BALANCE_TRACKED_ACCOUNTS.map((a) => a.toLowerCase()));

// --- فئات العملة الافتراضية لآلة حاسبة الفئات ---
const DEFAULT_DENOMINATIONS = [10, 25, 50, 100, 200, 500];
