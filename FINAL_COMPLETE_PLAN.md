# Broadcast Group Automation - Complete Plan

**Version:** 2.0  
**Last Updated:** October 2025  
**Status:** Ready for Implementation  

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Requirements](#requirements)
3. [Architecture Overview](#architecture-overview)
4. [Database Design](#database-design)
5. [Backend Implementation](#backend-implementation)
6. [CLI Implementation](#cli-implementation)
7. [Web UI Implementation](#web-ui-implementation-optional)
8. [Smart Automation Features](#smart-automation-features)
9. [Technology Stack](#technology-stack)
10. [Implementation Plan](#implementation-plan)
11. [Usage Guide](#usage-guide)
12. [Deployment](#deployment)

---

## 1. Executive Summary

### Goal
Automate the creation of security content groups and sources across multiple platforms (SigmaHQ, YARA, Google SecOps, Azure Sentinel, etc.) with intelligent state tracking and optional web UI.

### Key Features
- ✅ **Two-Phase Workflow**: Invitations → Manual Verification → Setup
- ✅ **Smart State Tracking**: SQLite database tracks what's been done
- ✅ **MCP Playwright**: Automated login and token retrieval
- ✅ **Incremental Setup**: Process users as they verify
- ✅ **CLI + Optional UI**: Command-line or web interface
- ✅ **Multi-Environment**: dev, qa, prod support

### Technology
- **Backend**: Node.js + TypeScript
- **CLI**: Commander.js
- **Browser Automation**: MCP Playwright
- **Database**: SQLite (better-sqlite3)
- **UI (Optional)**: React + Vite + TailwindCSS
- **API Client**: Axios

---

## 2. Requirements

### Functional Requirements

#### FR-1: User Management
- Store user credentials (admin + group users)
- Support placeholder passwords before verification
- Track verification status

#### FR-2: Invitation Management
- Send invitations via Detections API
- Track invitation status per user per environment
- Skip already-invited users automatically

#### FR-3: Group Management
- Create groups via Detections API
- Track group creation status
- Store group IDs from API responses

#### FR-4: Source Management
- Create sources via Integrations API
- Link sources to groups (using group IDs)
- Track source creation status

#### FR-5: State Tracking
- Persist operation history in SQLite
- Track: invitations, groups, sources per environment
- Enable incremental operations

#### FR-6: Multi-Environment Support
- Support dev, qa, prod environments
- Separate state tracking per environment
- Environment-specific configurations

#### FR-7: Token Management
- Retrieve tokens via MCP Playwright (automated login)
- Store tokens temporarily (in-memory, not persisted)
- Use tokens for API calls

#### FR-8: CLI Interface
- `invite` command - send invitations
- `setup` command - create groups and sources
- `list-groups` command - show all configured groups
- `status` command - show current state
- `reset` command - clear state for specific groups

#### FR-9: Web UI (Optional)
- Dashboard showing group status
- Manual trigger for invite/setup operations
- Real-time progress updates
- Configuration management

### Non-Functional Requirements

#### NFR-1: Performance
- SQLite operations < 10ms
- MCP Playwright login < 5s per user
- Batch operations support

#### NFR-2: Reliability
- Transaction support for database operations
- Automatic retry for transient failures
- Graceful error handling

#### NFR-3: Usability
- Clear CLI output with summaries
- Incremental setup support
- Helpful error messages

#### NFR-4: Maintainability
- Clean architecture
- Comprehensive logging
- Easy to add new groups

---

## 3. Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLI / Web UI                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   invite     │  │    setup     │  │   status     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Orchestrator                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - InvitationWorkflow                                    │  │
│  │  - GroupSetupWorkflow                                    │  │
│  │  - SourceSetupWorkflow                                   │  │
│  │  - Smart state checking (query DB before operations)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        ↓                      ↓                       ↓
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ MCP Client   │   │  API Client      │   │  State Manager   │
│              │   │                  │   │  (SQLite)        │
│ - Login      │   │ - Invitations    │   │                  │
│ - Get Token  │   │ - Create Groups  │   │ - Track ops      │
│              │   │ - Create Sources │   │ - Query state    │
└──────────────┘   └──────────────────┘   └──────────────────┘
        ↓                      ↓                       ↓
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ MCP          │   │  External APIs   │   │  Local SQLite    │
│ Playwright   │   │                  │   │  Database        │
│ Server       │   │ - Detections API │   │  state.db        │
│              │   │ - Integrations   │   │                  │
└──────────────┘   └──────────────────┘   └──────────────────┘
```

### Two-Phase Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1: INVITATIONS                        │
│                                                                 │
│  1. Check DB: Which users already invited?                     │
│     ↓                                                           │
│  2. Admin Login (MCP Playwright)                               │
│     ↓                                                           │
│  3. Send Invitations (only new users)                          │
│     ↓                                                           │
│  4. Record in DB: invitation_sent = true                       │
│     ↓                                                           │
│  ✋ STOP - Wait for manual verification                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ⏱️ MANUAL STEP (Outside App)
                              ↓
                    Users verify emails
                    Users set passwords
                    Update config/users.json
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 2: SETUP GROUPS & SOURCES                 │
│                                                                 │
│  1. Check DB: Which groups already created?                    │
│     ↓                                                           │
│  2. Filter: Only users with verified passwords                 │
│     ↓                                                           │
│  3. For each ready user:                                       │
│     a. User Login (MCP Playwright)                             │
│     b. Create Group (if not exists in DB)                      │
│     c. Record in DB: group_id, group_created = true            │
│     d. Create Source (if not exists in DB)                     │
│     e. Record in DB: source_id, source_created = true          │
│     ↓                                                           │
│  4. Summary: success/failed/skipped                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Design

### SQLite Schema

```sql
-- ============================================
-- State Tracking Database
-- ============================================

-- Users table (mirrors config/users.json)
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- 'sigmahq', 'yara_100days'
  email TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Invitations table (tracks per environment)
CREATE TABLE invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  environment TEXT NOT NULL,              -- 'dev', 'qa', 'prod'
  invitation_sent BOOLEAN DEFAULT 0,
  invitation_sent_at TEXT,
  already_existed BOOLEAN DEFAULT 0,      -- user already existed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, environment),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Groups table (tracks created groups)
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  group_api_id TEXT,                      -- ID returned from API
  group_name TEXT NOT NULL,
  group_created BOOLEAN DEFAULT 0,
  group_created_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, environment),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sources table (tracks created sources)
CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  group_id INTEGER,                       -- FK to groups table
  source_api_id TEXT,                     -- ID returned from API
  source_name TEXT NOT NULL,
  source_created BOOLEAN DEFAULT 0,
  source_created_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, environment),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Operation logs (audit trail)
CREATE TABLE operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL,           -- 'invite', 'create_group', 'create_source'
  user_id TEXT,
  environment TEXT NOT NULL,
  status TEXT NOT NULL,                   -- 'success', 'failed', 'skipped'
  error_message TEXT,
  details TEXT,                           -- JSON with additional info
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_invitations_user_env ON invitations(user_id, environment);
CREATE INDEX idx_groups_user_env ON groups(user_id, environment);
CREATE INDEX idx_sources_user_env ON sources(user_id, environment);
CREATE INDEX idx_operation_logs_type_env ON operation_logs(operation_type, environment);
CREATE INDEX idx_operation_logs_created ON operation_logs(created_at);
```

### Database Helpers

```typescript
// src/database/db.ts
import Database from 'better-sqlite3';
import path from 'path';

export class StateDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/state.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
    this.initSchema();
  }

  private initSchema() {
    // Run schema creation SQL
    this.db.exec(SCHEMA_SQL);
  }

  // ============================================
  // Invitation Tracking
  // ============================================

  isUserInvited(userId: string, environment: string): boolean {
    const row = this.db.prepare(`
      SELECT invitation_sent, already_existed 
      FROM invitations 
      WHERE user_id = ? AND environment = ?
    `).get(userId, environment);
    
    return row ? (row.invitation_sent || row.already_existed) : false;
  }

  recordInvitation(userId: string, environment: string, alreadyExisted: boolean) {
    this.db.prepare(`
      INSERT INTO invitations (user_id, environment, invitation_sent, invitation_sent_at, already_existed)
      VALUES (?, ?, ?, datetime('now'), ?)
      ON CONFLICT(user_id, environment) 
      DO UPDATE SET invitation_sent = 1, invitation_sent_at = datetime('now'), already_existed = ?
    `).run(userId, environment, alreadyExisted ? 0 : 1, alreadyExisted, alreadyExisted);
  }

  // ============================================
  // Group Tracking
  // ============================================

  isGroupCreated(userId: string, environment: string): boolean {
    const row = this.db.prepare(`
      SELECT group_created FROM groups 
      WHERE user_id = ? AND environment = ?
    `).get(userId, environment);
    
    return row ? row.group_created : false;
  }

  getGroupApiId(userId: string, environment: string): string | null {
    const row = this.db.prepare(`
      SELECT group_api_id FROM groups 
      WHERE user_id = ? AND environment = ?
    `).get(userId, environment);
    
    return row ? row.group_api_id : null;
  }

  recordGroupCreation(userId: string, environment: string, groupApiId: string, groupName: string) {
    this.db.prepare(`
      INSERT INTO groups (user_id, environment, group_api_id, group_name, group_created, group_created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, environment) 
      DO UPDATE SET group_api_id = ?, group_created = 1, group_created_at = datetime('now')
    `).run(userId, environment, groupApiId, groupName, groupApiId);
  }

  // ============================================
  // Source Tracking
  // ============================================

  isSourceCreated(userId: string, environment: string): boolean {
    const row = this.db.prepare(`
      SELECT source_created FROM sources 
      WHERE user_id = ? AND environment = ?
    `).get(userId, environment);
    
    return row ? row.source_created : false;
  }

  recordSourceCreation(userId: string, environment: string, sourceApiId: string, sourceName: string) {
    const groupRow = this.db.prepare(`
      SELECT id FROM groups WHERE user_id = ? AND environment = ?
    `).get(userId, environment);

    this.db.prepare(`
      INSERT INTO sources (user_id, environment, group_id, source_api_id, source_name, source_created, source_created_at)
      VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, environment) 
      DO UPDATE SET source_api_id = ?, source_created = 1, source_created_at = datetime('now')
    `).run(userId, environment, groupRow?.id, sourceApiId, sourceName, sourceApiId);
  }

  // ============================================
  // Status Queries
  // ============================================

  getUserStatus(userId: string, environment: string) {
    return {
      invited: this.isUserInvited(userId, environment),
      groupCreated: this.isGroupCreated(userId, environment),
      sourceCreated: this.isSourceCreated(userId, environment),
      groupApiId: this.getGroupApiId(userId, environment)
    };
  }

  getAllStatus(environment: string) {
    return this.db.prepare(`
      SELECT 
        u.id as user_id,
        u.email,
        COALESCE(i.invitation_sent, 0) as invited,
        COALESCE(g.group_created, 0) as group_created,
        g.group_api_id,
        COALESCE(s.source_created, 0) as source_created
      FROM users u
      LEFT JOIN invitations i ON u.id = i.user_id AND i.environment = ?
      LEFT JOIN groups g ON u.id = g.user_id AND g.environment = ?
      LEFT JOIN sources s ON u.id = s.user_id AND s.environment = ?
      WHERE u.is_admin = 0
      ORDER BY u.id
    `).all(environment, environment, environment);
  }

  // ============================================
  // Reset Operations
  // ============================================

  resetUser(userId: string, environment: string) {
    const transaction = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM invitations WHERE user_id = ? AND environment = ?`).run(userId, environment);
      this.db.prepare(`DELETE FROM sources WHERE user_id = ? AND environment = ?`).run(userId, environment);
      this.db.prepare(`DELETE FROM groups WHERE user_id = ? AND environment = ?`).run(userId, environment);
    });
    
    transaction();
  }

  resetEnvironment(environment: string) {
    const transaction = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM invitations WHERE environment = ?`).run(environment);
      this.db.prepare(`DELETE FROM sources WHERE environment = ?`).run(environment);
      this.db.prepare(`DELETE FROM groups WHERE environment = ?`).run(environment);
    });
    
    transaction();
  }

  // ============================================
  // Operation Logging
  // ============================================

  logOperation(type: string, userId: string, environment: string, status: string, error?: string, details?: any) {
    this.db.prepare(`
      INSERT INTO operation_logs (operation_type, user_id, environment, status, error_message, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, userId, environment, status, error || null, details ? JSON.stringify(details) : null);
  }

  close() {
    this.db.close();
  }
}
```

---

## 5. Backend Implementation

### Project Structure

```
broadcast-automation/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── server.ts                   # Web server (optional)
│   │
│   ├── database/
│   │   ├── db.ts                   # SQLite database class
│   │   └── schema.sql              # Database schema
│   │
│   ├── mcp/
│   │   └── client.ts               # MCP Playwright wrapper
│   │
│   ├── api/
│   │   ├── detections.ts           # Detections API client
│   │   └── integrations.ts         # Integrations API client
│   │
│   ├── workflows/
│   │   ├── invitation.ts           # Invitation workflow
│   │   ├── group-setup.ts          # Group setup workflow
│   │   └── source-setup.ts         # Source setup workflow
│   │
│   ├── cli/
│   │   ├── commands.ts             # CLI commands
│   │   └── formatters.ts           # Output formatting
│   │
│   ├── config/
│   │   ├── loader.ts               # Load config files
│   │   └── validator.ts            # Validate config
│   │
│   └── types/
│       └── index.ts                # TypeScript types
│
├── ui/                              # Optional web UI
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── api/
│   ├── index.html
│   └── vite.config.ts
│
├── config/
│   ├── users.json                  # User credentials
│   ├── groups.json                 # Group configurations
│   └── .env                        # Environment settings
│
├── data/
│   └── state.db                    # SQLite database (gitignored)
│
├── package.json
├── tsconfig.json
└── README.md
```

### Workflow Implementation

```typescript
// src/workflows/invitation.ts
import { StateDatabase } from '../database/db';
import { MCPClient } from '../mcp/client';
import { DetectionsAPI } from '../api/detections';

export class InvitationWorkflow {
  constructor(
    private db: StateDatabase,
    private mcpClient: MCPClient,
    private detectionsAPI: DetectionsAPI,
    private environment: string
  ) {}

  async execute(userIds: string[] | null = null) {
    console.log("🚀 PHASE 1: Sending Invitations\n");

    // Load users
    const allUsers = this.loadUsers();
    const selectedUsers = userIds 
      ? allUsers.filter(u => userIds.includes(u.id))
      : allUsers;

    // Filter: Who needs invitations?
    const needsInvite: string[] = [];
    const alreadyInvited: string[] = [];

    for (const user of selectedUsers) {
      const invited = this.db.isUserInvited(user.id, this.environment);
      
      if (invited) {
        alreadyInvited.push(user.email);
      } else {
        needsInvite.push(user.email);
      }
    }

    console.log(`📊 Pre-Check:`);
    console.log(`   🆕 Needs invitation: ${needsInvite.length}`);
    console.log(`   ✅ Already invited: ${alreadyInvited.length}\n`);

    if (needsInvite.length === 0) {
      console.log("✅ All users already invited!\n");
      return;
    }

    // Get admin token
    console.log("=== Admin Login ===");
    const adminToken = await this.mcpClient.login(adminEmail, adminPassword);

    // Send invitations
    console.log("\n=== Sending Invitations ===");
    const result = await this.detectionsAPI.sendInvitations(adminToken, needsInvite);

    // Parse API response
    const invited = result.data?.invitations || [];
    const existed = needsInvite.filter(email => !invited.includes(email));

    // Record in database
    for (const email of invited) {
      const user = selectedUsers.find(u => u.email === email);
      if (user) {
        this.db.recordInvitation(user.id, this.environment, false);
        this.db.logOperation('invite', user.id, this.environment, 'success');
      }
    }

    for (const email of existed) {
      const user = selectedUsers.find(u => u.email === email);
      if (user) {
        this.db.recordInvitation(user.id, this.environment, true);
        this.db.logOperation('invite', user.id, this.environment, 'skipped', 'User already exists');
      }
    }

    // Report results
    console.log("\n📊 Results:");
    if (invited.length > 0) {
      console.log(`   ✅ Sent: ${invited.length}`);
      invited.forEach(email => console.log(`      - ${email}`));
    }
    
    if (existed.length > 0) {
      console.log(`   ⏭️  Already existed: ${existed.length}`);
      existed.forEach(email => console.log(`      - ${email}`));
    }

    if (alreadyInvited.length > 0) {
      console.log(`   📝 Previously invited: ${alreadyInvited.length}`);
    }

    console.log("\n⏸️  NEXT STEPS:");
    console.log("   1. Wait for users to verify emails");
    console.log("   2. Update config/users.json with passwords");
    console.log(`   3. Run: npm run start -- setup --env ${this.environment}\n`);
  }
}
```

```typescript
// src/workflows/group-setup.ts
import { StateDatabase } from '../database/db';
import { MCPClient } from '../mcp/client';
import { DetectionsAPI } from '../api/detections';
import { IntegrationsAPI } from '../api/integrations';

export class GroupSetupWorkflow {
  constructor(
    private db: StateDatabase,
    private mcpClient: MCPClient,
    private detectionsAPI: DetectionsAPI,
    private integrationsAPI: IntegrationsAPI,
    private environment: string
  ) {}

  async execute(userIds: string[] | null = null) {
    console.log("🚀 PHASE 2: Setting Up Groups & Sources\n");

    // Load users and configs
    const allUsers = this.loadUsers();
    const groupConfigs = this.loadGroupConfigs();
    const selectedUsers = userIds 
      ? allUsers.filter(u => userIds.includes(u.id))
      : allUsers;

    // Categorize users
    const readyUsers: any[] = [];
    const notReadyUsers: any[] = [];
    const alreadyDoneUsers: any[] = [];

    for (const user of selectedUsers) {
      // Check password
      const hasPassword = user.password && user.password !== "REPLACE_AFTER_VERIFICATION";
      
      // Check database
      const status = this.db.getUserStatus(user.id, this.environment);
      
      if (!hasPassword) {
        notReadyUsers.push(user);
      } else if (status.groupCreated && status.sourceCreated) {
        alreadyDoneUsers.push(user);
      } else {
        readyUsers.push(user);
      }
    }

    // Status report
    console.log(`📊 Status Check:`);
    console.log(`   ✅ Ready to setup: ${readyUsers.length}`);
    if (notReadyUsers.length > 0) {
      console.log(`   ⏭️  Skipping (no password): ${notReadyUsers.length}`);
      notReadyUsers.forEach(u => console.log(`      - ${u.id} (${u.email})`));
    }
    if (alreadyDoneUsers.length > 0) {
      console.log(`   📝 Already complete: ${alreadyDoneUsers.length}`);
      alreadyDoneUsers.forEach(u => console.log(`      - ${u.id}`));
    }
    console.log();

    if (readyUsers.length === 0) {
      console.log("⚠️  No users ready for setup.\n");
      return;
    }

    // Process each ready user
    const results = { success: [], failed: [], skipped: [] };

    for (const user of readyUsers) {
      console.log(`─────────────────────────────────────`);
      console.log(`📦 Processing: ${user.id}`);
      console.log(`─────────────────────────────────────`);

      try {
        // Get user token
        console.log(`🔐 Logging in as ${user.email}...`);
        const userToken = await this.mcpClient.login(user.email, user.password);

        // Find group config
        const groupConfig = groupConfigs.find(g => g.id === user.id);
        if (!groupConfig) {
          console.log(`⚠️  No group config found, skipping...\n`);
          results.skipped.push(user.id);
          continue;
        }

        // Create group (if not exists)
        let groupApiId = this.db.getGroupApiId(user.id, this.environment);
        
        if (!groupApiId) {
          console.log(`🏗️  Creating group: ${groupConfig.name}...`);
          const groupResponse = await this.detectionsAPI.createGroup(userToken, groupConfig.group);
          groupApiId = groupResponse.data.id;
          
          this.db.recordGroupCreation(user.id, this.environment, groupApiId, groupConfig.name);
          this.db.logOperation('create_group', user.id, this.environment, 'success');
          console.log(`✅ Group created (ID: ${groupApiId})`);
        } else {
          console.log(`📝 Group already exists (ID: ${groupApiId})`);
        }

        // Create source (if not exists)
        if (!this.db.isSourceCreated(user.id, this.environment)) {
          console.log(`📂 Creating source: ${groupConfig.source.name}...`);
          
          // Replace <group_id> placeholder
          const sourcePayload = JSON.parse(
            JSON.stringify(groupConfig.source).replace(/<group_id>/g, groupApiId)
          );
          
          const sourceResponse = await this.integrationsAPI.createSource(userToken, sourcePayload);
          const sourceId = sourceResponse.data.id || sourceResponse.data.source_id;
          
          this.db.recordSourceCreation(user.id, this.environment, sourceId, groupConfig.source.name);
          this.db.logOperation('create_source', user.id, this.environment, 'success');
          console.log(`✅ Source created (ID: ${sourceId})`);
        } else {
          console.log(`📝 Source already exists`);
        }

        console.log(`✅ Completed: ${user.id}\n`);
        results.success.push(user.id);

      } catch (error) {
        console.error(`❌ Failed: ${user.id} - ${error.message}\n`);
        this.db.logOperation('setup', user.id, this.environment, 'failed', error.message);
        results.failed.push(user.id);
      }
    }

    // Summary
    console.log("═══════════════════════════════════════");
    console.log("📊 Summary");
    console.log("═══════════════════════════════════════");
    console.log(`   ✅ Success: ${results.success.length}`);
    if (results.success.length > 0) {
      results.success.forEach(id => console.log(`      - ${id}`));
    }
    
    if (results.failed.length > 0) {
      console.log(`   ❌ Failed: ${results.failed.length}`);
      results.failed.forEach(id => console.log(`      - ${id}`));
    }
    
    const totalSkipped = notReadyUsers.length + results.skipped.length;
    if (totalSkipped > 0) {
      console.log(`   ⏭️  Skipped: ${totalSkipped}`);
    }
    console.log("═══════════════════════════════════════\n");

    if (notReadyUsers.length > 0) {
      const skippedIds = notReadyUsers.map(u => u.id).join(',');
      console.log("💡 To setup skipped groups:");
      console.log("   1. Update config/users.json with passwords");
      console.log(`   2. Run: npm run start -- setup --env ${this.environment} --groups ${skippedIds}\n`);
    }
  }
}
```

---

## 6. CLI Implementation

### Commands

```typescript
// src/cli/commands.ts
import { Command } from 'commander';
import { StateDatabase } from '../database/db';
import { InvitationWorkflow } from '../workflows/invitation';
import { GroupSetupWorkflow } from '../workflows/group-setup';

const program = new Command();

program
  .name("broadcast-automation")
  .description("Automate group and source creation with smart state tracking")
  .version("2.0.0");

// ============================================
// invite - Send invitations
// ============================================
program
  .command("invite")
  .description("Send invitations to users (smart: skips already invited)")
  .option("-e, --env <environment>", "Environment (dev, qa, prod)", "dev")
  .option("-g, --groups <groups>", "Comma-separated group IDs or 'all'", "all")
  .action(async (options) => {
    const groupIds = options.groups === "all" ? null : options.groups.split(",").map(s => s.trim());
    
    const db = new StateDatabase();
    const workflow = new InvitationWorkflow(db, mcpClient, detectionsAPI, options.env);
    
    await workflow.execute(groupIds);
    
    db.close();
  });

// ============================================
// setup - Create groups and sources
// ============================================
program
  .command("setup")
  .description("Create groups and sources (smart: skips incomplete/done)")
  .option("-e, --env <environment>", "Environment (dev, qa, prod)", "dev")
  .option("-g, --groups <groups>", "Comma-separated group IDs or 'all'", "all")
  .action(async (options) => {
    const groupIds = options.groups === "all" ? null : options.groups.split(",").map(s => s.trim());
    
    const db = new StateDatabase();
    const workflow = new GroupSetupWorkflow(db, mcpClient, detectionsAPI, integrationsAPI, options.env);
    
    await workflow.execute(groupIds);
    
    db.close();
  });

// ============================================
// status - Show current state
// ============================================
program
  .command("status")
  .description("Show status of all groups")
  .option("-e, --env <environment>", "Environment (dev, qa, prod)", "dev")
  .action((options) => {
    const db = new StateDatabase();
    const status = db.getAllStatus(options.env);
    
    console.log(`\n📊 Status Report (${options.env})\n`);
    console.log("┌──────────────────────────┬──────────┬───────┬────────┐");
    console.log("│ Group ID                 │ Invited  │ Group │ Source │");
    console.log("├──────────────────────────┼──────────┼───────┼────────┤");
    
    status.forEach(s => {
      console.log(`│ ${s.user_id.padEnd(24)} │ ${s.invited ? '✅' : '⏳'}      │ ${s.group_created ? '✅' : '⏳'}    │ ${s.source_created ? '✅' : '⏳'}     │`);
    });
    
    console.log("└──────────────────────────┴──────────┴───────┴────────┘\n");
    
    db.close();
  });

// ============================================
// reset - Clear state for groups
// ============================================
program
  .command("reset")
  .description("Reset state for specific groups")
  .option("-e, --env <environment>", "Environment (dev, qa, prod)", "dev")
  .option("-g, --groups <groups>", "Comma-separated group IDs or 'all'")
  .option("--confirm", "Confirm reset operation")
  .action((options) => {
    if (!options.confirm) {
      console.log("⚠️  Please add --confirm flag to reset state\n");
      return;
    }
    
    const db = new StateDatabase();
    
    if (options.groups === "all") {
      db.resetEnvironment(options.env);
      console.log(`✅ Reset all groups for ${options.env}\n`);
    } else {
      const groupIds = options.groups.split(",").map(s => s.trim());
      groupIds.forEach(id => db.resetUser(id, options.env));
      console.log(`✅ Reset ${groupIds.length} groups for ${options.env}\n`);
    }
    
    db.close();
  });

// ============================================
// list-groups - Show all groups
// ============================================
program
  .command("list-groups")
  .description("List all configured groups")
  .action(() => {
    const groups = loadGroupConfigs();
    
    console.log("\n📋 Available Groups:\n");
    groups.forEach(group => {
      console.log(`  - ${group.id.padEnd(20)} ${group.name}`);
    });
    console.log();
  });

program.parse();
```

---

## 7. Web UI Implementation (Optional)

### Lightweight Responsive UI

```typescript
// ui/src/App.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';

interface GroupStatus {
  user_id: string;
  email: string;
  invited: boolean;
  group_created: boolean;
  source_created: boolean;
  group_api_id?: string;
}

export default function App() {
  const [environment, setEnvironment] = useState<'dev' | 'qa' | 'prod'>('dev');
  const [status, setStatus] = useState<GroupStatus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [environment]);

  const loadStatus = async () => {
    const response = await axios.get(`/api/status?env=${environment}`);
    setStatus(response.data);
  };

  const runInvite = async (groupIds?: string[]) => {
    setLoading(true);
    try {
      await axios.post('/api/invite', { environment, groupIds });
      await loadStatus();
    } finally {
      setLoading(false);
    }
  };

  const runSetup = async (groupIds?: string[]) => {
    setLoading(true);
    try {
      await axios.post('/api/setup', { environment, groupIds });
      await loadStatus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Broadcast Group Automation
        </h1>

        {/* Environment Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Environment
          </label>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as any)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="dev">Development</option>
            <option value="qa">QA</option>
            <option value="prod">Production</option>
          </select>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={() => runInvite()}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Send All Invitations
            </button>
            <button
              onClick={() => runSetup()}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300"
            >
              Setup All Groups
            </button>
          </div>
        </div>

        {/* Status Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {status.map((group) => (
                <tr key={group.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {group.user_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {group.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-2xl">
                    {group.invited ? '✅' : '⏳'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-2xl">
                    {group.group_created ? '✅' : '⏳'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-2xl">
                    {group.source_created ? '✅' : '⏳'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <button
                      onClick={() => runInvite([group.user_id])}
                      disabled={group.invited || loading}
                      className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 mr-2"
                    >
                      Invite
                    </button>
                    <button
                      onClick={() => runSetup([group.user_id])}
                      disabled={!group.invited || (group.group_created && group.source_created) || loading}
                      className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                    >
                      Setup
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### Web Server

```typescript
// src/server.ts
import express from 'express';
import { StateDatabase } from './database/db';
import { InvitationWorkflow } from './workflows/invitation';
import { GroupSetupWorkflow } from './workflows/group-setup';

const app = express();
app.use(express.json());
app.use(express.static('ui/dist'));

const db = new StateDatabase();

// Get status
app.get('/api/status', (req, res) => {
  const env = req.query.env as string || 'dev';
  const status = db.getAllStatus(env);
  res.json(status);
});

// Send invitations
app.post('/api/invite', async (req, res) => {
  const { environment, groupIds } = req.body;
  
  try {
    const workflow = new InvitationWorkflow(db, mcpClient, detectionsAPI, environment);
    await workflow.execute(groupIds);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setup groups
app.post('/api/setup', async (req, res) => {
  const { environment, groupIds } = req.body;
  
  try {
    const workflow = new GroupSetupWorkflow(db, mcpClient, detectionsAPI, integrationsAPI, environment);
    await workflow.execute(groupIds);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

## 8. Smart Automation Features

### Intelligence Built-In

#### 1. **Pre-Flight Checks**
Before any operation, query the database:
```typescript
// Example: Before sending invitations
const needsInvite = users.filter(u => !db.isUserInvited(u.id, env));
const alreadyInvited = users.filter(u => db.isUserInvited(u.id, env));

// Only send to needsInvite
```

#### 2. **Auto-Skip Logic**
```typescript
// Skip users based on:
- Password is "REPLACE_AFTER_VERIFICATION"
- Already invited (DB check)
- Group already created (DB check)
- Source already created (DB check)
```

#### 3. **Idempotent Operations**
```typescript
// Safe to re-run:
npm run start -- invite --env dev    // Only invites new users
npm run start -- setup --env dev     // Only creates missing resources
```

#### 4. **Incremental Processing**
```typescript
// Day 1: Invite all
invite --env dev

// Day 2: 2 users verified, setup them
setup --env dev  // Processes 2, skips 4

// Day 3: 3 more verified, setup them
setup --env dev  // Processes 3 new, skips 2 done + 1 not ready
```

#### 5. **Smart Error Handling**
```typescript
// Continue on failure:
for (const user of users) {
  try {
    await setupUser(user);
    db.recordSuccess(user.id);
  } catch (error) {
    db.logError(user.id, error);
    continue; // Don't stop entire batch
  }
}
```

---

## 9. Technology Stack

### Backend
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "better-sqlite3": "^9.0.0",
    "axios": "^1.5.0",
    "commander": "^11.0.0",
    "dotenv": "^16.3.0",
    "express": "^4.18.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.0"
  }
}
```

### Frontend (Optional UI)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}
```

---

## 10. Implementation Plan

### Phase 1: Core CLI (Week 1)
- ✅ Day 1-2: Database schema and StateDatabase class
- ✅ Day 3-4: MCP client wrapper and API clients
- ✅ Day 5-6: Invitation and setup workflows
- ✅ Day 7: CLI commands and testing

### Phase 2: Smart Features (Week 2)
- ✅ Day 1-2: State checking logic
- ✅ Day 3-4: Auto-skip and incremental processing
- ✅ Day 5: Status command and reset command
- ✅ Day 6-7: Testing and polish

### Phase 3: Optional UI (Week 3)
- ✅ Day 1-2: React UI components
- ✅ Day 3-4: Express API server
- ✅ Day 5: Integration and testing
- ✅ Day 6-7: Responsive design and polish

---

## 11. Usage Guide

### Initial Setup

```bash
# Install dependencies
npm install

# Configure users (with placeholder passwords)
cat > config/users.json << EOF
{
  "admin": {
    "email": "admin@company.com",
    "password": "admin_password"
  },
  "users": [
    {
      "id": "sigmahq",
      "email": "groups+sigmahq_dev@detections.ai",
      "password": "REPLACE_AFTER_VERIFICATION"
    }
  ]
}
EOF

# Configure groups
cat > config/groups.json << EOF
{
  "groups": [
    {
      "id": "sigmahq",
      "name": "SigmaHQ Private",
      "group": { ... },
      "source": { ... }
    }
  ]
}
EOF
```

### Complete Workflow

```bash
# ===== PHASE 1: Invitations =====

# Send invitations (smart: skips already invited)
npm run start -- invite --env dev

# Check status
npm run start -- status --env dev

# Output:
# ┌──────────────┬──────────┬───────┬────────┐
# │ Group ID     │ Invited  │ Group │ Source │
# ├──────────────┼──────────┼───────┼────────┤
# │ sigmahq      │ ✅       │ ⏳    │ ⏳     │
# │ yara_100days │ ✅       │ ⏳    │ ⏳     │
# └──────────────┴──────────┴───────┴────────┘


# ===== MANUAL STEP: Wait for verification =====

# Update config/users.json with real passwords
vim config/users.json


# ===== PHASE 2: Setup =====

# Create groups and sources (smart: skips incomplete/done)
npm run start -- setup --env dev

# Check status again
npm run start -- status --env dev

# Output:
# ┌──────────────┬──────────┬───────┬────────┐
# │ Group ID     │ Invited  │ Group │ Source │
# ├──────────────┼──────────┼───────┼────────┤
# │ sigmahq      │ ✅       │ ✅    │ ✅     │
# │ yara_100days │ ✅       │ ✅    │ ✅     │
# └──────────────┴──────────┴───────┴────────┘
```

### Advanced Usage

```bash
# Specific groups only
npm run start -- invite --env dev --groups sigmahq,yara_100days
npm run start -- setup --env dev --groups sigmahq

# Reset state (useful for testing)
npm run start -- reset --env dev --groups sigmahq --confirm

# Reset entire environment
npm run start -- reset --env dev --groups all --confirm

# List available groups
npm run start -- list-groups
```

### Web UI (Optional)

```bash
# Start web server
npm run server

# Open browser
open http://localhost:3000

# Features:
- Visual status dashboard
- Click buttons to invite/setup
- Real-time status updates
```

---

## 12. Deployment

### Production Checklist

```bash
# 1. Set up production database
mkdir -p data
chmod 700 data

# 2. Configure production environment
cat > config/.env.prod << EOF
ENVIRONMENT=prod
APP_URL_PROD=https://detections.ai
DETECTIONS_API_PROD=https://detections-backend.s2s.ai
INTEGRATIONS_API_PROD=https://integrations-management.s2s.ai
EOF

# 3. Build for production
npm run build

# 4. Run CLI
node dist/index.js invite --env prod
node dist/index.js setup --env prod

# 5. Or run web server
node dist/server.js
```

### Docker Deployment (Optional)

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# For CLI
CMD ["node", "dist/index.js"]

# For Web UI
# CMD ["node", "dist/server.js"]
```

---

## 📊 Summary

### What We Built

| Component | Purpose | Technology |
|-----------|---------|------------|
| **CLI** | Command-line automation | Commander.js |
| **Database** | State tracking | SQLite (better-sqlite3) |
| **MCP Client** | Browser automation | MCP Playwright |
| **API Clients** | External API calls | Axios |
| **Workflows** | Business logic | TypeScript classes |
| **Web UI** | Optional visual interface | React + Vite + Tailwind |

### Key Features

✅ **Smart**: Auto-detects what needs to be done  
✅ **Stateful**: SQLite tracks all operations  
✅ **Safe**: Idempotent, can re-run anytime  
✅ **Incremental**: Process as users verify  
✅ **Flexible**: CLI or Web UI  
✅ **Reliable**: Continues on failure  
✅ **Clear**: Detailed status and summaries  

### Files Overview

```
Required Files:
- src/database/db.ts          (300 lines)
- src/mcp/client.ts            (100 lines)
- src/api/*.ts                 (200 lines)
- src/workflows/*.ts           (400 lines)
- src/cli/commands.ts          (200 lines)
- config/users.json            (user data)
- config/groups.json           (group data)

Optional (Web UI):
- ui/src/App.tsx               (200 lines)
- src/server.ts                (100 lines)

Total: ~1,500 lines of code
```

---

## 🚀 Ready to Implement!

This plan provides everything needed to build a production-ready automation system with:

1. ✅ Smart state tracking (SQLite)
2. ✅ Two-phase workflow (invite → setup)
3. ✅ Auto-skip logic (already done/not ready)
4. ✅ MCP Playwright integration
5. ✅ CLI + Optional Web UI
6. ✅ Multi-environment support
7. ✅ Complete error handling
8. ✅ Incremental processing

**Implementation time:** 2-3 weeks  
**Maintenance:** Minimal - just update JSON files  
**Scalability:** Handles hundreds of groups  

**Let's build this!** 🎉

