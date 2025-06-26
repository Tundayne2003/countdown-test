// server.js - Đã tối ưu hóa để tạo ảnh một khung hình, đảm bảo hoạt động trên Gmail

const express = require('express');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const { parseISO, differenceInSeconds } = require('date-fns');

const app = express();

// Đăng ký font chữ tùy chỉnh để đảm bảo hiển thị đúng trên server
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
        // Tham số 'duration' không còn cần thiết nên đã được loại bỏ
        const { time, bg1, bg2, boxcolor, textcolor, labelcolor } = req.query;
        const hexColorRegex = /^[0-9a-fA-F]{6}$/;

        if (!time) return res.status(400).send('Thiếu tham số "time".');
        const targetDate = parseISO(time);
        if (isNaN(targetDate.getTime())) return res.status(400).send('Định dạng "time" không hợp lệ.');

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

        // Tạo ảnh GIF chỉ có một khung hình duy nhất
        const encoder = new GIFEncoder(width, height);
        encoder.createReadStream().pipe(res);
        encoder.start();
        encoder.setRepeat(-1); // -1: không lặp (single frame)
        encoder.setDelay(500); // Delay không quan trọng với ảnh 1 frame
        encoder.setQuality(10);

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Tính toán thời gian và vẽ ảnh MỘT LẦN DUY NHẤT, không dùng vòng lặp
        const now = new Date();
        let totalSecondsLeft = differenceInSeconds(targetDate, now);
        if (totalSecondsLeft < 0) totalSecondsLeft = 0;

        const timeUnits = {
            Ngày: Math.floor(totalSecondsLeft / (3600 * 24)),
            Giờ: Math.floor((totalSecondsLeft % (3600 * 24)) / 3600),
            Phút: Math.floor((totalSecondsLeft % 3600) / 60),
            Giây: totalSecondsLeft % 60,
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

        // Chỉ thêm một khung hình duy nhất vào ảnh
        encoder.addFrame(ctx);
        encoder.finish();

    } catch (error) {
        console.error("Đã xảy ra lỗi khi tạo ảnh GIF:", error);
        res.status(500).send('Lỗi máy chủ nội bộ khi tạo ảnh.');
    }
});

module.exports = app;
