const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const TOKEN = process.env.BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

const users = {};

app.get("/", (req, res) => res.send("Shiv SMM Bot is running"));
app.get("/health", (req, res) => res.json({ ok: true }));

async function tg(method, data = {}) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return r.json();
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

async function handle(u) {
  if (!u.message) return;

  const id = u.message.chat.id;
  const text = (u.message.text || "").trim();

  if (text === "/start") {
    delete users[id];
    return tg("sendMessage", {
      chat_id: id,
      text: "🔥 Welcome to Shiv SMM!\n\nChoose a service:",
      reply_markup: menu()
    });
  }

  if (text === "👁️ Telegram Views") {
    users[id] = { type: "views", step: "link" };
    return tg("sendMessage", {
      chat_id: id,
      text: "👁️ Telegram Views\n\nSend your public Telegram post link."
    });
  }

  if (text === "❤️ Telegram Reactions") {
    users[id] = { type: "reactions", step: "link" };
    return tg("sendMessage", {
      chat_id: id,
      text: "❤️ Telegram Reactions\n\nSend your public Telegram post link."
    });
  }

  if (text === "📦 My Orders") {
    return tg("sendMessage", {
      chat_id: id,
      text: "📦 My Orders\n\nOrder history will be available soon."
    });
  }

  if (text === "🔍 Check Order") {
    users[id] = { type: "check", step: "order" };
    return tg("sendMessage", {
      chat_id: id,
      text: "🔍 Send your Adoxfly order ID."
    });
  }

  if (text === "💬 Support") {
    return tg("sendMessage", {
      chat_id: id,
      text: "💬 Support\n\nSend your order ID and describe your issue."
    });
  }

  const s = users[id];
  if (!s) return;

  if (s.type === "check") {
    return tg("sendMessage", {
      chat_id: id,
      text: "🔍 Order ID received:\n" + text
    });
  }

  if (s.step === "link") {
    if (!text.startsWith("https://t.me/") && !text.startsWith("https://telegram.me/")) {
      return tg("sendMessage", {
        chat_id: id,
        text: "❌ Please send a valid public Telegram link."
      });
    }

    s.link = text;
    s.step = "quantity";

    return tg("sendMessage", {
      chat_id: id,
      text: "✅ Link received.\n\nSend quantity (5-100000).\n\nExample: 1000"
    });
  }

  if (s.step === "quantity") {
    const q = Number(text);

    if (!Number.isInteger(q) || q < 5 || q > 100000) {
      return tg("sendMessage", {
        chat_id: id,
        text: "❌ Quantity must be between 5 and 100000."
      });
    }

    s.quantity = q;

    if (s.type === "reactions") {
      s.step = "emoji";
      return tg("sendMessage", {
        chat_id: id,
        text: "😀 Send the reaction emoji.\n\nExample: 👍"
      });
    }

    delete users[id];

    return tg("sendMessage", {
      chat_id: id,
      text:
        "👁️ Views Request\n\n" +
        "🔗 " + s.link + "\n" +
        "📦 Quantity: " + q + "\n\n" +
        "✅ Request received.\nPayment/order system will be connected next."
    });
  }

  if (s.step === "emoji") {
    const emoji = [...text][0];

    if (!emoji) {
      return tg("sendMessage", {
        chat_id: id,
        text: "❌ Send a reaction emoji."
      });
    }

    delete users[id];

    return tg("sendMessage", {
      chat_id: id,
      text:
        "❤️ Reaction Request\n\n" +
        "🔗 " + s.link + "\n" +
        "📦 Quantity: " + s.quantity + "\n" +
        "😀 Reaction: " + emoji + "\n\n" +
        "✅ Request received.\nPayment/order system will be connected next."
    });
  }
}

async function start() {
  if (!TOKEN) return console.log("BOT_TOKEN missing");

  await tg("deleteWebhook");

  let offset = 0;
  console.log("Shiv SMM Bot started");

  while (true) {
    try {
      const r = await tg("getUpdates", {
        offset: offset,
        timeout: 25
      });

      if (r.ok) {
        for (const u of r.result) {
          offset = u.update_id + 1;
          try {
            await handle(u);
          } catch (e) {
            console.log(e.message);
          }
        }
      }
    } catch (e) {
      console.log("Polling:", e.message);
      await new Promise(x => setTimeout(x, 5000));
    }
  }
}

app.listen(PORT, () => {
  console.log("Server running on " + PORT);
  start();
});
