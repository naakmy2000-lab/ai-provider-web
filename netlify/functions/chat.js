const { GoogleGenAI } = require("@google/genai");

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    try {
        const { question, activationKey } = JSON.parse(event.body || "{}");

        // التحقق من مفتاح التفعيل إذا انتهت المحاولات المجانية
        const VALID_KEYS = ["AI-2026-VIP", "AIPR-PRO-01"];
        if (activationKey && !VALID_KEYS.includes(activationKey)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "مفتاح التفعيل غير صالح!" })
            };
        }

        // التحقق من وجود مفتاح الـ API في إعدادات المنصة
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "مفتاح الذكاء الاصطناعي غير معرّف في السيرفر." })
            };
        }

        // الاتصال بنموذج الذكاء الاصطناعي (Gemini)
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: "أنت وكيل ذكي واحترافي لمنصة 'ai provider' المتخصصة في تقديم الاستشارات والتحليلات حول التجارة، سلاسل التوريد، والأعمال الرقمية. أجب باختصار واحترافية باللغة العربية على السؤال التالي: " + question }
                    ]
                }
            ]
        });

        const reply = response.text || "عذراً، لم أتمكن من صياغة إجابة.";

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب: " + error.message })
        };
    }
};
