const qrCode = require("qrcode-terminal");

// === CONFIG ===
const MESSAGE_DELAY_MS = 5000; // 5s delay between bulk messages

const { Client, LocalAuth } = require("whatsapp-web.js");

// === INIT CLIENT ===
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
  headless: false,
});

// === FUNCTION: send message to one phone ===
async function sendMessageToPhone(number, message) {
  try {
    if (!number) return console.error("⚠️ Phone number missing");
    const chatId = `${number}@c.us`;

    await client.sendMessage(chatId, message);
    console.log(`✅ Message sent to ${number}`);
  } catch (err) {
    console.error(`❌ Failed to send to ${number}:`, err.message);
  }
}

// === FUNCTION: send bulk messages (from array or DB) ===
async function sendBulkMessages(contacts) {
  console.log(`📋 Found ${contacts.length} contacts to message`);

  for (const contact of contacts) {
    if (!contact.number) continue;

    let message = contact.message || "Hello from bot 👋";

    if (contact.name) {
      message = message.replace(/\{name\}/g, contact.name);
    }

    await sendMessageToPhone(contact.number, message);

    // Delay between messages
    await new Promise((resolve) => setTimeout(resolve, MESSAGE_DELAY_MS));
  }

  console.log("✅ Bulk messaging completed!");
}

// === EVENTS ===
client.on("qr", (qr) => {
  qrCode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("✅ WhatsApp client is ready!");

  // Example: send to one phone directly
  // await sendMessageToPhone("966532717413", "Hello Ahmed! This is a test 🚀");

  // Example: bulk messages
  /*
  const contacts = [
    { number: "966532717413", name: "Ahmed", message: "Hi {name}, how are you?" },
    { number: "201234567890", name: "Ali", message: "Hello {name}, welcome!" }
  ];
  await sendBulkMessages(contacts);
  */
});

client.on("message", async (message) => {
  const command = message.body.toLowerCase().trim();

  if (command === "ping") {
    await message.reply("pong");
  } else if (command === "start bulk") {
    await message.reply("Starting bulk messaging...");
    const contacts = [
      { number: "966532717413", name: "Ahmed", message: "Hi {name}, this is bulk test!" },
    ];
    await sendBulkMessages(contacts);
  } else if (command === "send test") {
    await sendMessageToPhone("966532717413", "This is a test message 🚀");
  }
});

// === INIT ===
client.initialize();

process.on("SIGINT", () => {
  console.log("Shutting down...");
  client.destroy();
  process.exit(0);
});

// Export if needed
module.exports = { client, sendMessageToPhone, sendBulkMessages };
