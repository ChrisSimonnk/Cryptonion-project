import { buildApp } from './app';
import { config } from './config/env';
import { initDatabase } from '@cryptonion/db';

async function startServer() {
  try {
    console.log('Connecting to PostgreSQL & initializing database models...');
    await initDatabase();

    const app = await buildApp();

    await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`=======================================================`);
    console.log(`🚀 Cryptonion Fastify API running on http://${config.host}:${config.port}`);
    console.log(`📖 Interactive Swagger Docs available at http://localhost:${config.port}/docs`);
    console.log(`=======================================================`);
  } catch (err) {
    console.error('Fatal error starting Fastify server:', err);
    process.exit(1);
  }
}

startServer();
