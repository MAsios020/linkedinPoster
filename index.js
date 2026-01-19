const express = require('express');
const { chromium } = require('playwright');
const app = express();
app.use(express.json({ limit: '15mb' })); // زودنا الليميت عشان الصور

app.post('/publish', async (req, res) => {
    const { cookies, text, image_url } = req.body;
    let logs = [];
    const log = (msg) => { logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`); console.log(msg); };

    log("🚀 Starting process...");
    // تشغيل المتصفح بمقاس شاشة ثابت عشان نضمن ظهور الزراير
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    try {
        log("🍪 Setting Cookies...");
        await context.addCookies(cookies);

        log("🌐 Navigating (Waiting for network idle)...");
        // بنستنى لحد ما الشبكة تهدأ تماماً عشان نضمن إن الصورة وكل حاجة حملت
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle', timeout: 90000 });

        log("🔍 Looking for Post Box...");
        const startBtn = '.share-box-feed-entry__trigger, [aria-label="Start a post"]';
        await page.waitForSelector(startBtn, { state: 'visible', timeout: 30000 });
        await page.click(startBtn);

        if (image_url) {
            log("📸 Downloading and Uploading Image...");
            const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 15000 });

            // تحميل الصورة وتحويلها لـ Buffer
            const response = await fetch(image_url);
            const buffer = Buffer.from(await response.arrayBuffer());

            await fileInput.setInputFiles({
                name: 'image.jpg',
                mimeType: 'image/jpeg',
                buffer: buffer
            });

            log("✅ Image Uploaded, waiting for 'Next' button...");
            const nextBtn = 'button:has-text("Next"), .share-box-footer__primary-btn';
            await page.waitForSelector(nextBtn, { state: 'visible', timeout: 20000 });
            await page.click(nextBtn);
        }

        log("✍️ Typing Content...");
        await page.waitForSelector('.ql-editor', { state: 'visible', timeout: 20000 });
        await page.fill('.ql-editor', text);

        log("🚀 Clicking Publish...");
        const postBtn = 'button.share-actions__primary-action';
        // التعديل هنا: شلنا كلمة enabled اللي بتعمل Error
        await page.waitForSelector(postBtn, { state: 'visible', timeout: 15000 });
        await page.click(postBtn);

        log("✅ Waiting for confirmation...");
        await page.waitForTimeout(7000);

        log("✅ TASK COMPLETED SUCCESSFULLY");

        await browser.close();
        res.json({ status: "success", logs });

    } catch (err) {
        log("❌ FAILED: " + err.message);
        // سكرين شوت للـ Debugging
        let screenshot = "";
        try {
            screenshot = await page.screenshot({ encoding: 'base64' });
        } catch (e) { }

        if (browser) await browser.close();
        res.status(500).json({
            status: "error",
            error: err.message,
            logs,
            debug_image: screenshot
        });
    }
});

app.listen(3000, '0.0.0.0', () => console.log('✅ Stability API running on port 3000'));