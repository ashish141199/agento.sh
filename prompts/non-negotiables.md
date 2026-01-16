# Non-Negotiables & Best Practices

> **Critical standards that MUST be followed in all development work**

## Core Development Principles

### Implementation Workflow - MANDATORY
**[NON-NEGOTIABLE]** Follow this sequence for ALL implementations:

1. **UNDERSTAND** - Fully comprehend the requirement before writing code
   - Ask clarifying questions if anything is ambiguous
   - Identify edge cases and potential issues upfront
   - Map out the approach mentally before coding

2. **CHECK** - Look for existing patterns and code first
   - Search for similar implementations in the codebase
   - Identify reusable utilities, components, or services
   - Understand how related features are structured

3. **IMPLEMENT** - Write clean, complete code
   - Follow project architecture patterns exactly
   - Use existing utilities and abstractions
   - Handle all edge cases and error states

4. **VERIFY** - Ensure correctness before completion
   - Run type checking: `bun run type-check`
   - Manually verify the feature works as expected
   - Check for console errors or warnings

5. **REFACTOR** - Clean up while maintaining functionality
   - Improve code quality and readability
   - Remove any redundant code
   - Ensure consistent naming and structure

---

## Code Quality Standards

### TypeScript
- **[NON-NEGOTIABLE]** NEVER use `any` type - use proper types always
- Reuse types from `/types/api` (frontend) or `/schemas` (backend)
- Comment EVERY type definition with JSDoc
- Strict mode compliance required

### File Size Limits
- **[NON-NEGOTIABLE]** Files MUST be < 500 lines
- **[NON-NEGOTIABLE]** Components MUST be < 400 lines
- Break into smaller files when approaching limits
- Create micro-files by responsibility

### Documentation
- **[NON-NEGOTIABLE]** JSDoc comment on EVERY function
- Document parameters, return types, and purpose
- Explain complex logic blocks with inline comments
- Self-explanatory function and variable names

### Implementation Completeness
- **[NON-NEGOTIABLE]** NEVER leave TODO comments
- Complete all implementations fully - no placeholders
- No mock implementations or "coming soon" stubs
- If you start it, you MUST finish it to working state
- Take as much time as needed to complete properly

### Error Handling
- **[NON-NEGOTIABLE]** Handle ALL error cases explicitly
- Never silently fail - log or display errors appropriately
- Provide meaningful error messages to users
- Use try-catch for async operations that can fail

---

## Architecture Patterns

### Backend Architecture (Fastify)

**Layer Separation:**
```
/utils                    → Pure logic helpers (NO database operations)
/utils/db-utils.ts       → Generic CRUD functions for ANY Drizzle table
/db/modules/<module>/*.db.ts → ALL database queries/mutations (USE db-utils)
/services                → Business logic (calls db modules, NO direct DB ops)
/routes                  → API request/response handling
```

**[NON-NEGOTIABLE] Database Operations:**
- ALL database operations MUST be in `src/db/modules/<module>/*.db.ts`
- USE db-utils functions from `/utils/db-utils.ts` for common CRUD
- NEVER put database operations in `.service.ts` or `.utils.ts` files
- Services call db modules, NEVER access database directly

**[NON-NEGOTIABLE] Database Management:**
- ALWAYS use migrations - NEVER run `db:push`
- Generate: `bun run db:generate`
- Apply: `bun run db:migrate`

**[NON-NEGOTIABLE] Schema Management:**
- All validation schemas in `/schemas` folder
- NEVER duplicate schemas - always reuse
- Create reusable schemas in `schemas/common.schema.ts`
- Feature-specific schemas in `schemas/<feature>.schema.ts`

**API Design:**
```
GET    /resource       → List all
GET    /resource/:id   → Get specific
POST   /resource       → Create new
PUT    /resource/:id   → Full replace
PATCH  /resource/:id   → Partial update
DELETE /resource/:id   → Delete/deactivate
```

**Response Format:**
```typescript
{
  success: boolean,
  message: string,
  data?: any
}
```

### Frontend Architecture (Next.js)

**Component Organization:**
- **[NON-NEGOTIABLE]** Components are UI-only (NO business logic)
- **[NON-NEGOTIABLE]** Business logic goes in `/services`
- **[NON-NEGOTIABLE]** Database operations in `src/db/modules/<module>/*.db.ts` (backend)
- Components < 400 lines - break into sub-components

**[NON-NEGOTIABLE] UI Components:**
- ALWAYS use Shadcn/UI components from `/components/ui/`
- Custom components ONLY for auth/onboarding flows
- Never build custom buttons, inputs, dialogs when Shadcn exists

**[NON-NEGOTIABLE] API Communication:**
- Use `useApi` hooks for ALL API calls in components
- NEVER use `useEffect` for data fetching
- Use React Query for server state
- Use Zustand for client state

**State Management:**
- Server state → React Query (via `useApi` hooks)
- Client state → Zustand stores in `/stores`
- Local UI state → `useState`
- NEVER use `useEffect` for API calls

---

## TanStack Query Mutations

### MUTATION TYPES:

**CREATE:**
- NO optimistic item
- Apply nothing in onMutate except snapshot
- Insert item ONLY in onSuccess using real server ID

**UPDATE:**
- Optimistically update item immediately (ID exists)
- Replace optimistic item with real server data in onSuccess

**DELETE:**
- Optimistically remove immediately
- Nothing to do in onSuccess (already removed)
- Restore previous snapshot on error

### READ Operations (Auto-Synchronized)
- All READ queries auto-sync using `invalidateQueries` in `onSettled`
- DO NOT manually update read caches
- Use `context.client.invalidateQueries` ONLY in `onSettled`

### Mutation Rules:
1. ALWAYS use optimistic updates for UPDATE and DELETE mutations
2. For CREATE mutations:
   - DO NOT generate temporary IDs
   - Insert new items ONLY in onSuccess after receiving real ID
3. Manual cache writes only inside `onMutate`
4. Snapshot previous data in `onMutate` for rollback
5. Rollback on error using the snapshot
6. INSIDE mutation lifecycle, ALWAYS use `context.client`, NEVER outer `queryClient`

---

## Service Layer Pattern

**Backend:**
```typescript
// 1. Database Module (ALL database operations)
// src/db/modules/agent/agent.db.ts
import { findById, create } from '@/utils/db-utils'
import { agents } from '@/db/schema'

export async function findAgentById(id: string) {
  return await findById(agents, id)
}

export async function createAgent(data: InsertAgent) {
  return await create(agents, data)
}

// 2. Service (Business logic, calls db modules)
// services/agent.service.ts
import { findAgentById, createAgent } from '@/db/modules/agent/agent.db'

export class AgentService {
  async create(data: CreateAgentData) {
    const validated = validate(data)
    return await createAgent(validated)
  }
}

// 3. Route (API handling)
// routes/agents.ts
fastify.post('/agents', async (request) => {
  const agent = await agentService.create(request.body)
  return { success: true, data: agent }
})
```

**Frontend:**
```typescript
// services/agent.service.ts
import { apiClient } from '@/utils/repository'

export const agentService = {
  create: (data: CreateAgent) => apiClient.post('/agents', data)
}

// components/create-agent-dialog.tsx
import { useApiPost } from '@/hooks/use-api'

export function CreateAgentDialog() {
  const createAgent = useApiPost<Agent, CreateAgent>('/agents', {
    invalidateQueries: ['agents']
  })
  // UI only - no business logic
}
```

---

## Code Organization

### Backend Structure
```
/src
  /utils
    api-utils.ts          # Common API operations (NO database)
    date-utils.ts         # Pure helpers (NO database)
    db-utils.ts          # Generic CRUD for ANY table
  /db
    /modules
      /agent
        agent.db.ts      # ALL agent database operations
      /workspace
        workspace.db.ts  # ALL workspace database operations
  /services
    agent.service.ts     # Business logic (calls db modules)
  /routes
    agents.ts            # API endpoints
  /schemas
    agent.schema.ts      # Validation schemas
    common.schema.ts     # Reusable schemas
```

### Frontend Structure
```
/app                  # Next.js pages
/components
  /ui                # Shadcn components
  /blocks            # Composite components
  /dialogs           # Dialog components
/services            # Business logic & API
/hooks               # Custom React hooks
/stores              # Zustand stores
/types/api           # API types
```

---

## Development Standards

### Package Manager
- **[NON-NEGOTIABLE]** Use `bun` ALWAYS (never npm or yarn)
- `bun dev` - start development
- `bun run type-check` - run linter
- `bun add <package>` - install dependencies

### Code Quality Principles
- **[NON-NEGOTIABLE]** NEVER use brittle solutions:
  - ❌ String matching to determine types
  - ❌ Path parsing for business logic
  - ❌ Naming conventions as logic

- **[NON-NEGOTIABLE]** ALWAYS use database-driven approaches:
  - ✅ Explicit boolean flags
  - ✅ Enums for types
  - ✅ Foreign keys for relationships
  - ✅ Dedicated fields for state

### Reusability First
- Check for existing utils/services before creating new
- Generalize complicated functionality
- Create reusable components and utilities
- Think reusability from the start

### Security & Performance
- **[NON-NEGOTIABLE]** Never expose sensitive data in client-side code
- Validate ALL user inputs on the backend
- Use parameterized queries - never string concatenation for SQL
- Implement proper authentication checks on all protected routes
- Optimize database queries - avoid N+1 problems

---

## Pre-Completion Checklist

### Before Completing ANY Task:

**Code Quality:**
- [ ] No `any` types used
- [ ] All files < 500 lines, components < 400 lines
- [ ] JSDoc on every function
- [ ] Used proper architecture patterns
- [ ] Reused existing code where possible
- [ ] Database-driven approach (no brittle solutions)
- [ ] All error cases handled explicitly

**Backend Specific:**
- [ ] All database operations in `src/db/modules/<module>/*.db.ts`
- [ ] Used db-utils functions for CRUD
- [ ] No database operations in services or utils
- [ ] All schemas in `/schemas` (no duplicates)
- [ ] Used migrations (never `db:push`)
- [ ] Followed RESTful conventions
- [ ] Input validation on all endpoints

**Frontend Specific:**
- [ ] Used Shadcn/UI components
- [ ] No business logic in components
- [ ] Used `useApi` hooks for API calls
- [ ] Components < 400 lines
- [ ] Loading and error states handled

**Universal:**
- [ ] Ran `bun run type-check` and fixed all errors
- [ ] Updated `/docs/tree.md` if files changed
- [ ] No TODO comments left
- [ ] Code is production-ready
- [ ] Feature works as expected (manually verified)

---

## Communication Guidelines

### Response Style
- **Think deeply, write briefly** - use Ultrathink mode
- **Short responses** - 2-4 sentences maximum
- **No fluff** - skip "Great!", "Here's what I did..."
- **Direct statements** - actionable and concrete
- **Ask when uncertain** - clarify before assuming

### Feature Scope
- **[NON-NEGOTIABLE]** Do ONLY what's asked
- **[NON-NEGOTIABLE]** Suggest before adding unrequested features
- Wait for approval before implementing extras
- Focus on task at hand, nothing more

---

## Golden Rules

1. **Architecture Matters** - Follow layer separation strictly
2. **Reuse Everything** - Check before creating
3. **Complete Everything** - No TODOs, no placeholders
4. **Quality First** - Never compromise standards
5. **Database-Driven** - Explicit fields, no brittle hacks
6. **Type Safety** - No `any`, proper types always
7. **Error Handling** - Handle all failure cases
8. **Security First** - Validate inputs, protect data

### Quick Reference
- No `any` types
- Files < 500, components < 400
- JSDoc on all functions
- Database ops in db modules only
- Use db-utils for CRUD
- Shadcn/UI for frontend
- `useApi` hooks for API calls
- Migrations, never `db:push`
- `bun` package manager
- Handle all errors explicitly