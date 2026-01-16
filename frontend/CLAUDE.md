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

### Adding shadcn Components
```bash
bunx shadcn@latest add <component>
```
