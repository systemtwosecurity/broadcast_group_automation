# MCP Playwright Architecture

## How It Works

This application uses **MCP (Model Context Protocol) Playwright** for browser automation. Unlike traditional Playwright usage, we don't install Playwright as a dependency. Instead:

```
┌─────────────────────────────────────────────────────────────┐
│                    Our Application                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  MCPClient (src/mcp/client.ts)                       │ │
│  │  - Creates StdioClientTransport                      │ │
│  │  - Spawns MCP Playwright server via npx             │ │
│  └───────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│                  (stdio communication)                      │
│                           ↓                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  External MCP Playwright Server                      │ │
│  │  (run via npx -y @modelcontextprotocol/              │ │
│  │         server-playwright)                           │ │
│  │                                                       │ │
│  │  - Manages Playwright browser                        │ │
│  │  - Executes navigation, clicks, fills                │ │
│  │  - Returns results via stdio                         │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Points

### 1. **No Local Playwright Installation**
- We don't need `playwright` or `@playwright/test` in our `package.json`
- The MCP server is downloaded and run on-demand via `npx`

### 2. **Process Communication**
```typescript
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-playwright'],
});
```

This spawns a **separate Node.js process** that:
- Downloads the MCP Playwright server (if not cached)
- Launches a Playwright browser
- Listens for commands via stdin
- Returns results via stdout

### 3. **Tool Calls**
We communicate with the server using tool calls:

```typescript
// Navigate
await client.callTool({
  name: 'playwright_navigate',
  arguments: { url: 'https://example.com/login' }
});

// Fill form
await client.callTool({
  name: 'playwright_fill',
  arguments: { 
    selector: 'input[name="email"]',
    value: 'user@example.com'
  }
});

// Click button
await client.callTool({
  name: 'playwright_click',
  arguments: { selector: 'button[type="submit"]' }
});

// Get token from storage
const result = await client.callTool({
  name: 'playwright_evaluate',
  arguments: { 
    script: 'localStorage.getItem("access_token")' 
  }
});
```

## Benefits

✅ **No Browser Management** - MCP server handles browser lifecycle  
✅ **No Playwright Installation** - Downloaded on-demand  
✅ **Clean Separation** - Browser automation is external  
✅ **Easy Testing** - Can mock MCP client without real browser  
✅ **Language Agnostic** - MCP is protocol-based, not JS-specific  

## First Run

On first run, `npx` will:
1. Download `@modelcontextprotocol/server-playwright` package
2. The package will download Playwright browser (Chromium)
3. Subsequent runs use cached versions

```bash
# Test if MCP Playwright works
npm run setup:playwright

# Expected output:
# MCP Playwright Server v1.x.x
```

## Docker Considerations

In Docker, we need to:
1. Pre-install the MCP server
2. Install Chromium dependencies
3. Set Playwright environment variables

See `Dockerfile` for the complete setup.

## Troubleshooting

### Issue: "npx command not found"
**Solution:** Ensure Node.js and npm are installed (v20+)

### Issue: "Browser download failed"
**Solution:** Check internet connection, or pre-download in Docker:
```dockerfile
RUN npx -y @modelcontextprotocol/server-playwright install
```

### Issue: "Chromium not found"
**Solution:** In Docker/Linux, install browser dependencies:
```bash
apt-get install -y chromium chromium-driver
```

### Issue: "Connection timeout"
**Solution:** Increase timeout in MCP client:
```typescript
await client.callTool({
  name: 'playwright_wait',
  arguments: { timeout: 10000 } // 10 seconds
});
```

## Available Tools

The MCP Playwright server provides these tools:

| Tool | Purpose |
|------|---------|
| `playwright_navigate` | Navigate to URL |
| `playwright_click` | Click element |
| `playwright_fill` | Fill input field |
| `playwright_evaluate` | Execute JavaScript |
| `playwright_screenshot` | Take screenshot |
| `playwright_wait` | Wait for time/condition |

For complete API, see: https://github.com/modelcontextprotocol/servers/tree/main/src/playwright

## Security Note

The MCP server runs in a **sandboxed process** with limited capabilities. It:
- Cannot access your filesystem directly
- Cannot execute arbitrary system commands
- Only communicates via stdio protocol
- Browser state is isolated per session

---

## Summary

**Traditional Playwright:**
```
App → import playwright → launch browser → automate
```

**MCP Playwright:**
```
App → MCP Client → (stdio) → MCP Server → Playwright → Browser
```

This architecture provides **better isolation and flexibility** at the cost of slightly more setup complexity.

