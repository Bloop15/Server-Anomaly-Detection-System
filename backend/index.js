require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Node 18+ has global fetch()

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.post('/send-telegram-alert', async (req, res) => {
  try {
    const { Server_ID, anomaly_score, Timestamp } = req.body;

    if (!Server_ID || anomaly_score === undefined || !Timestamp) {
      return res.status(400).json({ success: false, error: 'Missing required payload fields' });
    }

    const text = `🚨 CRITICAL ANOMALY\nServer: ${Server_ID}\nScore: ${anomaly_score}\nTime: ${Timestamp}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
      }),
    });

    if (!tgRes.ok) {
      const errorData = await tgRes.text();
      console.error('Telegram API rejected the message:', errorData);
      return res.status(tgRes.status).json({ success: false, error: 'Telegram API error' });
    }

    // Success
    console.log(`[ALERT SENT] Server ${Server_ID} | Score ${anomaly_score} | Time ${Timestamp}`);
    res.status(200).json({ success: true });

  } catch (err) {
    console.error('Failed to send Telegram alert:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Telegram Bot Backend is running locally on http://localhost:${PORT}`);
});
