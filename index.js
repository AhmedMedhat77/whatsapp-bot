const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { patientWatcher } = require("./models/patients/index.js");
const { milSecondsToMinutes } = require("./utils/timers/index.js");
require("./whatsapp.js");
require("./DB/index.js");

const app = express();
const port = 3000;

app.use(bodyParser.json());

// === INIT ===

patientWatcher.start(milSecondsToMinutes(1));

app.listen(port, () => {
  console.log(`WhatsApp bot listening at http://localhost:${port}`);
});
