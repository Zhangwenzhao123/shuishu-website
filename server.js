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

// 字段长度限制
const LIMITS = { name: 50, phone: 30, message: 500 };

// 互斥锁 —— 保护整个"读-改-写"操作为原子操作
let lock = Promise.resolve();

function acquireLock() {
    const prev = lock;
    let release;
    lock = new Promise(function(resolve) { release = resolve; });
    return prev.then(function() { return release; });
}

// 原子：读取 messages.json
function readMessages(dataFile) {
    return new Promise(function(resolve) {
        fs.readFile(dataFile, 'utf-8', function(err, raw) {
            if (err) resolve([]);
            else {
                try { resolve(JSON.parse(raw)); }
                catch (e) { resolve([]); }
            }
        });
    });
}

// 原子：写入 messages.json
function writeMessages(dataFile, messages) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(dataFile, JSON.stringify(messages, null, 2), 'utf-8', function(err) {
            if (err) reject(err);
            else resolve();
        });
    });
}

// API：接收联系表单提交
app.post('/api/contact', async function(req, res) {
    var name = req.body.name;
    var phone = req.body.phone;
    var message = req.body.message;

    // 必填验证
    if (!name || !phone || !message) {
        return res.status(400).json({ success: false, msg: '请填写所有字段' });
    }

    // 长度校验
    if (name.length > LIMITS.name) {
        return res.status(400).json({ success: false, msg: '姓名长度不能超过' + LIMITS.name + '个字符' });
    }
    if (phone.length > LIMITS.phone) {
        return res.status(400).json({ success: false, msg: '电话长度不能超过' + LIMITS.phone + '个字符' });
    }
    if (message.length > LIMITS.message) {
        return res.status(400).json({ success: false, msg: '留言内容不能超过' + LIMITS.message + '个字符' });
    }

    var dataFile = path.join(__dirname, 'messages.json');
    var release;

    try {
        release = await acquireLock();

        var messages = await readMessages(dataFile);

        messages.push({
            name: name.trim(),
            phone: phone.trim(),
            message: message.trim(),
            time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        });

        await writeMessages(dataFile, messages);

        res.json({ success: true, msg: '留言提交成功，感谢您的关注！' });
    } catch (e) {
        console.error('留言写入失败:', e);
        res.status(500).json({ success: false, msg: '服务器错误，请稍后重试' });
    } finally {
        if (release) release();
    }
});

// API：查看留言列表
app.get('/api/messages', async function(req, res) {
    var dataFile = path.join(__dirname, 'messages.json');
    var release;

    try {
        release = await acquireLock();
        var messages = await readMessages(dataFile);
        res.json({ success: true, messages: messages });
    } catch (e) {
        console.error('留言读取失败:', e);
        res.status(500).json({ success: false, msg: '服务器错误' });
    } finally {
        if (release) release();
    }
});

// API：清空留言
app.delete('/api/messages', async function(req, res) {
    var dataFile = path.join(__dirname, 'messages.json');
    var release;

    try {
        release = await acquireLock();
        await writeMessages(dataFile, []);
        res.json({ success: true, msg: '留言已清空' });
    } catch (e) {
        console.error('留言清空失败:', e);
        res.status(500).json({ success: false, msg: '服务器错误' });
    } finally {
        if (release) release();
    }
});

// 启动服务器
app.listen(PORT, function() {
    console.log('水书马尾绣宣传平台已启动：http://localhost:' + PORT);
});
