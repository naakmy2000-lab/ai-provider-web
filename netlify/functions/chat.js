exports.handler = async function(event) {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    try {
        const { question, activationKey } = JSON.parse(event.body || "{}");

        const VALID_KEYS = ["AI-2026-VIP", "AIPR-PRO-01"];
        if (activationKey && !VALID_KEYS.includes(activationKey)) {
            return {
                statusCode: 403,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "مفتاح التفعيل غير صالح!" })
            };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "مفتاح الذكاء الاصطناعي غير معرّف في السيرفر." })
            };
        }

        if (!question || !String(question).trim()) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "يرجى كتابة سؤال أولاً." })
            };
        }

        const prompt =
            "أجب باختصار ووضوح باللغة العربية على السؤال التالي في مجال التجارة وسلاسل التوريد والأعمال: " +
            String(question).trim();

        const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
        let lastError = "تعذر الحصول على رد من الخادم حالياً.";
        let lastStatus = 503;

        for (const model of models) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                const reply =
                    data.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "لم يرسل النموذج نصاً.";

                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reply })
                };
            }

            lastStatus = response.status;
            lastError = data.error?.message || lastError;
        }

        return {
            statusCode: lastStatus,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: lastError })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "خطأ داخلي: " + error.message })
        };
    }
};
