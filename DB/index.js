const sql = require("mssql");
const { client } = require("../whatsapp");
require("dotenv").config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  },
};

let poolPromise = null;

const connectDB = async () => {
  if (!poolPromise) {
    poolPromise = sql
      .connect(config)
      .then((pool) => {
        console.log("✅ Connected to SQL Server");
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        console.error("❌ Database connection failed:", err);
        throw err;
      });
  }
  return poolPromise;
};

class OptimizedWatcher {
  constructor({ query, messageHandlers, idField, enableUpdates = true, enableDeletes = false }) {
    this.baseQuery = query;
    this.messageHandlers = messageHandlers;
    this.idField = idField;
    this.enableUpdates = enableUpdates;
    this.enableDeletes = enableDeletes;

    this.lastId = 0;
    this.knownRecords = enableUpdates ? new Map() : null;
    this.isInitialized = false;
    this.skipNextPoll = true;
    this.pool = null;
    this.isPolling = false;
    this.pollInterval = null;
  }

  async initialize() {
    try {
      console.log("🔑 Using ID field:", this.idField);
      console.log("🎛️ Updates enabled:", this.enableUpdates);
      console.log("🎛️ Deletes enabled:", this.enableDeletes);

      // Create connection pool once
      this.pool = await connectDB();

      // Get initial state efficiently
      const maxIdQuery = this.getMaxIdQuery();
      const maxResult = await this.pool.request().query(maxIdQuery);

      if (maxResult.recordset.length > 0 && maxResult.recordset[0].maxId !== null) {
        this.lastId = maxResult.recordset[0].maxId;
        console.log(`🔍 Found max ${this.idField}: ${this.lastId}`);

        // Only load full records if we need to track updates/deletes
        if (this.enableUpdates || this.enableDeletes) {
          await this.loadInitialRecords();
        }
      } else {
        console.log("📊 No existing records found");
      }

      this.isInitialized = true;
      console.log(`✅ Initialized watcher efficiently`);
    } catch (err) {
      console.error(`❌ Initialization error:`, err);
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
      }
    }
  }

  getMaxIdQuery() {
    // Extract table name from query (simple approach)
    const fromMatch = this.baseQuery.match(/FROM\s+(\w+)/i);
    const tableName = fromMatch ? fromMatch[1] : null;

    if (tableName) {
      return `SELECT MAX(${this.idField}) as maxId FROM ${tableName}`;
    } else {
      // Fallback: use subquery (less efficient but works with complex queries)
      return `SELECT MAX(${this.idField}) as maxId FROM (${this.baseQuery}) as subquery`;
    }
  }

  async loadInitialRecords() {
    if (!this.knownRecords) return;

    const result = await this.pool.request().query(this.baseQuery);
    console.log(`📊 Loaded ${result.recordset.length} initial records for change tracking`);

    result.recordset.forEach((row) => {
      if (row.hasOwnProperty(this.idField)) {
        this.knownRecords.set(row[this.idField], this.createRecordHash(row));
      }
    });
  }

  createRecordHash(record) {
    // More efficient hashing - only for fields that might change
    const copy = { ...record };
    delete copy[this.idField];
    // Remove timestamp fields that always change
    delete copy.CreatedAt;
    delete copy.UpdatedAt;
    delete copy.created_at;
    delete copy.updated_at;
    delete copy.LastModified;
    delete copy.last_modified;

    return JSON.stringify(copy);
  }

  async pollChanges() {
    if (!this.isInitialized || this.isPolling) return;

    if (this.skipNextPoll) {
      this.skipNextPoll = false;
      console.log(`⏭️ Skipping first poll`);
      return;
    }

    this.isPolling = true;

    try {
      // 🚀 Only query for NEW records (much faster)
      const newRecordsQuery = this.getNewRecordsQuery();
      const newResult = await this.pool.request().query(newRecordsQuery);

      const newRecords = newResult.recordset;

      if (newRecords.length > 0) {
        console.log(`✨ Found ${newRecords.length} new records`);

        // Update lastId
        const maxNewId = Math.max(...newRecords.map((r) => r[this.idField]));
        this.lastId = Math.max(this.lastId, maxNewId);

        // Handle new records
        if (this.messageHandlers.onNew) {
          console.log(`📨 Calling onNew handler with ${newRecords.length} records`);
          try {
            await this.messageHandlers.onNew(newRecords, client);
            console.log(`✅ onNew handler completed successfully`);
          } catch (handlerError) {
            console.error(`❌ onNew handler error:`, handlerError);
          }
        }

        // Add to known records if tracking changes
        if (this.knownRecords) {
          newRecords.forEach((row) => {
            this.knownRecords.set(row[this.idField], this.createRecordHash(row));
          });
        }
      }

      // 🔍 Only check for updates/deletes if enabled and we have baseline
      if ((this.enableUpdates || this.enableDeletes) && this.knownRecords) {
        await this.checkForUpdatesAndDeletes();
      }
    } catch (err) {
      console.error(`❌ Polling error:`, err);
    } finally {
      this.isPolling = false;
    }
  }

  getNewRecordsQuery() {
    // Optimize: only get records with ID > lastId
    const whereClause = `WHERE ${this.idField} > ${this.lastId}`;

    if (this.baseQuery.toLowerCase().includes("where")) {
      // Add to existing WHERE clause
      return this.baseQuery.replace(/WHERE/i, `${whereClause} AND`);
    } else {
      // Add WHERE clause before ORDER BY
      if (this.baseQuery.toLowerCase().includes("order by")) {
        return this.baseQuery.replace(/ORDER BY/i, `${whereClause} ORDER BY`);
      } else {
        return `${this.baseQuery} ${whereClause}`;
      }
    }
  }

  async checkForUpdatesAndDeletes() {
    // This is less frequent and only runs if explicitly enabled
    const result = await this.pool.request().query(this.baseQuery);
    const currentRecords = new Map();
    const updatedRecords = [];

    result.recordset.forEach((row) => {
      if (!row.hasOwnProperty(this.idField)) return;

      const recordHash = this.createRecordHash(row);
      currentRecords.set(row[this.idField], recordHash);

      // Check for updates (only existing records)
      if (
        this.enableUpdates &&
        row[this.idField] <= this.lastId &&
        this.knownRecords.has(row[this.idField])
      ) {
        const oldHash = this.knownRecords.get(row[this.idField]);
        if (oldHash !== recordHash) {
          updatedRecords.push(row);
          console.log(`📝 UPDATED RECORD detected - ${this.idField}: ${row[this.idField]}`);
        }
      }
    });

    // Handle updates
    if (updatedRecords.length > 0 && this.messageHandlers.onUpdate) {
      console.log(`📨 Calling onUpdate handler with ${updatedRecords.length} records`);
      try {
        await this.messageHandlers.onUpdate(updatedRecords, client);
        console.log(`✅ onUpdate handler completed successfully`);
      } catch (handlerError) {
        console.error(`❌ onUpdate handler error:`, handlerError);
      }
    }

    // Check for deletes
    if (this.enableDeletes) {
      const deletedRecords = [];
      this.knownRecords.forEach((_, id) => {
        if (!currentRecords.has(id)) {
          deletedRecords.push({ [this.idField]: id });
          console.log(`🗑️ DELETED RECORD detected - ${this.idField}: ${id}`);
        }
      });

      if (deletedRecords.length > 0 && this.messageHandlers.onDelete) {
        console.log(`📨 Calling onDelete handler with ${deletedRecords.length} records`);
        try {
          await this.messageHandlers.onDelete(deletedRecords, client);
          console.log(`✅ onDelete handler completed successfully`);
        } catch (handlerError) {
          console.error(`❌ onDelete handler error:`, handlerError);
        }
      }
    }

    // Update known records
    this.knownRecords = currentRecords;
  }

  start(interval = 5000) {
    console.log(`👀 Starting optimized watcher with ${interval}ms interval...`);
    this.initialize().then(() => {
      this.pollInterval = setInterval(() => this.pollChanges(), interval);
    });
  }

  async stop() {
    console.log("🛑 Stopping watcher...");

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }

    console.log("✅ Watcher stopped");
  }
}

module.exports = {OptimizedWatcher, sql ,connectDB};
