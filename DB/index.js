const sql = require("mssql");
const { client } = require("../whatsapp"); // this is the same client instance
require("dotenv").config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: { encrypt: false },
};

class TableWatcher {
  constructor() {
    this.lastId = 0;
    this.knownRecords = new Map(); // Store known records for comparison
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const pool = await sql.connect(config);
      
      // Get initial state of all records
      const result = await pool
        .request()
        .query(`SELECT * FROM Users ORDER BY id ASC`);

      // Store all existing records
      result.recordset.forEach((row) => {
        this.knownRecords.set(row.id, this.createRecordHash(row));
        this.lastId = Math.max(this.lastId, row.id);
      });

      this.isInitialized = true;
      console.log(`📊 Initialized with ${this.knownRecords.size} existing records. Last ID: ${this.lastId}`);
      
      await pool.close();
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }

  createRecordHash(record) {
    // Create a hash of the record for comparison (excluding id)
    const { id, ...recordWithoutId } = record;
    return JSON.stringify(recordWithoutId);
  }

  async pollChanges() {
    if (!this.isInitialized) {
      console.log("⏳ Waiting for initialization...");
      return;
    }

    try {
      const pool = await sql.connect(config);
      
      // Get all current records
      const result = await pool
        .request()
        .query(`SELECT * FROM Users ORDER BY id ASC`);

      const currentRecords = new Map();
      const newRecords = [];
      const updatedRecords = [];

      // Process current records
      result.recordset.forEach((row) => {
        const recordHash = this.createRecordHash(row);
        currentRecords.set(row.id, recordHash);

        if (row.id > this.lastId) {
          // New record
          newRecords.push(row);
          this.lastId = Math.max(this.lastId, row.id);
        } else if (this.knownRecords.has(row.id)) {
          // Check for updates
          if (this.knownRecords.get(row.id) !== recordHash) {
            updatedRecords.push(row);
          }
        }
      });

      // Check for deleted records
      const deletedRecords = [];
      this.knownRecords.forEach((hash, id) => {
        if (!currentRecords.has(id)) {
          deletedRecords.push({ id, wasDeleted: true });
        }
      });

      // Process changes
      await this.handleNewRecords(newRecords);
      await this.handleUpdatedRecords(updatedRecords);
      await this.handleDeletedRecords(deletedRecords);

      // Update known records
      this.knownRecords = currentRecords;
      
      await pool.close();
    } catch (err) {
      console.error("Polling error:", err);
    }
  }

  async handleNewRecords(records) {
    if (records.length === 0) return;

    console.log(`➕ ${records.length} new record(s) detected`);
    
    for (const row of records) {
      console.log("📌 New row:", row);
      
      try {
        const chatId = row.phone.replace(/\D/g, "") + "@c.us";
        await client.sendMessage(chatId, `🎉 Welcome! ${row.name}  Your account has been created successfully!`);
        console.log(`✅ Welcome message sent to ${row.phone}`);
      } catch (err) {
        console.error(`❌ Send error for new record ${row.id}:`, err);
      }
    }
  }

  async handleUpdatedRecords(records) {
    if (records.length === 0) return;

    console.log(`✏️ ${records.length} record(s) updated`);
    
    for (const row of records) {
      console.log("📝 Updated row:", row);
      
      try {
        const chatId = row.phone.replace(/\D/g, "") + "@c.us";
        await client.sendMessage(chatId, "🔄 Your account information has been updated!");
        console.log(`✅ Update notification sent to ${row.phone}`);
      } catch (err) {
        console.error(`❌ Send error for updated record ${row.id}:`, err);
      }
    }
  }

  async handleDeletedRecords(records) {
    if (records.length === 0) return;

    console.log(`🗑️ ${records.length} record(s) deleted`);
    
    for (const deletedRecord of records) {
      console.log("❌ Deleted record ID:", deletedRecord.id);
      
      // Since the record is deleted, we can't send a message to the user
      // But you could log this to another system or send notifications to admins
      console.log(`📋 Record ${deletedRecord.id} has been removed from the system`);
      
      // Example: Send notification to admin
      // await this.notifyAdmin(`User record ${deletedRecord.id} was deleted`);
    }
  }

  async notifyAdmin(message) {
    try {
      const adminPhone = process.env.ADMIN_PHONE; // Add this to your .env file
      if (adminPhone) {
        const adminChatId = adminPhone.replace(/\D/g, "") + "@c.us";
        await client.sendMessage(adminChatId, `🔔 Admin Notification: ${message}`);
        console.log("✅ Admin notification sent");
      }
    } catch (err) {
      console.error("❌ Admin notification error:", err);
    }
  }

  start() {
    console.log("🚀 Starting Table Watcher...");
    
    // Initialize first
    this.initialize().then(() => {
      // Start polling every 2 seconds
      setInterval(() => {
        this.pollChanges();
      }, 2000);
      
      console.log("👀 Watching for changes every 2 seconds...");
    });
  }
}

// Enhanced version with more granular change detection
class AdvancedTableWatcher extends TableWatcher {
  constructor() {
    super();
    this.fieldChanges = new Map(); // Track which fields changed
  }

  async handleUpdatedRecords(records) {
    if (records.length === 0) return;

    console.log(`✏️ ${records.length} record(s) updated`);
    
    for (const row of records) {
      // Get the old record to compare changes
      const oldRecordHash = this.knownRecords.get(row.id);
      const oldRecord = JSON.parse(oldRecordHash);
      const changedFields = this.getChangedFields(oldRecord, row);
      
      console.log(`📝 Updated row ${row.id}:`, {
        changedFields,
        newValues: row
      });
      
      try {
        const chatId = row.phone.replace(/\D/g, "") + "@c.us";
        let message = "🔄 Your account has been updated!\n\n";
        
        // Create specific message based on what changed
        if (changedFields.includes('phone')) {
          message += "📞 Phone number updated\n";
        }
        if (changedFields.includes('name')) {
          message += "👤 Name updated\n";
        }
        if (changedFields.includes('email')) {
          message += "📧 Email updated\n";
        }
        
        message += "\nIf you didn't make these changes, please contact support.";
        
        await client.sendMessage(chatId, message);
        console.log(`✅ Update notification sent to ${row.phone}`);
      } catch (err) {
        console.error(`❌ Send error for updated record ${row.id}:`, err);
      }
    }
  }

  getChangedFields(oldRecord, newRecord) {
    const changedFields = [];
    
    for (const [key, value] of Object.entries(newRecord)) {
      if (key === 'id') continue; // Skip ID field
      
      if (oldRecord[key] !== value) {
        changedFields.push(key);
      }
    }
    
    return changedFields;
  }
}

// Usage
const watcher = new AdvancedTableWatcher();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the watcher
watcher.start();

// Export for use in other modules if needed
module.exports = { TableWatcher, AdvancedTableWatcher };