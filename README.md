# control-gastos

## 📌 Descripción del Proyecto
`control-gastos` es una aplicación web full-stack diseñada para la gestión y seguimiento eficiente de gastos personales o empresariales. El sistema cuenta con una arquitectura desacoplada construida sobre Angular en el frontend y Express/PostgreSQL en el backend, protegida íntegramente mediante tokens **JSON Web Token (JWT)** y autorización basada en roles (**`ADMIN`** y **`USER`**).

---

## 🚀 Tecnologías Utilizadas

### Frontend
- **Angular** (TypeScript, HTML, CSS)
- **Angular Router** (Navegación lazy-loaded con `authGuard` y `roleGuard`)
- **HttpClient** con Interceptores HTTP (`authInterceptor`)
- **Reactive Forms** con validaciones avanzadas en tiempo real
- **sessionStorage** para persistencia de sesión segura

### Backend
- **Node.js** & **Express**
- **TypeScript**
- **PostgreSQL** (Driver `pg`)
- **JSON Web Token (`jsonwebtoken`)**
- **bcryptjs** (Hashing de contraseñas con salado de 10 rondas)

### Gestor de Paquetes
- **pnpm** (Monorepo con `pnpm-workspace.yaml`)

---

## 🏗️ Arquitectura y Seguridad

```text
                                CONTROL DE GASTOS

                             ┌─────────────────────┐
                             │   Angular Frontend  │
                             └──────────┬──────────┘
                                        │  HTTP (Bearer JWT)
                                        ▼
                             ┌─────────────────────┐
                             │ Express Backend API │
                             └──────────┬──────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       ▼                                 ▼
           ┌──────────────────────┐           ┌────────────────────┐
           │  JWT Authentication  │           │ Role Authorization │
           │  (401 Unauthorized)  │           │   (403 Forbidden)  │
           └──────────────────────┘           └─────────┬──────────┘
                                                        │
                                                        ▼
                                             ┌────────────────────┐
                                             │ PostgreSQL Database│
                                             └────────────────────┘
```

### Seguridad del Sistema
1. **Autenticación (401 Unauthorized)**: Verificación del token JWT recibido en el encabezado `Authorization: Bearer <token>`. Si falta o expiró, el servidor responde HTTP 401 y el frontend ejecuta un auto-logout limpio hacia `/login`.
2. **Autorización (403 Forbidden)**: El middleware `role.middleware.ts` valida el rol en PostgreSQL en tiempo real antes de conceder acceso a endpoints restringidos. Si un usuario `USER` intenta acceder a rutas administrativas, el servidor retorna HTTP 403.
3. **Backend como Autoridad Final**: El frontend oculta o muestra enlaces para mejorar la experiencia de usuario, pero el backend protege todos los recursos de forma estricta.

---

## 📡 Endpoints Oficiales de la API

| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Público | Comprobación de salud del servidor |
| `POST` | `/api/auth/register` | Público | Registro público de usuarios (siempre rol `USER`) |
| `POST` | `/api/auth/login` | Público | Autenticación y generación de JWT |
| `GET` | `/api/auth/me` | `authenticateJwt` | Retorna los datos del usuario autenticado |
| `GET` | `/api/admin/test` | `authenticateJwt` + `authorizeRole('ADMIN')` | Prueba exclusiva para administradores |
| `GET` | `/api/users` | `authenticateJwt` + `authorizeRole('ADMIN')` | Listado seguro de usuarios (sin contraseñas) |
| `PATCH` | `/api/users/:id/role` | `authenticateJwt` + `authorizeRole('ADMIN')` | Cambio de rol (`USER` ↔ `ADMIN`) |

---

## 🛠️ Instalación y Configuración

### 1. Requisitos Previos
- **Node.js** (v18.0.0 o superior)
- **pnpm** (v8.0.0 o superior)
- **PostgreSQL** (v12.0 o superior)

### 2. Variables de Entorno (`.env`)
Crear el archivo `.env` en la raíz del proyecto basado en `.env.example`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=control_gastos
DB_USER=postgres
DB_PASSWORD=admin
JWT_SECRET=secreto_desarrollo_control_gastos_2026
JWT_EXPIRES_IN=1h
```

### 3. Instalación de Dependencias
```bash
pnpm install
```

### 4. Migración de Base de Datos y Semilla Inicial
```bash
# Crear la tabla users en PostgreSQL:
pnpm --filter backend run db:migrate

# Ejecutar el seed para crear el usuario ADMIN inicial (admin@controlgastos.com / admin123):
pnpm --filter backend run db:seed
```

---

## 💻 Comandos de Ejecución

- **Desarrollo completo (Frontend + Backend):**
  ```bash
  pnpm run dev
  ```
- **Desarrollo solo Frontend (http://localhost:4200):**
  ```bash
  pnpm run dev:frontend
  ```
- **Desarrollo solo Backend (http://localhost:3000):**
  ```bash
  pnpm run dev:backend
  ```
- **Compilación de todo el proyecto:**
  ```bash
  pnpm run build
  ```

---

## 🧪 Pruebas Funcionales Integrales

Para realizar las pruebas de extremo a extremo:
1. Iniciar los servidores con `pnpm run dev`.
2. **Registro de Usuario**: Acceder a `http://localhost:4200/register`, registrar una cuenta. Se creará automáticamente con rol `USER`.
3. **Login de Usuario**: Iniciar sesión en `http://localhost:4200/login`. Se guardará el JWT en `sessionStorage` y se redirigirá a `/dashboard`.
4. **Prueba de Permisos**: Intentar ingresar directamente a `http://localhost:4200/admin`. El `roleGuard` rechazará el acceso y devolverá al usuario a `/dashboard`.
5. **Login de Admin**: Iniciar sesión con `admin@controlgastos.com` / `admin123`.
6. **Panel de Administración**: Acceder a `http://localhost:4200/admin`, donde se mostrará la lista de usuarios y la opción para modificar roles (`USER` ↔ `ADMIN`).

---

## 🌿 Estructura de Ramas Git

```text
main
  │
  └── develop
        │
        └── agarcia-2022075
```
- **`agarcia-2022075`**: Rama activa de desarrollo donde se realizan las fases del proyecto.
