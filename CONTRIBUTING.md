# Contributing to OpenICM

Thanks for your interest! This is an early-stage project and every contribution helps.

## Ways to Contribute

- **Star the repo** ⭐ — it helps others discover the project.
- **Open issues** — bug reports, feature requests, documentation gaps.
- **Submit PRs** — bug fixes, new features, test improvements.
- **Share** — tell your team, post on social, write a blog post.

## Development Setup

```bash
git clone https://github.com/okyssta/OpenICM.git
cd OpenICM
npm install
cp .env.example .env.local  # Set DATABASE_URL
npx prisma db push
npx prisma db seed
npm run dev
```

## Code Standards

- TypeScript strict mode. No `any` unless absolutely necessary.
- Pure functions in the engine module. Zero DB dependencies.
- Tests live alongside the code they cover (`__tests__/` directories).
- Run `npm run typecheck` and `npm test` before pushing.

## PR Guidelines

1. Branch from `main`, PR back to `main`.
2. One feature/fix per PR.
3. Update tests if you change engine logic.
4. Keep the diff small.

## License

By contributing, you agree that your contributions will be licensed under AGPL-3.0.
