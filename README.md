# Broadcast Group Automation

Automate security content group and source creation across multiple platforms with intelligent state tracking.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Chromium for browser automation (one-time, ~280MB)
npx playwright install chromium

# 3. Configure environment variables (credentials and Auth0)
cp .env.example .env
vim .env  # Add passwords, Auth0 domain, client ID, and client secret

# 4. Send invitations
npm run dev -- invite --env dev

# 5. (Wait for users to verify emails, then update passwords in .env)

# 6. Create groups and sources
npm run dev -- setup --env dev

# 7. Check status
npm run dev -- status --env dev
```

> **Note:** First-time setup downloads Chromium (~280MB). This is cached in `~/.cache/ms-playwright/` for future use.

For detailed setup instructions, see **[SETUP.md](./SETUP.md)**.

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[SETUP.md](./SETUP.md)** | 🚀 **Start here!** Complete setup guide for local & Docker |
| **[AUTH0_SETUP.md](./AUTH0_SETUP.md)** | 🔐 How to get Auth0 credentials (domain, client ID, secret) |
| **[FINAL_COMPLETE_PLAN.md](./FINAL_COMPLETE_PLAN.md)** | Complete architecture, database design, implementation plan |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System architecture, data flow, technology stack |
| **[SECURITY.md](./SECURITY.md)** | Credential management and security best practices |
| **[MCP_PLAYWRIGHT.md](./MCP_PLAYWRIGHT.md)** | How MCP Playwright works and troubleshooting |
| **[PACKAGES.md](./PACKAGES.md)** | Package versions, update policy, upgrade checklist |

## 🎯 Features

- ✅ **Smart State Tracking** - SQLite database remembers everything
- ✅ **Two-Phase Workflow** - Invitations → Manual Verification → Setup
- ✅ **MCP Playwright** - Automated login and token retrieval
- ✅ **Incremental Setup** - Process users as they verify
- ✅ **CLI + Optional UI** - Command-line or web interface
- ✅ **Multi-Environment** - dev, qa, prod support

## 📋 Commands

| Command | Description |
|---------|-------------|
| `invite` | Send invitations (smart: skips already invited) |
| `setup` | Create groups and sources (smart: skips incomplete/done) |
| `status` | Show current state of all groups |
| `reset` | Clear state for specific groups |
| `list-groups` | List all configured groups |

## 🏗️ Project Structure

```
├── src/
│   ├── database/          # SQLite state tracking
│   ├── mcp/               # MCP Playwright wrapper
│   ├── api/               # API clients
│   ├── workflows/         # Smart workflows
│   ├── cli/               # CLI commands
│   └── types/             # TypeScript types
├── config/
│   ├── users.json         # User credentials
│   └── groups.json        # Group configurations
├── data/
│   └── state.db           # SQLite database
└── FINAL_COMPLETE_PLAN.md # Complete documentation
```

## 🐳 Docker

```bash
# Build and run
docker build -t broadcast-automation .
docker run -v $(pwd)/config:/app/config -v $(pwd)/data:/app/data broadcast-automation invite --env dev
```

## 📝 License

MIT
