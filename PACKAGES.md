# Package Versions

## Current Dependencies (Dec 2024)

### Production Dependencies

| Package | Version | Latest | Notes |
|---------|---------|--------|-------|
| `@modelcontextprotocol/sdk` | ^1.0.4 | 1.0.4 | MCP protocol SDK |
| `axios` | ^1.7.9 | 1.7.9 | HTTP client |
| `better-sqlite3` | ^11.10.0 | 12.4.1 | SQLite (v12 has breaking changes) |
| `commander` | ^12.1.0 | 14.0.1 | CLI framework (v14 has breaking changes) |
| `dotenv` | ^16.6.1 | 17.2.3 | Env vars (v17 has breaking changes) |
| `express` | ^4.21.2 | 5.1.0 | HTTP server (v5 has breaking changes) |

### Development Dependencies

| Package | Version | Latest | Notes |
|---------|---------|--------|-------|
| `@types/better-sqlite3` | ^7.6.12 | 7.6.12 | TypeScript types |
| `@types/express` | ^4.17.23 | 5.0.3 | Matches express v4 |
| `@types/node` | ^22.18.9 | 24.7.1 | Node 22 LTS types |
| `@typescript-eslint/eslint-plugin` | ^8.46.0 | 8.46.0 | TypeScript ESLint |
| `@typescript-eslint/parser` | ^8.46.0 | 8.46.0 | TypeScript parser |
| `eslint` | ^9.37.0 | 9.37.0 | Linter |
| `tsx` | ^4.19.2 | 4.19.2 | TypeScript executor |
| `typescript` | ^5.7.2 | 5.7.2 | TypeScript compiler |
| `vitest` | ^2.1.9 | 3.2.4 | Test framework (v3 has breaking changes) |

## Update Policy

### Safe to Update (Patch/Minor)
When these packages release new versions, update immediately:
- `axios` - HTTP client, stable API
- `@modelcontextprotocol/sdk` - MCP protocol
- `tsx` - Development tool
- `typescript` - Compiler improvements
- `@types/*` - Type definitions

### Careful Updates (Major Versions)
Test thoroughly before updating:
- `express` 4.x → 5.x (middleware changes)
- `commander` 12.x → 14.x (API changes)
- `better-sqlite3` 11.x → 12.x (performance/API changes)
- `vitest` 2.x → 3.x (test runner changes)
- `eslint` 9.x → 10.x (config format changes)
- `dotenv` 16.x → 17.x (parsing changes)

## Known Breaking Changes

### express 5.x
- `req.params`, `req.query`, `req.body` are getters
- Middleware signature changes
- Promise rejection handling

### commander 14.x
- Option parsing changes
- Command syntax updates

### better-sqlite3 12.x
- Node.js version requirements
- Performance optimizations
- Potential API changes

### vitest 3.x
- Config format changes
- Snapshot format updates
- Mock API changes

## Upgrade Checklist

When upgrading major versions:

1. ✅ Read CHANGELOG of the package
2. ✅ Update package.json
3. ✅ Run `npm install`
4. ✅ Run `npm run build` - check for TypeScript errors
5. ✅ Run `npm run lint` - check for lint errors
6. ✅ Run `npm test` - run test suite
7. ✅ Test CLI commands manually
8. ✅ Update Dockerfile if needed
9. ✅ Update this document

## Checking for Updates

```bash
# Check all outdated packages
npm outdated

# Update to latest within semver range
npm update

# Update specific package
npm install package-name@latest

# Check for security vulnerabilities
npm audit

# Fix security issues
npm audit fix
```

## MCP Playwright Note

The MCP Playwright server is **not** in our dependencies. It's downloaded on-demand via:
```bash
npx -y @modelcontextprotocol/server-playwright
```

This is **intentional** - the server is external and manages its own dependencies including Playwright browser.

## Staying Current

Update packages monthly:
```bash
# 1. Check what's outdated
npm outdated

# 2. Update patch/minor versions
npm update

# 3. Test build
npm run build

# 4. Test functionality
npm run dev -- status --env dev

# 5. Commit if all good
git add package.json package-lock.json
git commit -m "chore: update dependencies"
```

---

**Last Updated:** December 10, 2024  
**Node Version:** v20+ (LTS)  
**npm Version:** v10+

