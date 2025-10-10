# Broadcast Group Automation

Automate security content group and source creation across multiple platforms with intelligent state tracking.

## 🚀 Quick Start

### Option 1: Web UI (Recommended)

```bash
# 1. Install dependencies
npm install
npm run install:web

# 2. Configure environment variables
cp env.example .env
vim .env  # Add your ADMIN_TOKEN and USER_TOKEN_* values

# 3. Start the application (API + Web UI)
npm run dev:all

# 4. Open http://localhost:4500 in your browser
#    (or whatever port Vite displays if 4500 is taken)
```

> **Note:** The application automatically finds available ports in the range **4500-4900**.

### Option 2: CLI

```bash
# 1. Install dependencies
npm install

# 2. Get your bearer token from Chrome DevTools
# - Login to https://detections.dev.s2s.ai
# - Open DevTools (F12) → Network tab
# - Make any API call
# - Copy the "Authorization: Bearer ..." header value (without "Bearer ")

# 3. Configure environment variables
cp env.example .env
vim .env  # Add your ADMIN_TOKEN and USER_TOKEN_* values

# 4. Send invitations
npm run dev -- invite --env dev

# 5. (Wait for users to verify emails, then get their tokens)

# 6. Add user tokens to .env and create groups/sources
npm run dev -- setup --env dev

# 7. Check status
npm run dev -- status --env dev

# 8. (Optional) Delete groups and sources
npm run dev -- cleanup --env dev --confirm
```

> **Note:** Tokens expire after 1 hour. Just get a fresh token from DevTools when needed.

For detailed setup instructions, see **[SETUP.md](./SETUP.md)**.

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[WEB_UI.md](./WEB_UI.md)** | 🎨 **Web UI Guide!** Complete guide to the responsive web interface |
| **[CONFIGURATION_MANAGEMENT.md](./CONFIGURATION_MANAGEMENT.md)** | ⚙️ **Configuration Guide!** Token & group management, dark mode, auto-email generation |
| **[SETUP.md](./SETUP.md)** | 🚀 Complete setup guide for local & Docker |
| **[AUTH0_SETUP.md](./AUTH0_SETUP.md)** | 🔐 How to get Auth0 credentials (domain, client ID, secret) |
| **[FINAL_COMPLETE_PLAN.md](./FINAL_COMPLETE_PLAN.md)** | Complete architecture, database design, implementation plan |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System architecture, data flow, technology stack |
| **[SECURITY.md](./SECURITY.md)** | Credential management and security best practices |
| **[MCP_PLAYWRIGHT.md](./MCP_PLAYWRIGHT.md)** | How MCP Playwright works and troubleshooting |
| **[PACKAGES.md](./PACKAGES.md)** | Package versions, update policy, upgrade checklist |

## 🎯 Features

- ✅ **Beautiful Web UI** - Responsive single-page application with real-time status
- ✅ **Dark Mode** - System-aware dark/light mode with smooth transitions
- ✅ **Configuration Management** - Manage tokens, groups, and sources directly in the UI
- ✅ **Auto-Email Generation** - Smart email aliases based on environment and group ID
- ✅ **Smart State Tracking** - SQLite database remembers everything
- ✅ **Two-Phase Workflow** - Invitations → Manual Verification → Setup
- ✅ **Granular Cleanup** - Delete groups, sources, or both with selective control
- ✅ **Multi-Environment** - dev, qa, prod support with easy switching
- ✅ **Group Selection** - Target specific groups or process all at once

## 📋 CLI Commands

```bash
# Send invitations to users
npm run dev -- invite --env dev [--groups sigmahq,yara_100days]

# Create groups and sources
npm run dev -- setup --env dev [--groups sigmahq,yara_100days]

# Check current status
npm run dev -- status --env dev

# Delete groups and sources (requires --confirm)
npm run dev -- cleanup --env dev --confirm [--groups sigmahq,yara_100days]

# Delete only sources (keep groups)
npm run dev -- cleanup --env dev --sources-only --confirm

# Delete only groups (keep sources)
npm run dev -- cleanup --env dev --groups-only --confirm

# Reset database state (does NOT delete from API)
npm run dev -- reset --env dev --confirm [--groups sigmahq,yara_100days]

# List all configured groups
npm run dev -- list-groups
```

> **Tip:** Use `--groups` to target specific groups, or omit it to process all groups.

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
