// Supabase Edge Function — دستیار هوشمند دانیا (ساخت اینفوگرافیک)
// کلید OpenAI فقط اینجا و به‌صورت Secret نگه‌داری می‌شود: supabase secrets set OPENAI_API_KEY=...
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TEXT_MODEL = Deno.env.get('OPENAI_TEXT_MODEL') ?? 'gpt-5.6'; // در صورت نیاز با Secret عوض کن
const DAILY_LIMIT = Number(Deno.env.get('DAILY_LIMIT') ?? 0);      // 0 = بدون سقف روزانه

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SYSTEM = `You design educational infographics for Persian-speaking teachers.
Return ONLY valid JSON, with all text in Persian, in exactly this shape:
{"title":"","subtitle":"","sections":[{"icon":"","heading":"","text":"","stat":""}],"takeaway":""}
Rules:
- 4 to 6 sections, each building on the topic in a logical order.
- "icon" is a single emoji. "heading" is at most 6 words. "text" is at most 25 words.
- "stat" is an optional short number or fact (e.g. "۷۰٪") and may be an empty string.
- Be factually accurate and suitable for the grade level mentioned in the request.`;

const s = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

function clean(raw: any) {
  const sections = (Array.isArray(raw?.sections) ? raw.sections : []).slice(0, 6)
    .map((x: any) => ({ icon: s(x?.icon, 8), heading: s(x?.heading, 60), text: s(x?.text, 220), stat: s(x?.stat, 24) }))
    .filter((x: any) => x.heading || x.text);
  const out = { title: s(raw?.title, 90), subtitle: s(raw?.subtitle, 160), sections, takeaway: s(raw?.takeaway, 200) };
  if (!out.title || out.sections.length < 2) throw new Error('bad shape');
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ message: 'درخواست نامعتبر است.' }, 405);

  try {
    // ۱) فقط کاربر واردشده
    const authHeader = req.headers.get('Authorization') ?? '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
    if (!user) return json({ message: 'ابتدا وارد حساب کاربری شو.' }, 401);

    // ۲) اعتبارسنجی ورودی
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (prompt.length < 3 || prompt.length > 1500) return json({ message: 'متن درخواست نامعتبر است.' }, 400);

    // ۳) سقف روزانه (اختیاری؛ جدول ai_usage لازم است)
    if (DAILY_LIMIT > 0) {
      const since = new Date(); since.setUTCHours(0, 0, 0, 0);
      const { count, error } = await sb.from('ai_usage').select('id', { count: 'exact', head: true })
        .eq('kind', 'infographic').gte('created_at', since.toISOString());
      if (error) throw error;
      if ((count ?? 0) >= DAILY_LIMIT) return json({ message: 'سقف استفاده‌ی امروز تمام شده؛ فردا دوباره امتحان کن.' }, 429);
    }

    // ۴) درخواست به OpenAI (دو تلاش در صورت JSON نامعتبر)
    let infographic = null;
    for (let attempt = 0; attempt < 2 && !infographic; attempt++) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: TEXT_MODEL,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
        }),
      });
      if (!r.ok) { console.error('OpenAI error', r.status, await r.text()); return json({ message: 'سرویس هوش مصنوعی پاسخ نداد.' }, 502); }
      const data = await r.json();
      try { infographic = clean(JSON.parse(data.choices[0].message.content)); } catch (_) { /* تلاش دوباره */ }
    }
    if (!infographic) return json({ message: 'پاسخ معتبر دریافت نشد؛ دوباره تلاش کن.' }, 502);

    if (DAILY_LIMIT > 0) await sb.from('ai_usage').insert({ user_id: user.id, kind: 'infographic' });
    return json({ infographic });
  } catch (e) {
    console.error(e);
    return json({ message: 'خطای غیرمنتظره؛ دوباره تلاش کن.' }, 500);
  }
});
