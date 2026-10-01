const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

app.get("/", (req, res) => {
  res.send("Shiv SMM Bot is running");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

async function telegram(method, data = {}) {
  const response = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return response.json();
}

async function handleUpdate(update) {
  if (!update.message) return;

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  if (text === "/start") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "🔥 Welcome to Shiv SMM!\n\nChoose a service:",
      reply_markup: {
        keyboard: [
          ["👁️ Telegram Views", "❤️ Telegram Reactions"],
          ["📦 My Orders", "🔍 Check Order"],
          ["💬 Support"]
        ],
        resize_keyboard: true
      }
    });
  }
}

async function startBot() {
  if (!BOT_TOKEN) {
    console.log("BOT_TOKEN is missing");
    return;
  }

  await telegram("deleteWebhook");

  let offset = 0;

  console.log("Shiv SMM Bot started");

  while (true) {
    try {
      const result = await telegram("getUpdates", {
        offset,
        timeout: 25
      });

      if (result.ok && result.result) {
        for (const update of result.result) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      }
    } catch (error) {
      console.log("Polling error:", error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startBot();
});
