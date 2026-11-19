const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.handler = async function(event, context) {
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

        const prompt =
            "أنت وكيل ذكي واحترافي لمنصة 'ai provider' المتخصصة في التجارة وسلاسل التوريد والأعمال الرقمية. أجب باختصار واحترافية باللغة العربية على السؤال التالي: " +
            question;

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let lastStatus = 500;
        let lastErrorMessage = "الخدمة تشهد ضغطاً مؤقتاً الآن، يرجى المحاولة بعد قليل.";

        // إعادة المحاولة حتى 3 مرات عند وجود ضغط مؤقت (429 أو 503)
        for (let attempt = 1; attempt <= 3; attempt++) {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();

            if (response.ok) {
                const reply =
                    data.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "عذراً، لم أتمكن من صياغة إجابة.";

                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reply })
                };
            }

            lastStatus = response.status;
            const rawMsg = data.error?.message || "";
            const isTemporarySpike =
                response.status === 429 ||
                response.status === 503 ||
                rawMsg.toLowerCase().includes("high demand");

            if (isTemporarySpike && attempt < 3) {
                await sleep(1500 * attempt);
                continue;
            }

            lastErrorMessage = isTemporarySpike
                ? "الخدمة تشهد ضغطاً مؤقتاً الآن من مزود النموذج، يرجى المحاولة مرة أخرى بعد لحظات."
                : (rawMsg || lastErrorMessage);
            break;
        }

        return {
            statusCode: lastStatus,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: lastErrorMessage })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "خطأ داخلي: " + error.message })
        };
    }
};
