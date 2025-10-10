# MCP Playwright Architecture

## How It Works

This application uses **Microsoft Playwright MCP** (Model Context Protocol) for browser automation. Unlike traditional Playwright usage, we don't install Playwright as a dependency. Instead:

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
│  │  (run via npx -y @playwright/mcp)                   │ │
│  │                                                       │ │
│  │  - Manages Playwright browser                        │ │
│  │  - Executes navigation, clicks, fills                │ │
│  │  - Returns results via stdio                         │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Official Resources

- **GitHub**: https://github.com/microsoft/playwright-mcp
- **NPM**: https://www.npmjs.com/package/@playwright/mcp
- **Stars**: 21.6k+ ⭐

## Key Points

### 1. **No Local Playwright Installation**
- We don't need `playwright` or `@playwright/test` in our `package.json`
- The MCP server is downloaded and run on-demand via `npx`

### 2. **Process Communication**
```typescript
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@playwright/mcp'],
});
```

This spawns a **separate Node.js process** that:
- Downloads the MCP Playwright server (if not cached)
- Launches a Playwright browser
- Listens for commands via stdin
- Returns results via stdout

### 3. **Tool Calls**
We communicate with the server using tool calls with `browser_` prefix:

```typescript
// Navigate
await client.callTool({
  name: 'browser_navigate',
  arguments: { url: 'https://example.com/login' }
});

// Get page snapshot (accessibility tree)
await client.callTool({
  name: 'browser_snapshot',
  arguments: {}
});

// Type text
await client.callTool({
  name: 'browser_type',
  arguments: { 
    element: 'email input field',
    ref: 'input[name="email"]',
    text: 'user@example.com'
  }
});

// Click button
await client.callTool({
  name: 'browser_click',
  arguments: { 
    element: 'submit button',
    ref: 'button[type="submit"]'
  }
});

// Wait
await client.callTool({
  name: 'browser_wait_for',
  arguments: { time: 5 }
});
```

## Benefits

✅ **No Browser Management** - MCP server handles browser lifecycle  
✅ **No Playwright Installation** - Downloaded on-demand  
✅ **Clean Separation** - Browser automation is external  
✅ **Easy Testing** - Can mock MCP client without real browser  
✅ **Language Agnostic** - MCP is protocol-based, not JS-specific  
✅ **Microsoft Official** - Maintained by the Playwright team

## First Run

On first run, `npx` will:
1. Download `@playwright/mcp` package (~30MB)
2. The package will download Playwright browser (Chromium ~120MB)
3. Subsequent runs use cached versions

```bash
# Test if MCP Playwright works
npx -y @playwright/mcp

# Or via npm script
npm run setup:playwright
```

## Docker Considerations

In Docker, we need to:
1. Pre-install Chromium and dependencies
2. Set Playwright environment variables
3. Pre-cache the MCP server

See `Dockerfile` for the complete setup.

## Troubleshooting

### Issue: "npx command not found"
**Solution:** Ensure Node.js and npm are installed (v20+)

### Issue: "Browser download failed"
**Solution:** Check internet connection, or pre-download in Docker:
```dockerfile
RUN npx -y @playwright/mcp install
```

### Issue: "Chromium not found"
**Solution:** In Docker/Linux, install browser dependencies:
```dockerfile
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates
```

### Issue: "Connection timeout"
**Solution:** Increase wait time in MCP client:
```typescript
await client.callTool({
  name: 'browser_wait_for',
  arguments: { time: 10 } // 10 seconds
});
```

## Available Tools

The Microsoft Playwright MCP server provides these tools:

### Core Navigation & Interaction
| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to URL |
| `browser_navigate_back` | Go back to previous page |
| `browser_click` | Click element |
| `browser_type` | Type text into element |
| `browser_hover` | Hover over element |
| `browser_press_key` | Press keyboard key |
| `browser_select_option` | Select dropdown option |
| `browser_fill_form` | Fill multiple form fields |

### Information Gathering
| Tool | Purpose |
|------|---------|
| `browser_snapshot` | Capture accessibility tree (better than screenshot) |
| `browser_take_screenshot` | Take screenshot |
| `browser_network_requests` | List network requests |

### Utilities
| Tool | Purpose |
|------|---------|
| `browser_wait_for` | Wait for time/text to appear/disappear |
| `browser_resize` | Resize browser window |
| `browser_handle_dialog` | Handle alerts/confirms/prompts |
| `browser_attach_file` | Upload files |

### Tab Management
| Tool | Purpose |
|------|---------|
| `browser_tabs` | List, create, close, or select tabs |

### Advanced (Opt-in)
| Tool | Purpose | Flag |
|------|---------|------|
| `browser_mouse_click_xy` | Click at coordinates | `--caps=vision` |
| `browser_pdf_save` | Save page as PDF | `--caps=pdf` |
| `browser_start_tracing` | Start trace recording | `--caps=tracing` |

For complete API, see: https://github.com/microsoft/playwright-mcp

## Security Note

The MCP server runs in a **sandboxed process** with limited capabilities. It:
- Cannot access your filesystem directly (except for file uploads)
- Cannot execute arbitrary system commands
- Only communicates via stdio protocol
- Browser state is isolated per session
- User approval required for sensitive actions

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
