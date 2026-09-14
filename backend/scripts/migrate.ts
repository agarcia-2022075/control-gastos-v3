import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { env } from '../src/config/env.js';

const { Client } = pg;

async function runMigrations() {
  console.log('Iniciando proceso de migración de base de datos...');

  const adminClient = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    const dbCheckRes = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [env.DB_NAME]
    );

    if (dbCheckRes.rowCount === 0) {
      console.log(`Creando base de datos '${env.DB_NAME}'...`);
      await adminClient.query(`CREATE DATABASE "${env.DB_NAME}"`);
      console.log(`Base de datos '${env.DB_NAME}' creada exitosamente.`);
    } else {
      console.log(`Base de datos '${env.DB_NAME}' ya existe.`);
    }
  } catch (error) {
    console.error('Error al verificar/crear la base de datos:', error);
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  const dbClient = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  });

  try {
    await dbClient.connect();
    
    let migrationsDir = path.resolve(process.cwd(), 'backend/migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.resolve(process.cwd(), 'migrations');
    }

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`No se encontró la carpeta de migraciones en: ${migrationsDir}`);
    }

    const files = fs.readdirSync(migrationsDir).sort();
    console.log(`Directorio de migraciones: ${migrationsDir}`);

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Ejecutando migración: ${file}`);
        const sqlPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await dbClient.query(sql);
        console.log(`Migración ${file} aplicada correctamente.`);
      }
    }

    console.log('Todas las migraciones fueron ejecutadas exitosamente.');
  } catch (error) {
    console.error('Error ejecutando migraciones SQL:', error);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

runMigrations();
