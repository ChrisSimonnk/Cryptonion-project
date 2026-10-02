import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3001', 10),
  host: process.env.API_HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_cryptonion_jwt_key_32bytes_minimum_length_required',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
  embeddingModel: process.env.EMBEDDING_MODEL || (process.env.EMBEDDING_PROVIDER === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small'),
  vectorDimension: parseInt(process.env.VECTOR_DIMENSION || (process.env.EMBEDDING_PROVIDER === 'ollama' ? '768' : '1536'), 10),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
};
