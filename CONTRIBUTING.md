# Contributing to OpenICM

Thank you for considering contributing — this is an early-stage project and every contribution matters.

## Project Status

OpenICM is at **MVP (v0.1)**. The core calculation engine is stable and tested. The UI, API surface, and integrations are actively evolving.

## How to Contribute

### Report Bugs
- Open a [GitHub Issue](https://github.com/kyssta-exe/OpenICM/issues/new) with the `bug` label.
- Include: stack trace (if applicable), what you expected vs what happened, and steps to reproduce.

### Suggest Features
- Open an issue with the `enhancement` label.
- Describe the problem you're solving, not just the feature you want.

### Pull Requests

1. **Fork** the repo and create a branch from `main`.
2. **Run tests** — `npm test` — all must pass.
3. **Run typecheck** — `npm run typecheck` — must be clean.
4. **Build** — `npm run build` — must succeed.
5. Open a PR with a clear title and description.

### Code Style

- **No comments** in source code — use type definitions and function names to express intent.
- **No emoji** in code or commit messages.
- Strict TypeScript everywhere — avoid `any` unless absolutely necessary.
- Functions are pure where possible — the engine (`src/engine/`) must remain DB-free.
- Use `camelCase` for variables/functions, `PascalCase` for types/components.

### Commit Messages

Follow conventional commits:

```
feat: add multi-payee split support
fix: correct tier boundary rounding on marginal calc
docs: update API endpoint documentation
chore: bump prisma to 6.21
```

### Testing

- Engine logic **must** have unit tests in `src/engine/__tests__/`.
- Use Vitest — run with `npm test`.
- Financial calculations must test for cent-exact reconciliation.
- Integration tests (DB-dependent) go in `__tests__/` at the lib level.

## Development Setup

```bash
# 1. Clone and install
git clone https://github.com/kyssta-exe/OpenICM.git
cd OpenICM
npm install

# 2. Set up postgres (via Docker recommended)
docker run -d --name openicm-db \
  -e POSTGRES_USER=openicm \
  -e POSTGRES_PASSWORD=openicm \
  -e POSTGRES_DB=openicm \
  -p 5432:5432 \
  postgres:16-alpine

# 3. Push schema + seed
npx prisma db push
npx tsx prisma/seed.ts

# 4. Run dev server
npm run dev

# 5. Validate
npm test
npm run typecheck
npm run build
```

## Project Structure

See [handoff.md](handoff.md#3-project-structure) for the full file tree.

## Code of Conduct

Be respectful, constructive, and professional. Harassment, trolling, and personal attacks will not be tolerated.

## License

By contributing, you agree that your contributions will be licensed under [AGPL-3.0](LICENSE).
