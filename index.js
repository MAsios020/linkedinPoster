const express = require('express');
const { chromium } = require('playwright');
const app = express();
app.use(express.json({ limit: '10mb' })); // عشان لو الداتا كبيرة

app.post('/publish', async (req, res) => {
    const { cookies, text, image_url } = req.body;
    let logs = [];
    const log = (msg) => { logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`); console.log(msg); };

    if (!cookies || !text) {
        return res.status(400).json({ status: "error", message: "Missing cookies or text" });
    }

    log("🚀 Starting process for new request...");
    // استخدام Launch بدل connectOverCDP عشان نتحكم في الـ Dependencies محلياً جوه Docker
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        log("🍪 Setting Cookies...");
        await context.addCookies(cookies);

        log("🌐 Navigating to LinkedIn...");
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        log("🔍 Opening Post Box...");
        const startBtn = '.share-box-feed-entry__trigger, [aria-label="Start a post"]';
        await page.waitForSelector(startBtn, { state: 'visible', timeout: 20000 });
        await page.click(startBtn);

        // --- الجزء الخاص بالصورة (اختياري) ---
        if (image_url) {
            log("📸 Handling Image...");
            const uploadBtn = 'button[aria-label="Add a medium"], input[type="file"]';
            // لو فيه input file بنرفع عليه مباشرة أضمن
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.setInputFiles({
                    name: 'image.jpg',
                    mimeType: 'image/jpeg',
                    buffer: await (await fetch(image_url)).arrayBuffer() // بيحمل الصورة من اللينك ويرفعها
                });
                log("✅ Image Uploaded");
                // استنى زرار الـ Next بعد الصورة
                await page.click('button:has-text("Next"), .share-box-footer__primary-btn');
            }
        }

        log("📝 Typing Content...");
        const editor = '.ql-editor';
        await page.waitForSelector(editor, { state: 'visible', timeout: 15000 });
        await page.fill(editor, text);

        log("🚀 Publishing...");
        const postBtn = 'button.share-actions__primary-action';
        await page.waitForSelector(postBtn, { state: 'enabled', timeout: 10000 });
        await page.click(postBtn);

        await page.waitForTimeout(5000);
        await browser.close();
        res.json({ status: "success", logs });

    } catch (err) {
        log("❌ Error: " + err.message);
        if (browser) await browser.close();
        res.status(500).json({ status: "error", error: err.message, logs });
    }
});

app.listen(3000, '0.0.0.0', () => console.log('✅ Advanced API running on port 3000'));