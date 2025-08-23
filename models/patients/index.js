const { QUERIES } = require("../../constants/Queries");
const { OptimizedWatcher } = require("../../DB");
const { sendMessageToPhone } = require("../../whatsapp");
const { getCompanyHeader } = require("../../services/companyService");

// Table 1: Patients
const patientWatcher = new OptimizedWatcher({
  query: QUERIES.patientTel,
  idField: "PatientID",
  messageHandlers: {
    onNew: async (records) => {
      const companyHeader = await getCompanyHeader();

      for (const patient of records) {
        const chatId = `966${patient.Number}`;
        const message = `
 مرحباً ${patient.Name}،

يسعدنا انضمامكم إلى *${companyHeader?.CompanyArbName || "العيادة"}*  
📍 العنوان: ${companyHeader?.ArbAddress || "غير متوفر"}  
${companyHeader?.ArbTel ? `📞 الهاتف: ${companyHeader.ArbTel}` : ""}

✅ تم إنشاء حسابكم بنجاح.  
🔖 رقم الملف: ${patient.PatientID}

نشكر لكم ثقتكم ونتمنى لكم دوام الصحة والعافية 🌹
        `.trim();

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
