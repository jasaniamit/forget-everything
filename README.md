# UKFont — Font Discovery Platform

A curated font discovery platform for browsing, previewing, and downloading high-quality open-source fonts. Includes bonus tools like Instagram Font Generator, Emoji Browser, and Lenny Face Generator.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Express 5, TypeScript, Node.js
- **Database**: PostgreSQL + Drizzle ORM
- **Font Processing**: fontkit, opentype.js
- **Build**: Vite 7 + esbuild

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ running locally or remotely

## Quick Start

1. **Clone & Install**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL and ADMIN_API_KEY
   ```

3. **Push Database Schema**
   ```bash
   npm run db:push
   ```

4. **Start Dev Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5000](http://localhost:5000)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (Vite HMR + Express) |
| `npm run build` | Production build (client → dist/public, server → dist/index.cjs) |
| `npm start` | Run production server |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |

## Project Structure

```
├── client/          React frontend (Vite)
│   └── src/
│       ├── pages/       Page components
│       ├── components/  Shared components + shadcn/ui
│       ├── hooks/       Custom React hooks
│       └── lib/         Utilities
├── server/          Express backend
│   ├── routes.ts        API routes
│   ├── storage.ts       Database queries
│   ├── ingestion.ts     Font upload pipeline
│   └── storage/         File storage drivers (local/B2/R2)
├── shared/          Shared types & schemas
│   ├── schema.ts        Drizzle DB tables
│   └── routes.ts        API definitions
└── data/            Runtime storage (fonts, uploads)
```

## Admin API

Admin endpoints are protected with API key authentication. Set `ADMIN_API_KEY` in your `.env` file and include it in requests:

```bash
# Bulk import fonts
curl -X POST http://localhost:5000/api/admin/fonts/bulk \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '[{"name": "MyFont", "family": "MyFont", ...}]'

# Import Google Fonts
curl -X POST http://localhost:5000/api/admin/fonts/fetch-google \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

## License

MIT
