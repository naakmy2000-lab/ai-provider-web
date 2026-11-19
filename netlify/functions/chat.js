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

        // جلب قائمة النماذج المتاحة فعلاً لهذا المفتاح
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsRes.json().catch(() => ({}));

        if (!modelsRes.ok) {
            return {
                statusCode: modelsRes.status,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    error: modelsData.error?.message || "تعذر التحقق من النماذج المتاحة للمفتاح."
                })
            };
        }

        const availableModels = (modelsData.models || [])
            .filter((m) =>
                Array.isArray(m.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes("generateContent")
            )
            .map((m) => m.name.replace(/^models\//, ""));

        // ترتيب الأفضلية مع ضمان اختيار أي نموذج متاح يدعم generateContent
        const preferredOrder = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-flash-latest"
        ];

        const orderedCandidates = [
            ...preferredOrder.filter((name) => availableModels.includes(name)),
            ...availableModels.filter((name) => !preferredOrder.includes(name) && name.includes("gemini"))
        ];

        if (orderedCandidates.length === 0) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "لا يوجد نموذج يدعم توليد النصوص متاح حالياً لهذا المفتاح." })
            };
        }

        let lastError = "تعذر الحصول على رد من النموذج حالياً.";
        let lastStatus = 500;

        for (const modelName of orderedCandidates.slice(0, 4)) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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
                    "عذراً، لم أتمكن من صياغة إجابة.";

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
