# SAT Bus Booking - دليل التثبيت على FastPanel (PHP 8.3)

## المتطلبات
- FastPanel مع PHP 8.3 FPM
- Nginx أو Apache
- SSL (موصى به)

## خطوات التثبيت

### 1. إنشاء موقع في FastPanel
- ادخل لوحة FastPanel
- Sites → Add Site
- اختر PHP 8.3 FPM
- اختر Nginx (موصى) أو Apache

### 2. رفع الملفات
- ادخل مدير الملفات (File Manager)
- افتح `public_html`
- امسح الملفات الافتراضية
- ارفع جميع ملفات المشروع:
  ```
  index.html
  install.php
  geo-blocked.html
  reset-geo.html
  security.js
  sat-logo.png
  favicon.ico
  robots.txt
  sitemap.xml
  manifest.json
  assets/         ← مجلد الملفات المجمعة
  ```

### 3. إعداد Nginx (إذا تستخدم Nginx)
- ادخل Sites → Your Site → Config
- استبدل المحتوى بمحتوى `nginx-fastpanel.conf`
- تأكد من مسار PHP socket:
  ```
  fastcgi_pass unix:/run/php/php8.3-fpm.sock;
  ```
- احفظ وأعد تشغيل Nginx

### 4. إعداد Apache (إذا تستخدم Apache)
- تأكد أن `.htaccess` موجود في `public_html`
- Apache يستخدم القواعد تلقائياً

### 5. تشغيل المعالج
- افتح `https://your-domain.com/install.php`
- اتبع خطوات المعالج:
  1. فحص المتطلبات
  2. التحقق من الصلاحيات
  3. تثبيت المشروع
  4. تغيير كلمة المرور (اختياري)
  5. حذف ملف التثبيت

### 6. تغيير كلمة المرور (بعد التثبيت)
- ادخل لوحة التحكم: `https://your-domain.com/#/admin`
- اسم المستخدم: `admin`
- كلمة المرور الافتراضية: `sat123`
- اذهب لـ الإعدادات ← تغيير كلمة المرور

### 7. إشعارات Telegram (اختياري)
- في لوحة التحكم ← تبويب تيليجرام
- أدخل Bot Token و Chat ID لبوت الدفع
- أدخل Bot Token و Chat ID لبوت الحجز
- فعّل/عطّل الرسائل حسب الحاجة

## هيكل الملفات
```
public_html/
├── index.html              ← SPA entry point
├── install.php             ← معالج التثبيت (PHP 8.3)
├── geo-blocked.html        ← صفحة المحظورين
├── reset-geo.html          ← إعادة ضبط Geo Block
├── security.js             ← طبقة الحماية
├── sat-logo.png            ← شعار الموقع
├── favicon.ico             ← أيقونة الموقع
├── robots.txt              ← SEO
├── sitemap.xml             ← SEO
├── manifest.json           ← PWA
├── composer.json           ← PHP 8.3 requirement
├── nginx-fastpanel.conf    ← Nginx config (reference)
├── .htaccess               ← Apache config
├── .admin_password         ← ملف كلمة المرور (ينشأ تلقائياً)
└── assets/                 ← ملفات React المجمعة
    ├── index-*.js
    ├── index-*.css
    └── ...
```

## ملاحظات مهمة
- المشروع يستخدم **HashRouter** (`/#/`) — لا يحتاج rewrite rules على الخادم
- `install.php` يحتاج PHP 8.3+ فقط لتشغيل المعالج
- React SPA تعمل بالكامل على المتصفح — لا تحتاج backend
- البيانات تُخزن في `localStorage` — لكل متصفح على حدة

## استكشاف الأخطاء
| المشكلة | الحل |
|---------|------|
| صفحة بيضاء | تحقق من وجود `assets/` وأن index.html يقرأ الملفات |
| 404 على الروابط | تأكد من SPA routing في Nginx/Apache config |
| install.php لا يعمل | تأكد من تفعيل PHP 8.3 FPM |
| Telegram لا يرسل | تحقق من Bot Token و Chat ID |

## الدعم
FastPanel Docs: https://fastpanel.io/docs
PHP 8.3: https://www.php.net/releases/8.3/
