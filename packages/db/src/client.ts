import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

// Load .env if not loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbName = process.env.DB_NAME || 'cryptonion';
const dbUser = process.env.DB_USER || 'cryptonion';
const dbPassword = process.env.DB_PASSWORD || 'cryptonion_secret';

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? false : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    // SSL or custom config if required
  },
});

export async function connectDB(): Promise<Sequelize> {
  try {
    await sequelize.authenticate();
    // Register pgvector extension if not exists
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    return sequelize;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
}
