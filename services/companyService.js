const { QUERIES } = require("../constants/Queries");
const { sql } = require("../DB");

let companyHeaderData = null;

const getCompanyHeader = async () => {
  if (companyHeaderData) {
    return companyHeaderData;
  }

  try {
    const result = await sql.query(QUERIES.companyHeader);

    if (result.recordset.length > 0) {
      companyHeaderData = result.recordset[0];
      return companyHeaderData;
    }

    return null;
  } catch (error) {
    console.error("Error fetching company header:", error);
    throw error;
  }
};

const refreshCompanyHeader = async () => {
  companyHeaderData = null;
  return getCompanyHeader();
};

module.exports = {
  getCompanyHeader,
  refreshCompanyHeader,
};
