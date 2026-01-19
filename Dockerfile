# استخدم نسخة Node الرسمية
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

# تحديد مكان الشغل جوه الكونتينر
WORKDIR /app

# نسخ ملفات الـ package.json الأول عشان الـ Caching
COPY package*.json ./

# تسطيب الـ Dependencies
RUN npm install

# نسخ باقي ملفات المشروع
COPY . .

# فتح البورت اللي السيرفر شغال عليه
EXPOSE 3000

# أمر التشغيل
CMD ["node", "index.js"]

