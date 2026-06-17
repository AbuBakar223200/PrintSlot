# PrintSlot

PrintSlot is a mobile app for campus print shops. A student uploads files from their phone, sets the print options, sees the price, and then either joins a live queue or books a pickup time. The shop sees the job on its own screen and moves it through clear steps until it is ready. The student gets updates the whole way.

This README is the main guide to the project. It explains what the app does, how it is built, and how to run it. Deeper details live in the [`docs/`](docs) folder, linked near the end.

---

## Table of contents

1. [What problem it solves](#what-problem-it-solves)
2. [Who uses it](#who-uses-it)
3. [Main features](#main-features)
4. [How an order works](#how-an-order-works)
5. [Tech stack](#tech-stack)
6. [Project structure](#project-structure)
7. [Getting started](#getting-started)
8. [Running the project](#running-the-project)
9. [Running tests](#running-tests)
10. [How the API works](#how-the-api-works)
11. [Documentation map](#documentation-map)
12. [User research](#user-research)
13. [Team](#team)

---

## What problem it solves

Getting something printed on campus is slow. You wait in line. You read out your settings to a busy staff member. You only find out the price at the end. Mistakes are common, and you often pay for the wrong print anyway.

The shop side is hard too. Staff keep a messy pile of jobs in their head. They guess when each one will be ready. They answer the same question all day: "is mine done yet?"

PrintSlot fixes this. The whole order lives on the phone. The print options are saved in writing. The price is shown before you confirm. The job moves through clear stages, and the customer is told the moment it is ready. The shop gets an ordered job list instead of a pile.

---

## Who uses it

The app has four roles. Each role sees a different part of the app.

| Role | What they can do |
|---|---|
| **Customer** | Browse shops, upload files, set print options, pay, and track orders. |
| **Staff** | See the shop's job list, move jobs through stages, and view files. |
| **Shop Owner** | Everything staff can do, plus set prices, manage time slots, manage staff, and view daily numbers. |
| **Platform Admin** | Approve or reject shops, manage app-wide settings and slot templates, and view platform numbers. |

---

## Main features

- **Per-file print options.** Each file has its own color mode, paper size, orientation, copies, duplex, and page range.
- **Price shown first.** The server works out the price from the shop's rates. The customer sees the total before paying. No surprises at pickup.
- **Two ways to order.** Join a live queue with "Print Now," or book a future time with "Schedule Pickup."
- **Live tracking.** The order status updates on the phone in real time over WebSocket, with a 30-second poll as a backup.
- **Ready-time estimate (ETA).** The app estimates how long the order will take, based on the shop's recent jobs.
- **Wallet and cash.** Pay from an in-app wallet or pay cash at pickup.
- **Push notifications.** Customers and shops get alerts for new orders, status changes, and low balance.
- **Two languages.** Every screen works in English and Bengali, with a switch.

---

## How an order works

**Print Now (live queue)**

1. Pick a shop.
2. Upload one to ten files.
3. Set the print options for each file.
4. Check the price.
5. Pay with the wallet or choose cash.
6. Join the queue. The order gets a number like `PS-00001`.
7. Watch the status change as staff work on it.
8. Show the order number at the counter to pick up.

**Schedule Pickup (booked slot)**

1. Pick a shop.
2. Pick a date and an open time slot (up to three days ahead).
3. Upload files and set options, same as above.
4. Check the price and pay.
5. Come back during the slot to pick up.

A customer can cancel while the order is still queued or scheduled. Wallet payments are refunded on cancel.

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | React Native with Expo Router (managed workflow) |
| API | NestJS (REST + WebSocket) |
| Database | Supabase PostgreSQL through Prisma ORM |
| Auth | Supabase Auth (JWT) |
| File storage | Cloudinary |
| Real-time | socket.io |
| Push | Expo Notifications |
| Languages | i18next (English + Bengali) |
| Monorepo | Turborepo with npm workspaces |
| Hosting | Render (API) and Expo EAS (mobile) |

---

## Project structure

This is a monorepo. The two apps never import from each other. They share types and constants through one package.

```
PrintSlot/
├── apps/
│   ├── api/          NestJS REST + WebSocket server
│   └── mobile/       React Native (Expo Router) app
├── packages/
│   └── shared/       @printslot/shared — shared types and constants only
├── docs/             Full project documentation
├── turbo.json        Build order: shared → api + mobile
└── package.json      Workspace root
```

Turborepo builds `packages/shared` first. Both apps depend on it.

---

## Getting started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **PostgreSQL** database (Supabase works well)
- The **Expo Go** app on your phone, or an iOS/Android simulator

### Install

From the project root:

```bash
npm install
```

### Environment variables

Create two `.env` files before you run anything.

**`apps/api/.env`**

```env
DATABASE_URL=             # PostgreSQL connection string (direct connection)
SUPABASE_URL=             # Supabase project URL
SUPABASE_ANON_KEY=        # Supabase anonymous key
SUPABASE_SERVICE_KEY=     # Supabase service role key (auth + seeding)
JWT_SECRET=               # Supabase JWT secret (for NestJS auth)
CLOUDINARY_CLOUD_NAME=    # Cloudinary cloud name
CLOUDINARY_API_KEY=       # Cloudinary API key
CLOUDINARY_API_SECRET=    # Cloudinary API secret
ADMIN_EMAIL=admin@printslot.com
ADMIN_PASSWORD=ChangeMe123!
```

**`apps/mobile/.env`**

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database setup

All database work runs from the API workspace.

```bash
cd apps/api

npx prisma generate          # Build the Prisma client (run after a fresh clone)
npx prisma migrate dev       # Apply migrations to your database
npx prisma db seed           # Add test accounts, shops, slots, and wallet credit
```

The seed creates one account per role: Customer, Staff, Shop Owner, and Platform Admin.

For a deployed database, use `npx prisma migrate deploy` instead of `migrate dev`.

---

## Running the project

### Run everything (from the root)

Starts the API and the mobile dev server together:

```bash
npm run dev
```

### Run the API only

```bash
cd apps/api
npm run dev
```

The API runs on [http://localhost:3001](http://localhost:3001).

### Run the mobile app only

```bash
cd apps/mobile
npx expo start
```

Press `i` for the iOS simulator, `a` for the Android emulator, or scan the QR code with Expo Go.

### Build the shared package only

```bash
cd packages/shared
npm run build
```

---

## Running tests

Run all tests across the monorepo:

```bash
npm run test
```

Run the API tests only:

```bash
cd apps/api
npm run test
```

Run tests for one API module:

```bash
npm run test -- --testPathPattern=orders
```

---

## How the API works

Every request goes through the same chain:

```
Request
  → JwtAuthGuard        checks the Supabase token
  → RolesGuard          checks the user's role
  → ZodValidationPipe   checks the request shape (400 on failure)
  → Controller          routes to the service
  → Service             runs the business logic
  → ResponseInterceptor wraps the result
  ← Response
```

Every response has the same shape:

```json
{ "data": {}, "message": "ok", "statusCode": 200 }
```

A few rules worth knowing:

- **The price is always set by the server.** The client never sends a total.
- **The wallet balance is never stored.** It is the sum of all wallet transactions.
- **Order status uses an optimistic lock.** Two staff members cannot advance the same order at once.
- **Queue mode needs an active slot.** "Print Now" only shows when the shop has an open slot for the current time.

The full endpoint list, data model, and rules are in the docs below.

---

## Documentation map

The `docs/` folder holds the full design. Start here when you need detail.

| Document | What is inside |
|---|---|
| [docs/01-product-brief.md](docs/01-product-brief.md) | Short pitch and goals |
| [docs/PRD.md](docs/PRD.md) | Full product spec: users, goals, and core flows |
| [docs/02-feature-registry.md](docs/02-feature-registry.md) | Every feature with acceptance criteria |
| [docs/04-data-model.md](docs/04-data-model.md) | Tables, fields, pricing formula, and ETA algorithm |
| [docs/05-api-contract.md](docs/05-api-contract.md) | Every endpoint, request and response shapes, and WebSocket events |
| [docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md) | High-level architecture and module layout |
| [docs/03-architecture-decisions.md](docs/03-architecture-decisions.md) | Why we made each big choice |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Coding rules and patterns |
| [docs/06-definition-of-done.md](docs/06-definition-of-done.md) | The checklist every feature must pass |
| [docs/07-risk-register.md](docs/07-risk-register.md) | Known risks and how we handle them |
| [docs/08-implementation-slices.md](docs/08-implementation-slices.md) | Build order and status of each slice |
| [docs/09-ui-ux-design-spec.md](docs/09-ui-ux-design-spec.md) | Design system and per-screen UI spec |
| [docs/10-user-research-survey.md](docs/10-user-research-survey.md) | The user survey design and notes |

`CONTEXT.md` in the root holds the domain language and the golden rules for working in the codebase.

---

## User research

Before building the full app, we ran a survey with 21 people on both sides of the counter. The findings shaped the build order. The full write-up is in **[PrintSlot-Survey-Report.pdf](PrintSlot-Survey-Report.pdf)**.

Three results stood out:

- The top customer worry is that the shop will ignore an app order (79%).
- The hardest job for shops is estimating the ready time (86%).
- Most people want both English and Bengali with a switch (67%).

---

## Team

Built by **Team ParaDox** for the Mobile Application Development project.

| Name | Student ID |
|---|---|
| Ikramul Hasan Moral | 0112230195 |
| Samiur Rahman Omlan | 0112230200 |
| Md. Abu Bakar | 0112230435 |
| Md. Touhidul Islam | 0112230489 |
| Omar Shahriar Nafi | 0112230208 |
