const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADOXFLY_API_KEY = process.env.ADOXFLY_API_KEY;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const ADOXFLY_API = "https://adoxfly.com/api/v1";

const users = new Map();

app.get("/", (req, res) => {
  res.send("Shiv SMM Bot is running");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

async function telegram(method, data = {}) {
  const response = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return response.json();
}

async function adoxfly(data) {
  const response = await fetch(ADOXFLY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": ADOXFLY_API_KEY
    },
    body: JSON.stringify(data)
  });

  return response.json();
}

function menu() {
  return {
    keyboard: [
      ["👁️ Telegram Views", "❤️ Telegram Reactions"],
      ["📦 My Orders", "🔍 Check Order"],
      ["💬 Support"]
    ],
    resize_keyboard: true
  };
}

async function send(chatId, text, extra = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}

async function handleUpdate(update) {
  if (!update.message) return;

  const chatId = update.message.chat.id;
  const text = (update.message.text || "").trim();

  if (text === "/start") {
    users.delete(chatId);

    await send(
      chatId,
      "🔥 Welcome to Shiv SMM!\n\nChoose a service below:",
      { reply_markup: menu() }
    );
    return;
  }

  if (text === "👁️ Telegram Views") {
    users.set(chatId, { type: "views", step: "link" });

    await send(
      chatId,
      "👁️ Telegram Views\n\nSend your public Telegram post link.\n\nExample:\nhttps://t.me/channel/123"
    );
    return;
  }

  if (text === "❤️ Telegram Reactions") {
    users.set(chatId, { type: "reactions", step: "link" });

    await send(
      chatId,
      "❤️ Telegram Reactions\n\nSend your public Telegram post link.\n\nExample:\nhttps://t.me/channel/123"
    );
    return;
  }

  if (text === "📦 My Orders") {
    await send(
      chatId,
      "📦 My Orders\n\nYour order history system is being connected."
    );
   
