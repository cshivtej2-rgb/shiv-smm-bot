const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADOXFLY_API_KEY = process.env.ADOXFLY_API_KEY;

const TELEGRAM_API = BOT_TOKEN
  ? `https://api.telegram.org/bot${BOT_TOKEN}`
  : "";

const ADOXFLY_API = "https://adoxfly.com/api/v1";
const sessions = new Map();

app.get("/", (req, res) => res.send("Shiv SMM Bot is running"));
app.get("/health", (req, res) => res.json({ ok: true }));

async function telegram(method, data = {}) {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing");

  const response = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return response.json();
}

async function adoxfly(data) {
  if (!ADOXFLY_API_KEY) {
    throw new Error("ADOXFLY_API_KEY is missing");
  }

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

function keyboard() {
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

function validTelegramLink(text) {
  return (
    text.startsWith("https://t.me/") ||
    text.startsWith("https://telegram.me/")
  );
}

async function handleUpdate(update) {
  if (!update.message || !update.message.chat) return;

  const chatId = update.message.chat.id;
  const text = (update.message.text || "").trim();

  if (text === "/start") {
    sessions.delete(chatId);

    await send(
      chatId,
      "🔥 Welcome to Shiv SMM!\n\nChoose a service:",
      { reply_markup: keyboard() }
    );
    return;
  }

  if (text === "👁️ Telegram Views") {
    sessions.set(chatId, {
      type: "views",
      step: "link"
    });

    await send(
      chatId,
      "👁️ Telegram Views\n\nSend your public Telegram post link.\n\nExample:\nhttps://t.me/channel/123"
    );
    return;
  }

  if (text === "❤️ Telegram Reactions") {
    sessions.set(chatId, {
      type: "reactions",
      step: "link"
    });

    await send(
      chatId,
      "❤️ Telegram Reactions\n\nSend your public Telegram post link.\n\nExample:\nhttps://t.me/channel/123"
    );
    return;
  }

  if (text === "📦 My Orders") {
    await send(
      chatId,
      "📦 My Orders\n\nOrder history will be connected after the ordering system is enabled."
    );
    return;
  }

  if (text === "🔍 Check Order") {
    sessions.set(chatId, {
      type: "check",
      step: "order"
    });

    await send(chatId, "🔍 Send your Adoxfly order ID.");
    return;
  }

  if (text === "💬 Support") {
    await send(
      chatId,
      "💬 Support\n\nSend your order ID and describe your issue."
    );
    return;
  }

  const session = sessions.get(chatId);

  if (!session) return;

  if (session.type === "check" && session.step === "order") {
    try {
      const result = await adoxfly({
        action: "status",
        order: text
      });

      await send(
        chatId,
        "🔍 Order Status\n\n" +
        JSON.stringify(result, null, 2).slice(0, 3500)
      );
    } catch (error) {
      await send(
        chatId,
        "❌ Could not check the order right now."
      );

      console.log("Status error:", error.message);
    }

    sessions.delete(chatId);
    return;
  }

  if (session.step === "link") {
    if (!validTelegramLink(text)) {
      await send(
        chatId,
        "❌ Invalid link.\n\nPlease send a public Telegram link starting with https://t.me/"
      );
      return;
    }

    session.link = text;
    session.step = "quantity";

    await send(
      chatId,
      "✅ Link received.\n\nSend quantity between 5 and 100000.\n\nExample: 1000"
    );
    return;
  }

  if (session.step === "quantity") {
    const quantity = Number(text);

    if (
      !Number.isInteger(quantity) ||
      quantity < 5 ||
      quantity > 100000
    ) {
      await send(
        chatId,
        "❌ Quantity must be a whole number between 5 and 100000."
      );
      return;
    }

    session.quantity = quantity;

    if (session.type === "reactions") {
      session.step = "emoji";

      await send(
        chatId,
        "😀 Send one reaction emoji.\n\nExample: 👍"
      );
      return;
    }

    await send(
      chatId,
      "👁️ Views Request\n\n" +
      "🔗 Link: " + session.link + "\n" +
      "📦 Quantity: " + session.quantity + "\n\n" +
      "✅ Request received.\n\n" +
      "Payment and automatic order placement will be connected next."
    );

    sessions.delete(chatId);
    return;
  }

  if (
    session.type === "reactions" &&
    session.step === "emoji"
  ) {
    const emojiChars = [...text];

    if (emojiChars.length === 0) {
      await send(
        chatId,
        "❌ Please send a reaction emoji."
      );
      return;
    }

    const emoji = emojiChars[0];

    await send(
      chatId,
      "❤️ Reaction Request\n\n" +
      "🔗 Link: " + session.link + "\n" +
      "📦 Quantity: " + session.quantity + "\n" +
      "😀 Reaction: " + emoji + "\n\n" +
      "✅ Request received.\n\n" +
      "Payment and automatic order placement will be connected next."
    );

    sessions.delete(chatId);
  }
}

async function startBot() {
  if (!BOT_TOKEN) {
    console.log("ERROR: BOT_TOKEN is missing");
    return;
  }

  if (!ADOXFLY_API_KEY) {
    console.log(
      "WARNING: ADOXFLY_API_KEY is missing. Bot menu will still work."
    );
  }

  try {
    await telegram("deleteWebhook", {
      drop_pending_updates: false
    });
  } catch (error) {
    console.log("Webhook error:", error.message);
  }

  let offset = 0;

  console.log("Shiv SMM Bot started");

  while (true) {
    try {
      const result = await telegram("getUpdates", {
        offset,
        timeout: 25
      });

      if (result.ok && Array.isArray(result.result)) {
        for (const update of result.result) {
          offset = update.update_id + 1;

          try {
            await handleUpdate(update);
          } catch (error) {
            console.log(
              "Update error:",
              error.message
            );
          }
        }
      } else if (!result.ok) {
        console.log(
          "Telegram error:",
          result.description || "Unknown error"
        );

        await new Promise(resolve =>
          setTimeout(resolve, 5000)
        );
      }
    } catch (error) {
      console.log(
        "Polling error:",
        error.message
      );

      await new Promise(resolve =>
        setTimeout(resolve, 5000)
      );
    }
  }
}

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );

  startBot().catch(error =>
    console.log(
      "Bot startup error:",
      error.message
    )
  );
});
