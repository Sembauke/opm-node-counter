# 🗺️ OPM Node Counter
<img width="1681" height="650" alt="{12432492-6221-4D7F-8379-6BFF4B745C66}" src="https://github.com/user-attachments/assets/44a04f35-c3bb-4bc1-b3de-e4fd5108647a" />

A real-time dashboard for tracking OpenStreetMap (OSM) statistics and changeset activity. This Next.js application provides live updates of node counts, changeset totals, mapper activity, and more with a beautiful, modern UI.

![OPM Node Counter Dashboard](https://img.shields.io/badge/Next.js-15.1.7-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Chakra UI](https://img.shields.io/badge/Chakra_UI-3.8.0-319795?style=for-the-badge&logo=chakra-ui)

## ✨ Features

- **Real-time Statistics**: Live tracking of OSM nodes, changesets, and mapper activity
- **Beautiful Dashboard**: Modern glass-morphism UI with smooth animations
- **Live Updates**: WebSocket integration for real-time data updates
- **Mapper Analytics**: Track unique mappers, top contributors, and activity patterns
- **Changeset Monitoring**: View recent changesets with detailed information
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Dark Theme**: Eye-friendly dark mode with cyan accent colors

## 📊 Dashboard Features

- **Total Nodes**: Real-time count of all OSM nodes
- **Total Changesets**: Track total number of changesets
- **Unique Mappers (Hour)**: Number of unique contributors in the last hour
- **Top Mappers**: Most active contributors
- **Average Changes (Hour)**: Average changes per hour
- **Largest Changeset**: Biggest changeset in the current hour
- **Nodes per Minute**: Real-time calculation of node creation rate
- **Recent Changesets**: Live feed of latest OSM changes

## 🛠️ Tech Stack

- **Framework**: Next.js 15.1.7 (App Router)
- **Language**: TypeScript
- **UI Library**: Chakra UI 3.8.0
- **Real-time**: Socket.IO
- **Database**: SQLite (SQL storage for real-time stats)
- **Styling**: CSS Modules with custom animations
- **Icons**: React Icons
- **Animations**: React CountUp for number animations

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- No external database service required in development

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sembauke/opm-node-counter.git
   cd opm-node-counter
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

   This starts the frontend and initializes the SQLite database automatically.

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗃️ Database Notes

- Default SQLite file: `data/stats.db`
- Override path with environment variable: `SQLITE_PATH=./custom/path/stats.db`
