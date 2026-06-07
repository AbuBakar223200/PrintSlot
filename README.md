# PrintSlot Monorepo Setup & Execution Guide

Welcome to **PrintSlot**, a monorepo containing the NestJS backend API, React Native (Expo) mobile app, and a shared packages module.

---

## 📋 Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18 or higher recommended)
* **npm** (v9 or higher)
* **PostgreSQL Database** (typically hosted via Supabase)
* **Expo Go** app on your physical device (or an iOS/Android Simulator setup)

---

## ⚙️ Environment Configuration

Before running the application, you must set up the environment files.

### 1. API Environment Variables (`apps/api/.env`)
Create `apps/api/.env` and fill in the required credentials:
```env
DATABASE_URL=             # PostgreSQL connection string (direct connection)
SUPABASE_URL=             # Supabase project URL
SUPABASE_ANON_KEY=        # Supabase anonymous key
SUPABASE_SERVICE_KEY=     # Supabase service role key (for auth/seeding)
JWT_SECRET=               # Supabase JWT Secret (for NestJS authentication)
CLOUDINARY_CLOUD_NAME=    # Cloudinary Cloud Name
CLOUDINARY_API_KEY=       # Cloudinary API Key
CLOUDINARY_API_SECRET=    # Cloudinary API Secret
ADMIN_EMAIL=admin@printslot.com
ADMIN_PASSWORD=ChangeMe123!
```

### 2. Mobile Environment Variables (`apps/mobile/.env`)
Create `apps/mobile/.env` with:
```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🗄️ Database Setup (Migrations, Generation & Seeding)

All database actions are managed from the `apps/api` workspace. Navigate to the API folder first:
```bash
cd apps/api
```

### 1. Generate Prisma Client
Whenever you update the Prisma schema or clone the project for the first time, generate the client:
```bash
npx prisma generate
```

### 2. Run Database Migrations
To apply existing migrations or deploy schema updates to your local/remote database:
* **For Development (interactive):**
  ```bash
  npx prisma migrate dev --name init
  ```
* **For Production/Deployment (non-interactive):**
  ```bash
  npx prisma migrate deploy
  ```

### 3. Seed the Database
Populates the database with test accounts, active shops, slot templates, and wallet credits:
```bash
npx prisma db seed
```
*(Seeded accounts include: Customer, Shop Owner, Staff, and Platform Admin)*

---

## 🚀 Running the Project

You can run applications in parallel from the root directory or start workspaces individually.

### 1. Run Everything (Root)
Start the NestJS API server and the Expo Mobile dev server in parallel:
```bash
npm run dev
```

### 2. Run NestJS API Only
```bash
cd apps/api
npm run dev
```
The server will run on [http://localhost:3001](http://localhost:3001).

### 3. Run Expo Mobile Only
```bash
cd apps/mobile
npx expo start
```
Use `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with your Expo Go app.

### 4. Build Shared Package Only
```bash
cd packages/shared
npm run build
```

---

## 🧪 Running Tests

### Run all tests across the monorepo:
```bash
npm run test
```

### Run API-specific tests:
```bash
cd apps/api
npm run test
```

### Run specific API module tests:
```bash
npm run test -- --testPathPattern=orders
```
