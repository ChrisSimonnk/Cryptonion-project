import { connectDB } from './client';
import { migrationRunner } from './migrations/runner';

async function main() {
  const command = process.argv[2] || 'up';
  await connectDB();

  switch (command) {
    case 'up': {
      console.log('Running pending database migrations...');
      const applied = await migrationRunner.up();
      if (applied.length === 0) {
        console.log('Database schema is already up to date.');
      } else {
        console.log(`Successfully applied ${applied.length} migration(s):`, applied);
      }
      break;
    }
    case 'down': {
      console.log('Rolling back last database migration...');
      const rolledBack = await migrationRunner.down();
      if (!rolledBack) {
        console.log('No migrations to roll back.');
      } else {
        console.log(`Successfully rolled back: ${rolledBack}`);
      }
      break;
    }
    case 'status': {
      const status = await migrationRunner.status();
      console.log('--- Database Migration Status ---');
      console.log('Executed:', status.executed);
      console.log('Pending:', status.pending);
      break;
    }
    case 'reset': {
      console.log('Resetting all migrations...');
      const allRolledBack = await migrationRunner.reset();
      console.log('Rolled back all migrations:', allRolledBack);
      break;
    }
    default:
      console.error(`Unknown migration command: ${command}. Use 'up', 'down', 'status', or 'reset'.`);
      process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}
