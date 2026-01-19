const express = require('express');
const { chromium } = require('playwright');
const app = express();
app.use(express.json({ limit: '20mb' }));

app.post('/publish', async (req, res) => {
    let logs = [];
    const log = (msg) => { logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`); console.log(msg); };
    const { cookies, text, image_url } = req.body;

    log("🚀 Connecting to Browserless...");
    let browser;
    try {
        browser = await chromium.connectOverCDP('wss://browserless.161.97.76.168.nip.io?token=mina123');
        const context = await browser.newContext();
        // تفعيل صلاحية الكليب بورد
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        const page = await context.newPage();

        log("🍪 Setting Cookies & Navigating...");
        await context.addCookies(cookies);
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        log("🔍 Opening Post Box...");
        const startBtn = '.share-box-feed-entry__trigger, [aria-label="Start a post"]';
        await page.waitForSelector(startBtn, { state: 'visible', timeout: 20000 });
        await page.click(startBtn);

        const editor = '.ql-editor';
        await page.waitForSelector(editor, { state: 'visible', timeout: 15000 });

        // --- ميزة الـ Paste للصورة ---
        if (image_url) {
            log("📸 Processing Image via Clipboard...");
            const response = await fetch(image_url);
            const buffer = await response.arrayBuffer();
            const base64Image = Buffer.from(buffer).toString('base64');

            // كود سحري بيخلي المتصفح "يلزق" الصورة جوه الـ Editor
            await page.evaluate(async (base64) => {
                const response = await fetch(`data:image/png;base64,${base64}`);
                const blob = await response.blob();
                const item = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([item]);
            }, base64Image);

            await page.focus(editor);
            await page.keyboard.press('Control+V'); // أو Meta+V للـ Mac بس السيرفر Linux فـ Control أضمن
            log("✅ Image Pasted!");
            await page.waitForTimeout(3000); // وقت بسيط للمعالجة
        }

        log("✍️ Filling Content (Fast Mode)...");
        await page.fill(editor, text || "");

        log("🚀 Clicking Publish...");
        const postBtn = 'button.share-actions__primary-action';
        await page.waitForSelector(postBtn, { state: 'visible', timeout: 10000 });
        await page.click(postBtn);

        log("✅ Published Successfully!");
        await page.waitForTimeout(5000);
        await browser.close();
        res.json({ status: "success", logs });

    } catch (err) {
        log("❌ Error: " + err.message);
        if (browser) await browser.close();
        res.status(500).json({ status: "error", error: err.message, logs });
    }
});

app.listen(3000, '0.0.0.0', () => console.log('✅ Paste-Method API running on port 3000'));