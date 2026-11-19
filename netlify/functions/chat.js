const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MODELS_PRIORITY = [
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
];

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

        if (!question || !String(question).trim()) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "يرجى كتابة سؤال أولاً." })
            };
        }

        const prompt =
            "أنت وكيل ذكي واحترافي لمنصة 'ai provider' المتخصصة في التجارة وسلاسل التوريد والأعمال الرقمية. أجب بوضوح واختصار واحترافية باللغة العربية على السؤال التالي: " +
            String(question).trim();

        let lastStatus = 503;
        let lastErrorMessage = "الخدمة تشهد ضغطاً مؤقتاً الآن، يرجى المحاولة بعد قليل.";

        for (const model of MODELS_PRIORITY) {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            for (let attempt = 1; attempt <= 2; attempt++) {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await response.json().catch(() => ({}));

                if (response.ok) {
                    const reply =
                        data.candidates?.[0]?.content?.parts?.[0]?.text ||
                        "عذراً، لم أتمكن من صياغة إجابة.";

                    return {
                        statusCode: 200,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reply, modelUsed: model })
                    };
                }

                lastStatus = response.status;
                const rawMsg = data.error?.message || "";
                const lowerMsg = rawMsg.toLowerCase();

                const isRetriable =
                    response.status === 429 ||
                    response.status === 500 ||
                    response.status === 502 ||
                    response.status === 503 ||
                    response.status === 504 ||
                    response.status === 404 ||
                    lowerMsg.includes("high demand") ||
                    lowerMsg.includes("no longer available") ||
                    lowerMsg.includes("not found");

                if (rawMsg) {
                    lastErrorMessage = rawMsg;
                }

                if (isRetriable && attempt < 2) {
                    await sleep(1000);
                    continue;
                }

                // انتقل فوراً للنموذج التالي في القائمة إذا كان الخطأ قابلاً للتجاوز
                if (isRetriable) {
                    break;
                }

                // إذا كان الخطأ في المفتاح مثلاً (400/401/403 غير مرتبط بمفتاح التفعيل)، أوقف المحاولة وأرجع السبب
                return {
                    statusCode: response.status,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ error: rawMsg || lastErrorMessage })
                };
            }
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
