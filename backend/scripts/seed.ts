import pg from 'pg';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';

const { Client } = pg;

async function runSeed() {
  console.log('Iniciando proceso de seed individual por usuario...');

  const client = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  });

  try {
    await client.connect();

    // 1. Seed Administrator User
    let adminId: number;
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [env.ADMIN_EMAIL]
    );

    if (existingAdmin.rowCount && existingAdmin.rowCount > 0) {
      adminId = existingAdmin.rows[0].id;
    } else {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, saltRounds);

      const adminRes = await client.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Administrator', env.ADMIN_EMAIL, hashedPassword, 'ADMIN']
      );
      adminId = adminRes.rows[0].id;
      console.log(`Administrador inicial (${env.ADMIN_EMAIL}) creado exitosamente.`);
    }

    // 2. Seed Standard Demo User
    let standardUserId: number;
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['usuario@controlgastos.com']
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      standardUserId = existingUser.rows[0].id;
    } else {
      const hashedPassword = await bcrypt.hash('user123', 10);
      const userRes = await client.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Usuario Demo', 'usuario@controlgastos.com', hashedPassword, 'USER']
      );
      standardUserId = userRes.rows[0].id;
      console.log('Usuario estándar de prueba (usuario@controlgastos.com) creado exitosamente.');
    }

    // 3. Clean sample data for other users so each user has their own individual data
    const otherUsers = await client.query('SELECT id, name, email FROM users WHERE id NOT IN ($1, $2)', [adminId, standardUserId]);
    for (const u of otherUsers.rows) {
      await client.query('DELETE FROM transactions WHERE user_id = $1', [u.id]);
      await client.query('DELETE FROM payment_alerts WHERE user_id = $1', [u.id]);
      await client.query('DELETE FROM savings_goals WHERE user_id = $1', [u.id]);
    }

    // Function to seed sample financial data for demo accounts only
    const seedDemoUser = async (userId: number) => {
      const txCheck = await client.query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [userId]);
      if (parseInt(txCheck.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO transactions (user_id, type, title, merchant, category, amount, status, date) VALUES
          ($1, 'EXPENSE', 'Servidores AWS Cloud', 'Amazon Web Services', 'Infraestructura', 1250.00, 'COMPLETED', '2026-08-18'),
          ($1, 'EXPENSE', 'Suscripción Licencias JetBrains', 'JetBrains S.R.O.', 'Software', 650.00, 'COMPLETED', '2026-08-15'),
          ($1, 'INCOME', 'Reembolso Presupuestario', 'Transferencia Nómina', 'Ingresos', 2000.00, 'COMPLETED', '2026-08-10'),
          ($1, 'EXPENSE', 'Suministros de Oficina', 'Supermercado Central', 'Operativo', 420.50, 'PENDING', '2026-08-05'),
          ($1, 'INCOME', 'Nómina Primera Quincena', 'Depósito Salarial', 'Salario', 4500.00, 'COMPLETED', '2026-08-01')
        `, [userId]);
      }

      const goalCheck = await client.query('SELECT COUNT(*) FROM savings_goals WHERE user_id = $1', [userId]);
      if (parseInt(goalCheck.rows[0].count, 10) === 0) {
        await client.query(
          `INSERT INTO savings_goals (user_id, target_amount, current_amount) VALUES ($1, 10000.00, 6099.50)`,
          [userId]
        );
      }

      const alertCheck = await client.query('SELECT COUNT(*) FROM payment_alerts WHERE user_id = $1', [userId]);
      if (parseInt(alertCheck.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO payment_alerts (user_id, title, description, alert_type, is_active) VALUES
          ($1, 'Presupuesto al 80%', 'Categoría Alimentación casi alcanza el límite fijado.', 'WARNING', TRUE)
        `, [userId]);
      }
    };

    await seedDemoUser(adminId);
    await seedDemoUser(standardUserId);

    console.log('Seed procesado exitosamente: cada usuario cuenta con su propia información aislada.');

  } catch (error) {
    console.error('Error al ejecutar el seed del sistema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
