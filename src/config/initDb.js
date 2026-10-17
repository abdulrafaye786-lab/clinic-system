const { initDatabase } = require('./db');

async function main() {
  try {
    await initDatabase();
    console.log('[SUCCESS] All Dream Garden PolyClinic tables and seed data created in database G_clinic!');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Database initialization failed:', err);
    process.exit(1);
  }
}

main();
