const { OptimizedWatcher } = require("../../DB");
const { sendMessageToPhone } = require("../../whatsapp");
const { QUERIES } = require("../../constants/Queries");
const { getCompanyHeader } = require("../../services/companyService");

// Table 1: Patients
const patientWatcher = new OptimizedWatcher({
  query: QUERIES.appointments,
  idField: "AppointmentID",
  messageHandlers: {
    onNew: async (records) => {
      const companyHeader = await getCompanyHeader();

      for (const patient of records) {
        const chatId = `966${patient.Number}`;

        const message = `
مرحباً ${patient.Name}،
${companyHeader?.CompanyArbName || "العيادة"}
${companyHeader?.ArbAddress || ""}
${companyHeader?.ArbTel ? `هاتف: ${companyHeader.ArbTel}` : ""}

تم حجز موعدك بنجاح!
التاريخ: ${patient.TheDate}
الوقت: ${patient.TheTime}
الدكتور: ${patient.ArbName}
التخصص: ${patient.ArbName}

نشكر لكم ثقتكم بنا`;

        console.log("Sending message to:", chatId);
        console.log("Message:", message);
        // Uncomment to send actual message
        // await sendMessageToPhone(chatId, message);
      }
    },
  },
});

// Start the watcher
console.log("🚀 Starting Patient Watcher...");
patientWatcher.start(5000); // Check every 5 seconds

module.exports = {
  patientWatcher,
};
