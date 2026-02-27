# OSM Pulse

Simple dashboard for OpenStreetMap activity.

## Requirements

- Node.js 18+
- npm

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
npm start
```

## Main routes

- `/` dashboard
- `/countries` all-time country totals
- `/projects` all-time project-tag totals
- `/users` all-time user totals

## API routes

- `/api/socket/io` live stats socket
- `/api/countries` countries list
- `/api/projects` projects list
- `/api/users` users list

## Database

- SQLite file defaults to `data/stats.db`
- Set `SQLITE_PATH` to use a custom location
