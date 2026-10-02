import { initDatabase } from '@cryptonion/db';
import { initCallWorker } from './workers/call.worker';
import { initAIWorker, initDocumentWorker } from './workers/ai.worker';

async function startWorkers() {
  try {
    console.log('Connecting workers to PostgreSQL and Redis...');
    await initDatabase();

    const callWorker = initCallWorker();
    const aiWorker = initAIWorker();
    const documentWorker = initDocumentWorker();

    console.log('=======================================================');
    console.log('⚡ Cryptonion Background BullMQ Workers Active:');
    console.log('   - Call Dispatcher Worker');
    console.log('   - AI Summarizer & Analytics Worker');
    console.log('   - Document Embedding & RAG Worker');
    console.log('=======================================================');

    const shutdown = async () => {
      console.log('Shutting down BullMQ workers...');
      await Promise.all([callWorker.close(), aiWorker.close(), documentWorker.close()]);
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Failed to start BullMQ workers:', err);
    process.exit(1);
  }
}

startWorkers();
