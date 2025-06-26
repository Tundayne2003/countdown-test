// server.js - Giao diện được nâng cấp và có thể tùy chỉnh

import express from 'express';
import { createCanvas } from 'canvas';
import GIFEncoder from 'gif-encoder-2';
import { parseISO, differenceInSeconds } from 'date-fns';

const app = express();
const PORT = process.env.PORT || 3000;

// === HÀM HỖ TRỢ VẼ HÌNH CHỮ NHẬT BO GÓC ===
// node-canvas không có sẵn hàm này, nên chúng ta tự tạo.
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
    // === 1. LẤY VÀ XỬ LÝ TẤT CẢ THAM SỐ TỪ URL ===
    const { time, duration, bg1, bg2, boxcolor, textcolor, labelcolor } = req.query;
    const hexColorRegex = /^[0-9a-fA-F]{6}$/;

    // Xử lý tham số 'time' và 'duration'
    if (!time) return res.status(400).send('Thiếu tham số "time".');
    const targetDate = parseISO(time);
    if (isNaN(targetDate.getTime())) return res.status(400).send('Định dạng "time" không hợp lệ.');
    let gifDuration = parseInt(duration, 10);
    if (isNaN(gifDuration) || gifDuration < 1) gifDuration = 5;
    if (gifDuration > 60) gifDuration = 60;

    // Xử lý các tham số màu sắc với giá trị mặc định nếu không được cung cấp hoặc không hợp lệ
    const colors = {
        bg1:       hexColorRegex.test(bg1) ? `#${bg1}` : '#0b1226',        // Màu nền bắt đầu: Xanh đen đậm
        bg2:       hexColorRegex.test(bg2) ? `#${bg2}` : '#1e3050',        // Màu nền kết thúc: Xanh navy
        box:       hexColorRegex.test(boxcolor) ? `#${boxcolor}` : '#134074',  // Màu khối: Xanh biển đậm
        text:      hexColorRegex.test(textcolor) ? `#${textcolor}` : '#FFFFFF',    // Màu số: Trắng
        label:     hexColorRegex.test(labelcolor) ? `#${labelcolor}` : '#a9c1e1', // Màu nhãn: Xanh nhạt
    };

    // === 2. CÀI ĐẶT CANVAS VÀ GIF ENCODER ===
    const width = 450; // Tăng chiều rộng để có thêm không gian cho thiết kế mới
    const height = 120; // Tăng chiều cao
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

        // === 3. BẮT ĐẦU VẼ GIAO DIỆN MỚI ===

        // 3.1. Vẽ nền gradient cho chiều sâu
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, colors.bg1);
        gradient.addColorStop(1, colors.bg2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 3.2. Cài đặt thông số cho các khối để căn giữa
        const boxWidth = 80;
        const boxHeight = 80;
        const gap = 20;
        const totalContentWidth = (4 * boxWidth) + (3 * gap);
        const startX = (width - totalContentWidth) / 2;
        const startY = (height - boxHeight) / 2;
        
        let currentX = startX;

        // 3.3. Lặp qua và vẽ từng khối thời gian (Ngày, Giờ, Phút, Giây)
        for (const [label, value] of Object.entries(timeUnits)) {
            // Vẽ khối nền bo góc
            ctx.fillStyle = colors.box;
            drawRoundedRect(ctx, currentX, startY, boxWidth, boxHeight, 10);
            
            // Vẽ số (to, ở trên)
            ctx.fillStyle = colors.text;
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(value).padStart(2, '0'), currentX + boxWidth / 2, startY + boxHeight / 2 - 10);

            // Vẽ nhãn (nhỏ, ở dưới)
            ctx.fillStyle = colors.label;
            ctx.font = '14px Arial';
            ctx.fillText(label.toUpperCase(), currentX + boxWidth / 2, startY + boxHeight / 2 + 25);

            // Cập nhật vị trí X cho khối tiếp theo
            currentX += boxWidth + gap;
        }

        encoder.addFrame(ctx);
    }

    encoder.finish();
});

// URL ví dụ được cập nhật để trình diễn giao diện mới và các tham số màu
const testDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
const isoTime = testDate.toISOString();

app.listen(PORT, () => {
    console.log(`Server tạo ảnh GIF ĐỘNG (demo) đang chạy.`);
    console.log(`\n🎨 Giao diện mặc định (10 giây):`);
    console.log(`http://localhost:${PORT}/api/countdown.gif?time=${isoTime}&duration=10`);

    console.log(`\n🎨 Giao diện tông màu Nóng (Cam/Đỏ):`);
    console.log(`http://localhost:${PORT}/api/countdown.gif?time=${isoTime}&duration=10&bg1=4a0e0e&bg2=8e2f17&boxcolor=c2482a&textcolor=ffffff&labelcolor=fdd3c9`);

    console.log(`\n🎨 Giao diện tông màu Xanh lá:`);
    console.log(`http://localhost:${PORT}/api/countdown.gif?time=${isoTime}&duration=10&bg1=032b13&bg2=0f522e&boxcolor=1a7d49&textcolor=ffffff&labelcolor=b6e6ce`);
});
