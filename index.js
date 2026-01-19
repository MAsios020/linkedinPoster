const express = require('express');
const { chromium } = require('playwright');
const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/publish', async (req, res) => {
    let logs = [];
    const log = (msg) => { logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`); console.log(msg); };

    log("🚀 Connecting to Browserless server...");

    // التعديل 1: زودنا الـ Timeout بتاع الاتصال عشان السيرفر لو بعيد
    let browser;
    try {
        browser = await chromium.connectOverCDP('wss://browserless.161.97.76.168.nip.io?token=mina123', {
            timeout: 30000
        });

        const context = await browser.newContext();
        const page = await context.newPage();

        // التعديل 2: بناخد الكوكيز والنص من الـ Body عشان يبقى Dynamic
        const { cookies, text } = req.body;

        log("🍪 Setting Cookies and Navigating...");
        await context.addCookies(cookies);

        // التعديل 3: استخدام domcontentloaded أسرع وأضمن مع السيرفرات البعيدة
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        const startBtn = '.share-box-feed-entry__trigger, [aria-label="Start a post"]';
        await page.waitForSelector(startBtn, { state: 'visible', timeout: 20000 });
        await page.click(startBtn, { force: true });

        const editor = '.ql-editor';
        await page.waitForSelector(editor, { state: 'visible', timeout: 15000 });
        await page.fill(editor, text || "Default Post 🚀");

        const postBtn = 'button.share-actions__primary-action';
        await page.waitForSelector(postBtn, { state: 'visible', timeout: 10000 });
        await page.click(postBtn);

        log("✅ Published Successfully!");

        await page.waitForTimeout(5000);
        await browser.close();

        // التعديل 4: الرد يكون JSON بسيط عشان n8n ميهنجش
        return res.json({ status: "success", logs });

    } catch (err) {
        log("❌ Error: " + err.message);
        if (browser) await browser.close();
        return res.status(500).json({ status: "error", error: err.message, logs });
    }
});

app.listen(3000, '0.0.0.0', () => console.log('✅ Bridge API running on port 3000'));