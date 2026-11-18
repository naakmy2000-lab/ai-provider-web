export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error 'Method Not Allowed' });
    }

    const { question, activationKey } = req.body;

     التحقق من مفتاح التفعيل إذا تم إرساله
    const VALID_KEYS = [AI-2026-VIP, AIPR-PRO-01];
    if (activationKey && !VALID_KEYS.includes(activationKey)) {
        return res.status(403).json({ error 'مفتاح التفعيل غير صالح!' });
    }

     هنا سنربط مفتاح الـ API الحقيقي (مثل OpenAI أو Gemini) لاحقاً عبر متغيرات البيئة في Vercel
     حالياً نرجع رداً ذكياً من السيرفر للتأكد من عمل الباك إند بنجاح
    const reply = `تم استلام سؤالك على سيرفر Vercel بنجاح ${question}. (النظام يعمل الآن بربط آمن بين الواجهة والباك إند).`;

    return res.status(200).json({ reply });
}
