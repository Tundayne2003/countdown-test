// server.js - Đã chuyển sang cú pháp CommonJS để tương thích Vercel

// Sử dụng require() thay cho import
const express = require('express');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const { parseISO, differenceInSeconds } = require('date-fns');

const app = express();

// === ĐĂNG KÝ FONT CHỮ TRƯỚC KHI SỬ DỤNG ===
// Trong CommonJS, __dirname là một biến có sẵn, chỉ thẳng đến thư mục chứa file hiện tại.
// Điều này làm cho việc tìm file font trở nên đơn giản hơn.
registerFont(path.join(__dirname, 'fonts', 'Roboto-Bold.ttf'), { family: 'Roboto', weight: 'bold' });
registerFont(path.join(__dirname, 'fonts', 'Roboto-Regular.ttf'), { family: 'Roboto', weight: 'normal' });

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    ctx.fill();
}

app.get('/api/countdown.gif', (req, res) => {
    try {
        const { time, duration, bg1, bg2, boxcolor, textcolor, labelcolor } = req.query;
        const hexColorRegex = /^[0-9a-fA-F]{6}$/;

        if (!time) return res.status(400).send('Thiếu tham số "time".');
        const targetDate = parseISO(time);
        if (isNaN(targetDate.getTime())) return res.status(400).send('Định dạng "time" không hợp lệ.');
        let gifDuration = parseInt(duration, 10);
        if (isNaN(gifDuration) || gifDuration < 1) gifDuration = 5;
        if (gifDuration > 60) gifDuration = 60;

        const colors = {
            bg1:       hexColorRegex.test(bg1) ? `#${bg1}` : '#0b1226',
            bg2:       hexColorRegex.test(bg2) ? `#${bg2}` : '#1e3050',
            box:       hexColorRegex.test(boxcolor) ? `#${boxcolor}` : '#134074',
            text:      hexColorRegex.test(textcolor) ? `#${textcolor}` : '#FFFFFF',
            label:     hexColorRegex.test(labelcolor) ? `#${labelcolor}` : '#a9c1e1',
        };

        const width = 450;
        const height = 120;
        res.setHeader('Content-Type', 'image/gif');
        const encoder = new GIFEncoder(width, height);
        encoder.createReadStream().pipe(res);
        encoder.start();
        encoder.setRepeat(0);
        encoder.setDelay(1000);
        encoder.setQuality(10);
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const now = new Date();
        const initialSecondsLeft = differenceInSeconds(targetDate, now);
        const numberOfFrames = gifDuration;

        for (let i = 0; i < numberOfFrames; i++) {
            let currentFrameSeconds = initialSecondsLeft - i;
            if (currentFrameSeconds < 0) currentFrameSeconds = 0;

            const timeUnits = {
                Ngày: Math.floor(currentFrameSeconds / (3600 * 24)),
                Giờ: Math.floor((currentFrameSeconds % (3600 * 24)) / 3600),
                Phút: Math.floor((currentFrameSeconds % 3600) / 60),
                Giây: currentFrameSeconds % 60,
            };

            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, colors.bg1);
            gradient.addColorStop(1, colors.bg2);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            const boxWidth = 80;
            const boxHeight = 80;
            const gap = 20;
            const totalContentWidth = (4 * boxWidth) + (3 * gap);
            const startX = (width - totalContentWidth) / 2;
            const startY = (height - boxHeight) / 2;
            
            let currentX = startX;

            for (const [label, value] of Object.entries(timeUnits)) {
                ctx.fillStyle = colors.box;
                drawRoundedRect(ctx, currentX, startY, boxWidth, boxHeight, 10);
                
                ctx.fillStyle = colors.text;
                ctx.font = 'bold 36px Roboto';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(value).padStart(2, '0'), currentX + boxWidth / 2, startY + boxHeight / 2 - 10);

                ctx.fillStyle = colors.label;
                ctx.font = 'normal 14px Roboto';
                ctx.fillText(label.toUpperCase(), currentX + boxWidth / 2, startY + boxHeight / 2 + 25);

                currentX += boxWidth + gap;
            }

            encoder.addFrame(ctx);
        }

        encoder.finish();

    } catch (error) {
        console.error("Đã xảy ra lỗi khi tạo ảnh GIF:", error);
        res.status(500).send('Lỗi máy chủ nội bộ khi tạo ảnh.');
    }
});

// Sử dụng module.exports thay cho export default
module.exports = app;
