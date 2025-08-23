const QUERIES = {
  companyHeader: `SELECT pic,CompanyArbName,CompanyEngName,ArbAddress,EngAddress ,ArbTel,EngTel  FROM dbo.CompanyHeader`,
  appointments: `--sql 
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
 ON Patient.PatientID = Appointment.PatientID AND Patient.BranchID = Appointment.BranchID`,
  patientTel: `SELECT * FROM Clinic_PatientsTelNumbers ORDER BY PatientID ASC`,
};

module.exports = { QUERIES };
