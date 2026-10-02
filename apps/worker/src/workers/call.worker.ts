import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues';
import { Call } from '@cryptonion/db';
import { CallStatus } from '@cryptonion/shared';

export function initCallWorker() {
  const worker = new Worker(
    'call-queue',
    async (job: Job) => {
      console.log(`[CallWorker] Processing call job: ${job.name}, ID: ${job.id}`);

      if (job.name === 'dispatch-outbound-call') {
        const { callId, calleeNumber } = job.data;
        const call = await Call.findByPk(callId);
        if (!call) {
          throw new Error(`Call not found: ${callId}`);
        }

        console.log(`[CallWorker] Dispatching call to ${calleeNumber} via Asterisk AMI...`);
        // Simulating Asterisk AMI Originate / SIP dispatch
        await call.update({ status: CallStatus.IN_PROGRESS });
      }
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    console.log(`[CallWorker] Completed job ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[CallWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
}
