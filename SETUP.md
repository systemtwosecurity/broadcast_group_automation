# Setup Guide

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Chromium for Playwright

The MCP Playwright server requires Chromium to automate browser interactions. Install it once:

```bash
npx playwright install chromium
```

This will download Chromium (~280MB) to `~/.cache/ms-playwright/chromium-*`. This is a one-time setup and the browser will be cached for future use.

### 3. Configure Environment Variables

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `ADMIN_EMAIL` - Your admin email
- `ADMIN_PASSWORD` - Your admin password
- `USER_PASSWORD_<USER_ID>` - Individual user passwords (after verification)

**Important:** User passwords should initially be set to `REPLACE_AFTER_VERIFICATION` until users complete email verification.

### 4. Configure Users and Groups

The configuration files are safe to commit (no secrets):

- **`config/users.json`** - User emails only (no passwords)
- **`config/groups.json`** - Group and source configurations

### 5. Build the Project

```bash
npm run build
```

### 6. Verify Setup

Test that Chromium is working:

```bash
npx tsx test-token-retrieval.ts
```

Expected output:
```
✅ Connected to MCP Playwright
✅ Page loaded
✅ Token set
✅ Token retrieved successfully!
🎉 Token retrieval mechanism works!
```

## Docker Setup

### Build Docker Image

```bash
docker build -t broadcast-automation .
```

The Dockerfile will automatically:
1. Install system dependencies for Chromium
2. Install Playwright's Chromium browser (~280MB)
3. Configure Chromium to run in Docker (no-sandbox mode)

### Run in Docker

```bash
docker run --rm \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/data:/app/data \
  -e ADMIN_EMAIL="admin@example.com" \
  -e ADMIN_PASSWORD="your-password" \
  -e USER_PASSWORD_SIGMAHQ="user-password" \
  broadcast-automation invite --env dev
```

## Troubleshooting

### Chromium Not Found

**Error:** `Chromium distribution not found`

**Solution:** Install Chromium for Playwright:
```bash
npx playwright install chromium
```

### Permission Issues in Docker

**Error:** `Permission denied` or `Cannot write to /app/data`

**Solution:** Ensure mounted volumes have correct permissions:
```bash
chmod -R 755 ./data ./config
```

### Headless Mode Issues

If you need to debug in non-headless mode (local only), modify `src/mcp/client.ts`:

```typescript
args: [
  '-y', 
  '@playwright/mcp',
  '--browser', 'chromium',
  // Remove '--headless' to see the browser
],
```

### Out of Memory in Docker

If browser automation fails with OOM errors, increase Docker memory:

```bash
docker run --memory=2g --rm broadcast-automation ...
```

## Environment-Specific URLs

The application automatically uses the correct URLs based on the `--env` flag:

| Environment | Detections Backend | Integrations Management | App URL |
|-------------|-------------------|------------------------|---------|
| `dev` | `detections-backend.dev.s2s.ai` | `integrations-management.dev.s2s.ai` | `detections.dev.s2s.ai` |
| `qa` | `detections-backend.qa.s2s.ai` | `integrations-management.qa.s2s.ai` | `detections.qa.s2s.ai` |
| `prod` | `detections-backend.s2s.ai` | `integrations-management.s2s.ai` | `detections.ai` |

## Testing

### Run Unit Tests

```bash
npm test
```

### Run MCP Integration Test

```bash
npx tsx test-mcp.ts
```

### Run Token Retrieval Test

```bash
npx tsx test-token-retrieval.ts
```

## Performance Notes

- **First Run:** Chromium download takes ~30 seconds (one-time)
- **Subsequent Runs:** Browser launch takes ~2-3 seconds
- **Login + Token Retrieval:** ~5-10 seconds per user
- **Docker Image Size:** ~800MB (includes Chromium and Node.js)

## Security Notes

- **Never commit `.env` files** - They contain sensitive credentials
- **`.gitignore` is configured** to exclude all `.env*` files
- **`config/users.json` is safe** - It only contains emails, no passwords
- **Passwords are in environment variables** - Never in code or config files

## Next Steps

1. ✅ Setup complete? Run a test invitation:
   ```bash
   npm run dev -- invite --env dev --groups sigmahq
   ```

2. ✅ Users verified? Update passwords in `.env` and run setup:
   ```bash
   npm run dev -- setup --env dev --groups sigmahq
   ```

3. ✅ Check status:
   ```bash
   npm run dev -- status --env dev
   ```

For more details, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [SECURITY.md](./SECURITY.md) - Security best practices
- [MCP_PLAYWRIGHT.md](./MCP_PLAYWRIGHT.md) - How MCP Playwright works

