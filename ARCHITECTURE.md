# Architecture Overview

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Application                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   invite     │  │    setup     │  │   status     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  .env (secrets) → Config.ts → Application                │  │
│  │  config/users.json (emails) → ConfigLoader               │  │
│  │  config/groups.json (configs) → ConfigLoader             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Orchestrator                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  InvitationWorkflow                                      │  │
│  │  - Check DB for already invited users                    │  │
│  │  - Send invites via admin                                │  │
│  │  - Record results in DB                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SetupWorkflow                                           │  │
│  │  - Check DB for completed setups                         │  │
│  │  - Filter users with passwords                           │  │
│  │  - Create groups and sources                             │  │
│  │  - Record results in DB                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        ↓                      ↓                       ↓
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ MCP Client   │   │  API Clients     │   │  StateDatabase   │
│              │   │                  │   │  (SQLite)        │
│ - Spawns     │   │ - DetectionsAPI  │   │                  │
│   Playwright │   │ - Integrations   │   │ - Track state    │
│   server     │   │   API            │   │ - Audit logs     │
│ - Automates  │   │                  │   │ - Smart queries  │
│   login      │   │                  │   │                  │
└──────────────┘   └──────────────────┘   └──────────────────┘
        ↓                      ↓                       ↓
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ MCP          │   │  External APIs   │   │  Local SQLite    │
│ Playwright   │   │                  │   │  Database        │
│ Server       │   │ - Detections API │   │  data/state.db   │
│ (via npx)    │   │ - Integrations   │   │                  │
│              │   │   Management     │   │                  │
└──────────────┘   └──────────────────┘   └──────────────────┘
```

## Security Architecture

### Credential Flow

```
Developer's Machine:
┌────────────────────────────────────────────┐
│  .env file (gitignored)                    │
│  ├─ ADMIN_EMAIL=admin@company.com          │
│  ├─ ADMIN_PASSWORD=secret123               │
│  ├─ USER_PASSWORD_SIGMAHQ=password1        │
│  └─ USER_PASSWORD_YARA_100DAYS=password2   │
└────────────────────────────────────────────┘
                    ↓ (loaded at runtime)
┌────────────────────────────────────────────┐
│  Config.ts (in code)                       │
│  ├─ Config.adminEmail → process.env        │
│  ├─ Config.adminPassword → process.env     │
│  └─ Config.getUserPassword(id) → process.env│
└────────────────────────────────────────────┘
                    ↓ (used by)
┌────────────────────────────────────────────┐
│  Workflows                                 │
│  ├─ InvitationWorkflow                     │
│  └─ SetupWorkflow                          │
└────────────────────────────────────────────┘
```

### What's Committed to Git

✅ **Safe to Commit:**
- `config/users.json` - Emails only, no passwords
- `config/groups.json` - Group configurations
- `.env.example` - Template with placeholders
- All source code

❌ **Never Committed (in .gitignore):**
- `.env` - Real credentials
- `.env.dev`, `.env.qa`, `.env.prod` - Environment-specific credentials
- `data/` - SQLite database with operation history
- `node_modules/` - Dependencies

## Data Flow

### 1. Invitation Flow

```
User runs: npm run dev -- invite --env dev

1. Load .env → Config.validate()
2. Load config/users.json → ConfigLoader
3. Query StateDatabase → Who needs invites?
4. MCP login as admin → Get token
5. Call DetectionsAPI.sendInvitations()
6. Parse response → Record in StateDatabase
7. Display results
```

### 2. Setup Flow

```
User runs: npm run dev -- setup --env dev

1. Load .env → Config.validate()
2. Load config/users.json + passwords from .env
3. Load config/groups.json
4. Query StateDatabase → Who needs setup?
5. Filter users → Only those with real passwords
6. For each user:
   a. MCP login as user → Get token
   b. Call DetectionsAPI.createGroup()
   c. Record group_id in StateDatabase
   d. Call IntegrationsAPI.createSource()
   e. Record source_id in StateDatabase
7. Display summary
```

## MCP Playwright Integration

### How It Works

```
Our App                    MCP Server (External)
┌─────────────────┐       ┌─────────────────────┐
│ MCPClient       │       │ Playwright Server   │
│ .connect()      │──────▶│ (spawned via npx)   │
│                 │       │                     │
│ .login(url,     │──────▶│ 1. Navigate to URL  │
│   email, pwd)   │       │ 2. Fill email       │
│                 │       │ 3. Fill password    │
│                 │       │ 4. Click submit     │
│                 │       │ 5. Get token from   │
│                 │◀──────│    localStorage     │
│                 │       │                     │
│ token = "..."   │       │                     │
└─────────────────┘       └─────────────────────┘
```

**Key Points:**
- MCP server is **external** (not in our dependencies)
- Downloaded on-demand via `npx`
- Communicates via **stdio** (standard input/output)
- Browser is **isolated** from our app process

### Benefits

1. **No Browser Management** - Server handles lifecycle
2. **Clean Separation** - Browser automation is external
3. **Easy Updates** - Just update MCP server version
4. **Cross-Platform** - Works on Windows, Mac, Linux, Docker

## State Management

### SQLite Database Schema

```
users
├─ id (primary key)
├─ email
└─ is_admin

invitations
├─ user_id → users.id
├─ environment (dev/qa/prod)
├─ invitation_sent
└─ already_existed

groups
├─ user_id → users.id
├─ environment
├─ group_api_id (from API response)
├─ group_name
└─ group_created

sources
├─ user_id → users.id
├─ group_id → groups.id
├─ environment
├─ source_api_id (from API response)
└─ source_created

operation_logs
├─ operation_type
├─ user_id
├─ environment
├─ status
└─ created_at
```

### Smart Features

The StateDatabase provides:

1. **Idempotent Operations** - Safe to re-run
2. **Incremental Processing** - Skip completed items
3. **Audit Trail** - Full operation history
4. **Status Queries** - Real-time progress
5. **Reset Capability** - Clean slate when needed

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Language** | TypeScript | Type safety |
| **Runtime** | Node.js 20+ | Modern JavaScript |
| **CLI** | Commander.js | Command parsing |
| **Config** | dotenv | Environment variables |
| **Database** | SQLite (better-sqlite3) | State tracking |
| **API** | Axios | HTTP requests |
| **Automation** | MCP Playwright | Browser control |
| **Build** | tsc (TypeScript compiler) | Transpilation |
| **Dev** | tsx | Fast TS execution |

## Package Management

### Latest Versions (as of Dec 2024)

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "axios": "^1.7.9",
    "better-sqlite3": "^11.7.0",
    "commander": "^12.1.0",
    "dotenv": "^16.4.7",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "tsx": "^4.19.2",
    "vitest": "^2.1.8"
  }
}
```

## Deployment Options

### 1. Local Development
```bash
npm install
cp .env.example .env
npm run dev -- invite --env dev
```

### 2. Docker
```bash
docker build -t broadcast-automation .
docker run -v $(pwd)/data:/app/data \
           --env-file .env \
           broadcast-automation invite --env dev
```

### 3. CI/CD
```yaml
# GitHub Actions example
steps:
  - name: Run automation
    env:
      ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
    run: npm run start -- invite --env prod
```

---

## Summary

This architecture provides:
- ✅ **Security** - Credentials never in Git
- ✅ **Simplicity** - Clear separation of concerns
- ✅ **Reliability** - State tracking prevents duplication
- ✅ **Flexibility** - Easy to add new groups/users
- ✅ **Maintainability** - TypeScript + clean code

