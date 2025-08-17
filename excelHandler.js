const XLSX = require("xlsx");

class ExcelHandler {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async readContacts() {
    try {
      const workbook = XLSX.readFile(this.filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON
      const data = XLSX.utils.sheet_to_json(worksheet);
      // Expected format: [{number: '1234567890', name: 'John', message: 'Hello {name}!'}, ...]
      return data.map((contact) => ({
        number: String(contact.number || contact.phone || contact.Phone || "").replace(
          /[^0-9]/g,
          ""
        ),
        name: contact.name || contact.Name || "",
        message: contact.message || contact.Message || "",
      }));
    } catch (error) {
      console.error("Error reading Excel file:", error);
      throw error;
    }
  }
}

module.exports = ExcelHandler;
