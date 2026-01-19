# CLAUDE.md - Backend

## Project Guidelines

### Package Manager
**Always use `bun`** - Never use npm, yarn, or pnpm for this project.

- Install dependencies: `bun install`
- Add packages: `bun add <package>`
- Dev server (with watch): `bun run dev`
- Start server: `bun run start`
- Type check: `bun run type-check`

### Tech Stack
- Fastify 5
- TypeScript
- Bun runtime
- Drizzle ORM with PostgreSQL
- Zod for validation

### Server
- Runs on port **8000**
- CORS enabled for frontend communication

### Database
- PostgreSQL database: `agentoo`
- Generate migrations: `bun run db:generate`
- Run migrations: `bun run db:migrate`
- Open Drizzle Studio: `bun run db:studio`

### Project Structure
```
backend/
├── src/
│   ├── index.ts              # Main entry point
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   ├── schema/           # Drizzle table schemas
│   │   └── modules/          # Database operations by feature
│   │       ├── user/
│   │       ├── otp/
│   │       └── session/
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic
│   ├── schemas/              # Zod validation schemas
│   └── utils/                # Utility functions
├── drizzle/                  # Migration files
├── drizzle.config.ts
├── package.json
└── .env
```

### Architecture Rules
- ALL database operations MUST be in `src/db/modules/<module>/*.db.ts`
- Services contain business logic and call db modules
- Routes handle HTTP request/response only
- Validation schemas in `src/schemas/`

### Database Schema Rules
- **NEVER use JSON/JSONB columns for unbounded lists** - If data can grow exponentially with no predictable limit (e.g., messages, logs, history), create a separate table with foreign key relationships instead of storing as JSON array
- JSON columns are acceptable for:
  - Fixed/bounded configuration objects
  - Metadata with predictable structure
  - Small, finite sets of data
- Examples:
  - BAD: `messages: jsonb[]` storing chat history
  - GOOD: Separate `messages` table with `agent_id` foreign key

### Environment
- Bun automatically loads `.env` files - no dotenv needed
- Required env vars: DATABASE_URL, JWT_SECRET, SMTP_*, GOOGLE_AUTH_*
