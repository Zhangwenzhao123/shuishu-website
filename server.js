const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 和表单数据
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(__dirname));

// API：接收联系表单提交
app.post('/api/contact', (req, res) => {
    const { name, phone, message } = req.body;

    // 简单验证
    if (!name || !phone || !message) {
        return res.status(400).json({ success: false, msg: '请填写所有字段' });
    }

    // 读取已有留言
    const dataFile = path.join(__dirname, 'messages.json');
    let messages = [];
    if (fs.existsSync(dataFile)) {
        try {
            const raw = fs.readFileSync(dataFile, 'utf-8');
            messages = JSON.parse(raw);
        } catch (e) {
            messages = [];
        }
    }

    // 添加新留言
    messages.push({
        name,
        phone,
        message,
        time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    });

    // 写入文件
    fs.writeFileSync(dataFile, JSON.stringify(messages, null, 2), 'utf-8');

    res.json({ success: true, msg: '留言提交成功，感谢您的关注！' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`水书马尾绣宣传平台已启动：http://localhost:${PORT}`);
});
