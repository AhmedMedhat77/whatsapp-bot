const GenericWatcher = require("../../DB");
const { sendMessageToPhone } = require("../../whatsapp");

// Table 1: Patients
const patientWatcher = new GenericWatcher({
  query: "SELECT * FROM Clinic_PatientsTelNumbers ORDER BY PatientID ASC",
  idField: "PatientID", // 🔑 Specify the ID field
  messageHandlers: {
    onNew: async (records) => {
      for (const patient of records) {
        const chatId = `966${patient.Number}`;
        const message = `مرحباً ${patient.Name}، تم إنشاء حسابك بنجاح! رقم ملفك: ${patient.PatientID}`;
        await sendMessageToPhone(chatId, message);
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
