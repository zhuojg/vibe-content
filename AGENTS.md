# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Must Follow Rules

- Always use oRPC for server-client communication
- Try to avoid try/catch pattern, using neverthrow is a good option
- Use react-hook-form to construct forms for user input

## Development Commands

```bash
bun run dev          # Start development server (Vite + Nitro)
bun run lint         # Run Biome linter
bun run lint:fix     # Auto-fix lint issues
bun run type-check   # TypeScript type checking
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run database migrations
```

## Architecture

Full-stack TypeScript application using TanStack React Start:

- **Frontend**: React 19, TanStack Start, TanStack Query
- **Backend**: oRPC procedures, Drizzle ORM
- **Database**: PostgreSQL
- **AI**: Vercel AI SDK with custom agent framework

### Directory Structure

```
src/
├── components/       # React components (chat/, kanban/, ui/)
├── db/              # Drizzle schemas (auth-schema.ts, project-schema.ts)
├── lib/
│   ├── agents/      # Agent framework
│   │   ├── built-in/   # Agent definitions (markdown)
│   │   ├── skills/     # Skill definitions and executors
│   │   └── tools/      # Agent tools (skill, skill-runner, subagent)
│   └── auth.ts      # Better Auth configuration
├── orpc/            # oRPC server procedures
│   ├── procedures/  # Procedure definitions
│   ├── router.ts    # Main router
│   ├── client.ts    # Client setup
│   └── index.ts     # Base procedures and middleware
└── routes/          # TanStack Router pages
```

## oRPC Pattern (Required)

### Server Procedures (`src/orpc/procedures/`)

```typescript
import { publicProcedure, protectedProcedure } from "@/orpc";
import { z } from "zod";

// Public procedure (no auth)
export const getProject = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .handler(async ({ input, errors }) => {
    const result = await db.query.project.findFirst({
      where: eq(project.id, input.projectId),
    });
    if (!result) throw errors.NOT_FOUND({ data: { resource: "project" } });
    return result;
  });

// Protected procedure (requires auth)
export const createProject = protectedProcedure
  .input(z.object({ name: z.string() }))
  .handler(async ({ input, context }) => {
    // context.user and context.session available
    return await db.insert(project).values({ ... }).returning();
  });
```

### Client Usage (`src/orpc/client.ts` exports)

Three clients are available:
- `client` - Direct calls, throws on error
- `safeClient` - Returns `[error, data]` tuples
- `orpc` - TanStack Query integration

### React Components

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "@/orpc/client";

// Queries with orpc utilities
const projectQuery = useQuery(
  orpc.project.getProject.queryOptions({ input: { projectId } })
);

// Conditional queries
const tasksQuery = useQuery({
  ...orpc.task.getTasks.queryOptions({ input: { projectId } }),
  enabled: !!projectId,
});

// Mutations with direct client
const createMutation = useMutation({
  mutationFn: (name: string) => client.project.createProject({ name }),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: orpc.project.getProjects.queryOptions({}).queryKey,
    });
  },
});
```

## Agent System

Agents are defined in markdown files with YAML frontmatter.

### Agent Definition

See example in `src/lib/agents/built-in/*.md`.

### Skill Definition

See example in `src/lib/agents/skills/built-in/*/SKILL.md`.

### Adding New Skills

1. Create `src/lib/agents/skills/built-in/<skill-name>/SKILL.md`
2. (Optional) Add executor in `src/lib/agents/skills/executors/<skill-name>.ts`
3. Register in `src/lib/agents/skills/executors/index.ts`

## Testing with Chrome DevTools

Tests are run using Chrome DevTools MCP for real browser automation. Feature documentation serves as test specifications.

### Feature Documentation Structure

```
docs/
└── features/
    ├── project-management.md
    ├── kanban-board.md
    └── chat-interface.md
```

### Feature Spec Template

```markdown
# Feature: [Feature Name]

## Overview
Brief description of the feature.

## User Flows

### Flow 1: [Flow Name]
1. User navigates to [page]
2. User clicks [element]
3. System displays [result]

## UI Elements
- **Element Name**: Description and expected behavior
- **Button**: Click triggers [action]

## Test Scenarios

### Scenario: [Scenario Name]
**Given** [precondition]
**When** [action]
**Then** [expected result]

## Edge Cases
- Empty state behavior
- Error state behavior
- Loading state behavior
```

### Running Tests

Use Chrome DevTools MCP to:
1. Navigate to the application
2. Take snapshots to find UI elements
3. Interact with elements using their UIDs
4. Verify expected behavior matches feature docs

## Code Organization Notes

- **New oRPC procedures**: Add to `src/orpc/procedures/`, export in `src/orpc/router.ts`
- **New components**: Add to `src/components/`, follow existing patterns in `ui/`
- **New routes**: Add to `src/routes/`, use file-based routing conventions
- **Database changes**: Modify schemas in `src/db/`, run `bun run db:generate && bun run db:migrate`

For complex files or modules, consider adding a markdown file with the same name to explain the module's purpose and structure.

## Preferred Code Pattern

- Avoid the usage of `try / catch`, only add when necessary or at the top level. Prefer to use `neverthrow` to define functions that will throw error.
- Avoid pass data through props in react. Try to use hooks or context when possible.
- Avoid the usage of `useEffect` especially for data related operations.
- Aovid the usage of `interface` in typescript, always use `type` when possible. And when edit the file that containing the `inferface`, try to update it to `type`.
