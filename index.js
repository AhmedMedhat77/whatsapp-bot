const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("./whatsapp.js");
require("./DB/index.js");

const app = express();
const port = 3000;
const WHAPI_CLOUD_TOKEN = "YOUR_WHAPI_CLOUD_TOKEN"; // Replace with your token

app.use(bodyParser.json());

app.post("/webhook", async (req, res) => {
  const message = req.body.messages[0]; // Assuming Whapi.Cloud structure
  if (message && message.body === "!hello") {
    try {
      await axios.post(
        "https://gate.whapi.cloud/messages/text",
        {
          to: message.chatId,
          body: "Hello from your bot!",
        },
        {
          headers: {
            Authorization: `Bearer ${WHAPI_CLOUD_TOKEN}`,
          },
        }
      );
    } catch (error) {
      console.error("Error sending message:", error.response ? error.response.data : error.message);
    }
  }
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`WhatsApp bot listening at http://localhost:${port}`);
});
