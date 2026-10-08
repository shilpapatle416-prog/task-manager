const { testDatabaseConnection, supabase, isConfigured } = require('./supabase');

/**
 * Database connection handler for TaskFlow
 * Connects to Supabase PostgreSQL or development fallback
 */
const connectDB = async () => {
  return await testDatabaseConnection();
};

module.exports = connectDB;
module.exports.supabase = supabase;
module.exports.isConfigured = isConfigured;
