# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Build production bundle (uses --no-lint flag)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler without emitting files

### Docker
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container on port 3000
- `npm run docker:deploy` - Deploy using custom script

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom HarmoniaSans font
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT models
- **Auth**: Supabase Auth
- **Rate Limiting**: Upstash Redis
- **UI Components**: Radix UI, Headless UI, Heroicons, Lucide React
- **Animations**: Framer Motion

### Project Structure
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints (chat, community, users, health)
│   ├── journal/           # Main journaling interface
│   ├── community/         # Community features
│   └── account/           # User account management
├── components/            # Reusable React components
├── lib/                   # Core utilities and configurations
│   ├── config.ts          # Environment config (server/client separation)
│   ├── supabase.ts        # Database client and types
│   ├── storage.ts         # Local storage utilities
│   └── utils/             # Helper functions
├── types/                 # TypeScript type definitions
├── data/                  # Static data (cuddle companions)
└── hooks/                 # Custom React hooks
```

### Core Features
- **Journal System**: Chat-based journaling with AI companions ("cuddles")
- **Multiple Journal Modes**: Guided journaling vs free-form conversation
- **Community Features**: Questions, replies, likes system
- **Streak Tracking**: Daily journaling streak with calendar view
- **AI Companions**: Different personality-based AI assistants
- **User Management**: Account creation, profiles, privacy controls

### Key Architectural Patterns

#### Environment Configuration
- Server config in `lib/config.ts` with strict separation of server/client variables
- Environment validation on app startup
- Supabase table prefixing for multi-environment support

#### Database Layer
- Supabase client in `lib/supabase.ts` with helper functions
- Type definitions co-located with database client
- Table name prefixing for environment isolation

#### API Design
- RESTful API routes in `app/api/`
- Rate limiting on chat endpoints using Upstash Redis
- Error handling with custom error types in `lib/errors.ts`
- Validation using Zod schemas in `lib/validation.ts`

#### Component Architecture
- Server Components by default (follows Next.js best practices)
- Client components marked with 'use client' directive
- Modal components using BaseModal for consistency
- Virtualized lists for performance (VirtualizedMessageList)

#### State Management
- React state for UI interactions
- Local storage utilities in `lib/storage.ts` for persistence
- Supabase for server state and real-time features

### Important Files
- `src/data/cuddles.ts` - AI companion definitions and prompts
- `src/app/journal/page.tsx` - Main journaling interface
- `src/lib/config.ts` - Environment configuration
- `src/lib/supabase.ts` - Database client and types
- `src/types/api.ts` - Core type definitions

### Environment Variables Required
**Server-side:**
- `OPENAI_API_KEY` - OpenAI API key for AI responses

**Client-side:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_SUPABASE_ENV_PREFIX` - Optional table prefix for environments

### Development Notes
- Uses Next.js 15 App Router conventions
- Follows Cursor rules for Next.js best practices (see `.cursor/rules/Next.mdc`)
- Docker setup with standalone output configuration
- Google Analytics integration (G-ZN7E2WZ42B)
- Custom font (HarmoniaSans) loaded locally