import app from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './config/database.js';

async function startServer() {
  await checkDatabaseConnection();
  app.listen(env.PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${env.PORT}`);
  });
}

startServer().catch((error) => {
  console.error('No se pudo iniciar el servidor debido a un error de conexión:', error);
});
