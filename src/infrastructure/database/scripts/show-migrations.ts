import { AppDataSource } from '../postgres/data-source';

async function showMigrations() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    const migrations = await AppDataSource.showMigrations();

    if (migrations) {
      console.log('⚠️  There are pending migrations to run');
    } else {
      console.log('✅ All migrations have been run');
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to show migrations:', error);
    process.exit(1);
  }
}

showMigrations();
