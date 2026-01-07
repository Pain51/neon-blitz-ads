# Neon Blitz - Arcade Survival Game

## Overview

Neon Blitz is a browser-based arcade survival game built with React and Express. Players control a character, survive waves of enemies, collect XP gems to level up, and choose upgrades between levels. The game features a neon/arcade aesthetic with a leaderboard system for tracking high scores.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix primitives)
- **Animations**: Framer Motion for UI transitions and overlays
- **Build Tool**: Vite with HMR support

The frontend follows a page-based structure:
- `Home.tsx` - Main menu with leaderboard display
- `Game.tsx` - Canvas-based game with upgrade system and game over handling
- Custom game components in `components/game/` for DPad, UpgradeMenu, and GameOverMenu

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: Type-safe API contracts defined in `shared/routes.ts` using Zod schemas
- **Build**: esbuild for server bundling, Vite for client

The server uses a storage abstraction pattern (`IStorage` interface) for database operations, making it easy to swap implementations.

### API Structure
Routes are defined as typed contracts in `shared/routes.ts`:
- `GET /api/scores` - Retrieve top 10 scores
- `POST /api/scores` - Submit a new score (username, score, level)

### Database Schema
Single table design in `shared/schema.ts`:
- `scores` table: id, username, score, level, createdAt

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI and game components
    hooks/        # Custom React hooks
    pages/        # Route pages
    lib/          # Utilities
server/           # Express backend
shared/           # Shared types, schemas, API contracts
migrations/       # Drizzle migrations
```

## External Dependencies

### Database
- **PostgreSQL** via `DATABASE_URL` environment variable
- **Drizzle ORM** for type-safe queries
- **connect-pg-simple** for session storage (if sessions are needed)

### Frontend Libraries
- **@tanstack/react-query** - Server state management
- **framer-motion** - Animations
- **wouter** - Client-side routing
- **Radix UI** - Accessible component primitives
- **lucide-react** - Icon library

### Development Tools
- **Vite** with Replit-specific plugins for development
- **tsx** for running TypeScript directly
- **drizzle-kit** for database migrations (`npm run db:push`)

### Fonts
- Press Start 2P (arcade font)
- Outfit (sans-serif)
- Loaded via Google Fonts in `index.html`