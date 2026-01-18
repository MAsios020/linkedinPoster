const express = require('express');
const { chromium } = require('playwright');
const app = express();
app.use(express.json());

app.post('/publish', async (req, res) => {
    let logs = [];
    const log = (msg) => { logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`); console.log(msg); };

    log("🚀 Request received");
    const browser = await chromium.connectOverCDP('wss://browserless.161.97.76.168.nip.io?token=mina123');
    const context = await browser.newContext();
    const page = await context.newPage();

    const cookies = [
        { "domain": ".www.linkedin.com", "name": "li_at", "value": "AQEFAHQBAAAAABcuv0cAAAGbwfcTpQAAAZvmA5elTQAAF3VybjpsaTptZW1iZXI6NTM3NjE0NDQ4s89jVNCRMexLFKgqPWz4azZtqaNt2XjMrVxcZmJBGl9FZpEQZkOnR8tnKon-jgaFu8VVaaVT5Yb1n3IGE7lB8VekN4QRh7YZUHBukxC5vi3mr_0YtBct9zilUrRQugDE9hUf4R7PNQoH-XWN2_JQKnzvBwRy9zBHxKm2wWFrT_U-vWRN5ZEebx134khVL1nyndA_zQ", "path": "/" },
        { "domain": ".www.linkedin.com", "name": "JSESSIONID", "value": "\"ajax:7300104970797953763\"", "path": "/" }
    ];

    try {
        await context.addCookies(cookies);
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });

        const startBtn = '.share-box-feed-entry__trigger, [aria-label="Start a post"]';
        await page.waitForSelector(startBtn, { state: 'visible', timeout: 20000 });
        await page.click(startBtn, { force: true });
        log("🖱️ Clicked Start Post");

        const editor = '.ql-editor';
        await page.waitForSelector(editor, { state: 'visible', timeout: 15000 });

        // النص بييجي من n8n أو نستخدم الافتراضي
        const content = req.body.text || "Automated Post! 🚀";
        await page.fill(editor, content);
        log("✍️ Content Typed");

        const postBtn = 'button.share-actions__primary-action';
        await page.waitForSelector(postBtn, { state: 'visible', timeout: 10000 });
        await page.click(postBtn);
        log("🚀 Published");

        await page.waitForTimeout(5000);
        await browser.close();
        res.json({ status: "success", logs });

    } catch (err) {
        log("❌ Error: " + err.message);
        await browser.close();
        res.status(500).json({ status: "error", error: err.message, logs });
    }
});

app.listen(3000, () => console.log('✅ Server running on port 3000'));