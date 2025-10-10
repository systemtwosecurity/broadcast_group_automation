# Server Restart Guide

## When to Restart

You need to restart the servers when:
- ✅ New API routes are added
- ✅ Server code is modified
- ✅ Environment variables are changed
- ✅ Database schema is updated

## How to Restart

### Option 1: Restart Both (Recommended)

```bash
# Kill both servers
lsof -ti:4500,4501 | xargs -r kill -9

# Start both servers
npm run dev:all
```

### Option 2: Restart API Server Only

```bash
# Kill API server
lsof -ti:4501 | xargs -r kill -9

# Start API server
npm run dev:api
```

### Option 3: Restart Web UI Only

```bash
# Kill Web UI
lsof -ti:4500 | xargs -r kill -9

# Start Web UI
npm run dev:web
```

## Quick Commands

```bash
# Check if servers are running
lsof -ti:4500,4501

# View server logs
# (servers run in foreground when using npm run dev:all)

# Force kill all processes on ports 4500-4900
for port in {4500..4900}; do lsof -ti:$port | xargs -r kill -9 2>/dev/null; done
```

## After Restart

1. **Wait 3-5 seconds** for servers to fully start
2. **Refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Clear browser cache** if issues persist
4. **Check console logs** for any errors

## Common Issues

### 404 Errors on New Routes
**Cause**: Server not restarted after adding new routes  
**Fix**: Restart the API server

### Stale UI Data
**Cause**: Browser cached old bundle  
**Fix**: Hard refresh (Ctrl+Shift+R) or clear cache

### Port Already in Use
**Cause**: Previous server process still running  
**Fix**: Kill the process using the port

```bash
lsof -ti:4501 | xargs -r kill -9
```

## Development Workflow

1. Make code changes
2. Build: `npm run build` (backend) or `cd web && npm run build` (frontend)
3. Restart relevant server
4. Hard refresh browser
5. Test changes

## Production Deployment

For production, use:
```bash
# Build everything
npm run build
cd web && npm run build && cd ..

# Start in production mode (with PM2 or similar)
pm2 start dist/api/server.js --name broadcast-api
pm2 serve web/dist 4500 --name broadcast-web
```

---

**Pro Tip**: Use `tmux` or `screen` to run servers in separate panes for easier management.
