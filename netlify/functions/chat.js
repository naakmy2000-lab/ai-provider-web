exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    const { question, activationKey } = JSON.parse(event.body || "{}");

    // التحقق من مفتاح التفعيل
    const VALID_KEYS = ["AI-2026-VIP", "AIPR-PRO-01"];
    if (activationKey && !VALID_KEYS.includes(activationKey)) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: "مفتاح التفعيل غير صالح!" })
        };
    }

    // الرد التجريبي من سيرفر Netlify للتأكد من عمل الاتصال
    const reply = `تم استلام سؤالك على سيرفر Netlify بنجاح: "${question}". (الربط الآمن يعمل الآن).`;

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply })
    };
};
