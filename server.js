// server.js - Đã cải tiến việc ghi log lỗi để dễ dàng gỡ lỗi

const express = require('express');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const { parseISO, differenceInSeconds } = require('date-fns');
const sgMail = require('@sendgrid/mail');

const app = express();

// === CÀI ĐẶT SENDGRID ===
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.use(express.json());


// === API GỬI EMAIL MỚI ===
app.post('/api/send-email', async (req, res) => {
    const { to_email, message_html } = req.body;

    if (!to_email || !message_html) {
        return res.status(400).json({ error: 'Thiếu email người nhận hoặc nội dung.' });
    }

    const msg = {
        to: to_email,
        // Đảm bảo email này đã được xác thực (verified) trong SendGrid
        from: 'hahuytuan033@gmail.com', 
        subject: 'Thư mời tham gia sự kiện đặc biệt!',
        html: message_html,
    };

    try {
        await sgMail.send(msg);
        res.status(200).json({ message: 'Email đã được gửi thành công!' });
    } catch (error) {
        // === CẢI TIẾN LOG LỖI ===
        // Ghi lại lỗi một cách chi tiết hơn vào log của Vercel
        console.error('LỖI GỐC TỪ SENDGRID:', error);

        // Nếu có phản hồi từ API của SendGrid, hãy in ra chi tiết
        if (error.response) {
            console.error('CHI TIẾT LỖI:', JSON.stringify(error.response.body.errors, null, 2));
        }
        
        res.status(500).json({ error: 'Gửi email thất bại. Vui lòng kiểm tra log trên Vercel để biết chi tiết.' });
    }
});


// === API TẠO ẢNH GIF (Không thay đổi) ===
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
        const { time, duration, textcolor, labelcolor, bgcolor } = req.query;
        const hexColorRegex = /^[0-9a-fA-F]{6}$/;

        if (!time) return res.status(400).send('Thiếu tham số "time".');
        const targetDate = parseISO(time);
        if (isNaN(targetDate.getTime())) return res.status(400).send('Định dạng "time" không hợp lệ.');
        
        let gifDuration = parseInt(duration, 10);
        if (isNaN(gifDuration) || gifDuration < 1) {
            gifDuration = 5; 
        } else if (gifDuration > 10) {
            gifDuration = 10;
        }

        const colors = {
            text:       hexColorRegex.test(textcolor) ? `#${textcolor}` : '#000000',
            label:     hexColorRegex.test(labelcolor) ? `#${labelcolor}` : '#000000',
            bg:        hexColorRegex.test(bgcolor) ? `#${bgcolor}` : null,
        };

        const width = 360;
        const height = 96;
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

            if (colors.bg) {
                ctx.fillStyle = colors.bg;
                ctx.fillRect(0, 0, width, height);
            } else {
                ctx.clearRect(0, 0, width, height);
            }

            const boxWidth = 64;
            const boxHeight = 64;
            const gap = 16;
            const totalContentWidth = (4 * boxWidth) + (3 * gap);
            const startX = (width - totalContentWidth) / 2;
            const startY = (height - boxHeight) / 2;
            
            let currentX = startX;

            for (const [label, value] of Object.entries(timeUnits)) {
                
                ctx.fillStyle = colors.text;
                ctx.font = 'bold 28px Roboto';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(value).padStart(2, '0'), currentX + boxWidth / 2, startY + boxHeight / 2 - 8);

                ctx.fillStyle = colors.label;
                ctx.font = 'normal 12px Roboto';
                ctx.fillText(label.toUpperCase(), currentX + boxWidth / 2, startY + boxHeight / 2 + 22);

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

module.exports = app;
