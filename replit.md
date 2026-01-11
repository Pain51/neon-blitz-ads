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

## Android App (Capacitor)

The project is configured to build a native Android APK using Capacitor.

### Configuration
- **capacitor.config.ts** - Main Capacitor configuration
- **App ID**: `com.neonblitz.arcade`
- **Web Directory**: `dist/public`

### Build Commands
```bash
# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### APK Generation
See `ANDROID_BUILD_GUIDE.md` for complete instructions on:
- Generating debug APK for testing
- Generating signed release APK for Play Store
- Customizing app icon and splash screen

### AdMob Integration
The game includes Google AdMob for monetization:
- **Plugin**: `@capacitor-community/admob`
- **Banner ads**: Displayed on the home screen
- **Interstitial ads**: Shown when game ends (Game Over)

**Configuration:**
- App ID is stored in `android/app/src/main/res/values/strings.xml`
- Ad Unit IDs are configured via environment variables:
  - `VITE_ADMOB_BANNER_ID` - Banner ad unit ID
  - `VITE_ADMOB_INTERSTITIAL_ID` - Interstitial ad unit ID
- The `useAdMob` hook (`client/src/hooks/useAdMob.ts`) handles initialization and ad display
- Ads only run on native Android platform (not in web browser)