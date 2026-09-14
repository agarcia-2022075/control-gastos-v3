import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD
});

export const checkDatabaseConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    client.release();
    console.log('Base de datos conectada correctamente');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al conectar a PostgreSQL';
    console.error(`Error al conectar con PostgreSQL (${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}): ${errorMessage}`);
    throw error;
  }
};
