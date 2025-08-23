const GenericWatcher = require("../../DB");
const { sendMessageToPhone } = require("../../whatsapp");

const QUERY = `--sql 

SELECT
Appointment.DoctorID,
Appointment.BranchID,
Appointment.TheTime,
Appointment.TheDate,
Doctor.ArbName,
Doctor.ClinicDepartmentID,
sp.ArbName,
sp.EngName,
Patient.Number,
Patient.Name
  from Clinic_PatientsAppointments AS Appointment
INNER JOIN dbo.Clinic_Doctors AS Doctor 
ON Appointment.DoctorID = Doctor.DoctorID AND Appointment.BranchID = Doctor.BranchID
INNER JOIN Clinic_DoctorSpecialty AS sp
 ON  Doctor.DoctorSpecialtyID = sp.ID  
 INNER JOIN Clinic_PatientsTelNumbers AS Patient 
 ON Patient.PatientID = Appointment.PatientID AND Patient.BranchID = Appointment.BranchID

`


// Table 1: Patients
const patientWatcher = new GenericWatcher({
  query: QUERY,
  idField: "PatientID", // 🔑 Specify the ID field
  messageHandlers: {
    onNew: async (records) => {
      for (const patient of records) {
        const chatId = `966${patient.Number}`;
        
        const message = `مرحباً ${patient.Name}، تم إنشاء حسابك بنجاح! رقم ملفك: ${patient.PatientID}`;
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
