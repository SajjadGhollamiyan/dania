const SUPABASE_URL = 'https://zwkzzwgkntyasliicksx.supabase.co';
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function clean(raw) {
  const str = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const sections = (Array.isArray(raw?.sections) ? raw.sections : []).slice(0, 6)
    .map((item) => ({
      icon: str(item?.icon, 8),
      heading: str(item?.heading, 60),
      text: str(item?.text, 220),
      stat: str(item?.stat, 24),
    }))
    .filter((item) => item.heading || item.text);
  const result = {
    title: str(raw?.title, 90),
    subtitle: str(raw?.subtitle, 160),
    sections,
    takeaway: str(raw?.takeaway, 200),
  };
  if (!result.title || result.sections.length < 2) throw new Error('Invalid AI response shape');
  return result;
}

function parseModelResponse(result) {
  let text = typeof result === 'string' ? result : result?.response;
  if (!text && result?.choices?.[0]?.message?.content) text = result.choices[0].message.content;
  if (typeof text !== 'string') throw new Error('Empty model response');
  text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(text); } catch (_) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('Model did not return JSON');
    return JSON.parse(text.slice(start, end + 1));
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return json({ message: 'روش درخواست نامعتبر است.' }, 405);
  if (!env.AI) return json({ message: 'اتصال Workers AI هنوز در این نسخه فعال نشده است؛ یک بار دیگر Preview را منتشر کنید.' }, 503);

  try {
    const authorization = request.headers.get('Authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    const anonKey = request.headers.get('apikey') || '';
    if (!token || !anonKey) return json({ message: 'برای استفاده از این قابلیت ابتدا وارد حساب کاربری شوید.' }, 401);

    // بررسی واقعی نشست کاربر توسط Supabase؛ کلید عمومی است و هیچ Service Role Key استفاده نمی‌شود.
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${token}` },
    });
    if (!authResponse.ok) return json({ message: 'نشست شما معتبر نیست؛ دوباره وارد حساب کاربری شوید.' }, 401);

    const body = await request.json().catch(() => ({}));
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (prompt.length < 3 || prompt.length > 1500) {
      return json({ message: 'متن درخواست باید بین ۳ تا ۱۵۰۰ نویسه باشد.' }, 400);
    }

    const systemPrompt = `You create accurate educational infographics for Persian-speaking teachers and students.
Return ONLY a valid JSON object in Persian, with exactly this structure:
{"title":"","subtitle":"","sections":[{"icon":"","heading":"","text":"","stat":""}],"takeaway":""}
Requirements:
- Include 4 to 6 sections in a logical teaching sequence.
- Use clear, natural Persian suitable for the grade level mentioned by the user.
- icon must be one emoji; heading must be concise (maximum 6 words).
- text must be concise (maximum 25 Persian words); stat may be an empty string.
- Do not add Markdown fences or any text outside the JSON object.
- Be factual; do not invent statistics. If unsure, omit stat.`;

    const modelResult = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1400,
      temperature: 0.35,
    });

    const infographic = clean(parseModelResponse(modelResult));
    return json({ infographic });
  } catch (error) {
    console.error('Dania infographic error:', error);
    return json({ message: 'در تولید اینفوگرافیک خطایی رخ داد. کمی بعد دوباره تلاش کنید.' }, 502);
  }
}
