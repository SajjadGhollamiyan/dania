# راه‌اندازی ساخت اینفوگرافیک دانیا

جریان کار: مرورگر ← Edge Function با نام `dania-ai` ← OpenAI.
کلید OpenAI فقط به‌صورت Secret در Supabase نگه‌داری می‌شود و هرگز داخل `app.js` نمی‌رود.

## ۱) نصب و اتصال CLI
```bash
npm i -g supabase
supabase login
supabase link --project-ref zwkzzwgkntyasliicksx
```

## ۲) ثبت Secretها
```bash
supabase secrets set OPENAI_API_KEY=sk-...
# اختیاری: نام مدل متنی (پیش‌فرض داخل کد: gpt-5.6)
supabase secrets set OPENAI_TEXT_MODEL=gpt-5.6
# اختیاری: سقف روزانه برای هر کاربر (بدون این مقدار، سقفی اعمال نمی‌شود)
supabase secrets set DAILY_LIMIT=10
```

## ۳) جدول شمارش استفاده (فقط اگر DAILY_LIMIT می‌گذاری)
```bash
supabase db push
```
یا محتوای `migrations/20261120000000_ai_usage.sql` را در SQL Editor سوپابیس اجرا کن.

## ۴) انتشار تابع
```bash
supabase functions deploy dania-ai --no-verify-jwt
```
احراز هویت داخل خود تابع انجام می‌شود (فقط کاربر واردشده مجاز است)، به همین دلیل `--no-verify-jwt` مشکلی ایجاد نمی‌کند.

## ۵) تست
در دانیا وارد حساب شو، به «دستیار هوشمند» برو، دکمه‌ی «اینفوگرافیک» را روشن کن و یک موضوع بنویس.
لاگ تابع: `supabase functions logs dania-ai` (یا Dashboard ← Edge Functions ← Logs).

## نکته
پوشه‌ی `supabase/` با فایل `.assetsignore` از انتشار عمومی Cloudflare کنار گذاشته می‌شود.
