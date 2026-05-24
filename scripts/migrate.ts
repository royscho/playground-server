import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate(): Promise<void> {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? 'secret',
    database: process.env.MYSQL_DATABASE ?? 'playground',
    multipleStatements: true,
  });

  const migrationsDir = path.join(__dirname, '../src/infra/db/migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  // Ensure migrations_run table exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS migrations_run (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const file of files) {
    const [rows] = await conn.execute(
      'SELECT id FROM migrations_run WHERE name = ? LIMIT 1',
      [file],
    ) as [{ id: number }[], unknown];

    if (rows.length > 0) {
      console.log(`  skip: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await conn.query(sql);
    await conn.execute('INSERT IGNORE INTO migrations_run (name) VALUES (?)', [file]);
    console.log(`  ran: ${file}`);
  }

  await conn.end();
  console.log('Migrations complete.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
