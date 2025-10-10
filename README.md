# Broadcast Group Automation

Automate security content group and source creation across multiple platforms with intelligent state tracking.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment variables (credentials)
cp .env.example .env
vim .env  # Add your admin password and user passwords

# Users and groups config are in config/ directory (safe to commit)
# config/users.json - user emails only
# config/groups.json - group configurations

# Send invitations
npm run dev -- invite --env dev

# (Wait for users to verify emails, then update passwords in .env)

# Create groups and sources
npm run dev -- setup --env dev

# Check status
npm run dev -- status --env dev

# (First run will download MCP Playwright server automatically)
```

> **Note:** On first run, `npx` will download the Microsoft Playwright MCP server (`@playwright/mcp`) and Chromium browser (~150MB total). This is cached for subsequent runs. See [MCP_PLAYWRIGHT.md](./MCP_PLAYWRIGHT.md) for details.

## 📖 Documentation

| Document | Description |
|----------|-------------|
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
