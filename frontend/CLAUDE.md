# CLAUDE.md - Frontend

## Project Guidelines

### Package Manager
**Always use `bun`** - Never use npm, yarn, or pnpm for this project.

- Install dependencies: `bun install`
- Add packages: `bun add <package>`
- Run scripts: `bun run <script>`
- Dev server: `bun run dev`
- Build: `bun run build`

### Tech Stack
- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- TanStack React Query
- Zustand for state management

### Adding shadcn Components
```bash
bunx shadcn@latest add <component>
```

### Project Structure
```
frontend/src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global styles
│   ├── (protected)/            # Protected route group
│   │   ├── layout.tsx          # App bar with avatar menu
│   │   └── page.tsx            # Home page (agents table)
│   ├── get-started/            # Login/Signup page (public)
│   └── auth/                   # Auth routes (public)
│       ├── callback/           # OAuth callback page
│       └── google/callback/    # Google OAuth handler
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── providers/              # React providers
│   └── agents/                 # Agent-related components
├── services/                   # API service functions
├── stores/                     # Zustand stores
├── hooks/                      # Custom React hooks
└── lib/                        # Utilities
```

### Route Groups
- `(protected)` - Routes requiring authentication
  - Has app bar layout with logo and avatar menu
  - Uses `useAuthGuard` hook for protection
- Public routes - `get-started`, `auth/*`

### Authentication Flow
- `/` - Protected home page (agents table)
- `/get-started` - Combined login/signup page
- Email + OTP authentication
- Google OAuth sign-in
- New users prompted for full name

### UX Principles
- Keep it simple - minimal UI, no unnecessary complexity
- No extra features beyond what's requested
- Clear error states and loading indicators

### Architecture Rules
- Components are UI-only (no business logic)
- Business logic goes in `/services`
- Use `useAuthGuard` hook for protected routes
- State: Zustand for client state, React Query for server state
