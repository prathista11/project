# Stock Market Simulator

React frontend with an Express backend for live stock quotes and a PostgreSQL/PostgREST-backed portfolio simulator.

## Setup

Prerequisites:

- Node.js and npm
- Docker Desktop
- A Finnhub API key

After cloning, install dependencies:

```bash
npm install
npm --prefix backend install
copy backend\.env.example backend\.env
```

Edit `backend/.env` and set these values:

```env
FINNHUB_API_KEY=your_finnhub_key
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/stock
POSTGREST_URL=http://localhost:3001
JWT_SECRET=some-long-random-secret-at-least-24-chars
PGRST_JWT_SECRET=dev-postgrest-jwt-secret-change-me
```

Start Docker Desktop, then start PostgreSQL and PostgREST:

   ```bash
   npm run db:up
   ```

Start the backend and frontend in separate terminals:

   ```bash
   npm run dev:backend
   npm start
   ```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- PostgREST: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

Do not commit `backend/.env`, real API keys, logs, `node_modules/`, or `build/`.

## Scripts

- `npm start` starts the React frontend at `http://localhost:3000`.
- `npm run db:up` starts PostgreSQL at `localhost:5432` and PostgREST at `http://localhost:3001`.
- `npm run db:down` stops the database services.
- `npm run dev:backend` starts the Express backend with nodemon at `http://localhost:4000`.
- `npm run start:backend` starts the Express backend with Node.
- `npm run build` creates the production frontend build.
- `npm test` runs frontend tests.
- `npm --prefix backend test` runs backend unit tests.

## Notes

- The frontend proxies API calls to `http://localhost:4000`.
- Portfolio data is stored in PostgreSQL through PostgREST.
- `backend/portfolio.json` is retained only as an archive of the old JSON-backed storage.
- For local Docker, `PGRST_JWT_SECRET` in `backend/.env` must match the PostgREST secret. The default in `.env.example` matches `docker-compose.yml`.
- Backend routes return JSON errors in the shape `{ "error": "message" }`.
