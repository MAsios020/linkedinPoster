const express = require('express');
const { chromium } = require('playwright');
const app = express();
app.use(express.json({ limit: '15mb' }));

app.post('/publish', async (req, res) => {
    let logs = [];
    const log = (msg) => { logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`); console.log(msg); };
    const { cookies, text, image_url } = req.body;

    log("🚀 Connecting to Browserless server...");
    let browser;
    try {
        // الاتصال بالسيرفر البعيد
        browser = await chromium.connectOverCDP('wss://browserless.161.97.76.168.nip.io?token=mina123');
        const context = await browser.newContext();
        const page = await context.newPage();

        log("🍪 Setting Cookies and Navigating...");
        await context.addCookies(cookies);
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        log("🔍 Opening Post Box...");
        const startBtn = '.share-box-feed-entry__trigger, [aria-label="Start a post"]';
        await page.waitForSelector(startBtn, { state: 'visible', timeout: 20000 });
        await page.click(startBtn, { force: true });

        // --- إضافة ميزة الصورة ---
        if (image_url) {
            log("📸 Handling Image Upload...");
            const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 15000 });
            const response = await fetch(image_url);
            const buffer = Buffer.from(await response.arrayBuffer());

            await fileInput.setInputFiles({
                name: 'image.jpg',
                mimeType: 'image/jpeg',
                buffer: buffer
            });

            log("✅ Image selected, clicking Next...");
            const nextBtn = 'button:has-text("Next"), .share-box-footer__primary-btn';
            await page.waitForSelector(nextBtn, { state: 'visible', timeout: 15000 });
            await page.click(nextBtn);
        }

        log("✍️ Typing Content...");
        const editor = '.ql-editor';
        await page.waitForSelector(editor, { state: 'visible', timeout: 15000 });
        await page.fill(editor, text || "Automated Post! 🚀");

        log("🚀 Clicking Publish...");
        const postBtn = 'button.share-actions__primary-action';
        await page.waitForSelector(postBtn, { state: 'visible', timeout: 15000 });
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

app.listen(3000, '0.0.0.0', () => console.log('✅ Final Bridge API running on port 3000'));