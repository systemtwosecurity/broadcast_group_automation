# Login Automation Status

## ✅ FINAL SOLUTION

**Approach: Work with Persistent Session + Token Refresh**

### Why No Logout?

After investigating all three backend services:
- **detections-backend** (`detections-backend.dev.s2s.ai`) - No OAuth/logout endpoints
- **auth-service** (`auth.dev.s2s.ai`) - Only FGA authorization, no authentication
- **frontend** (`detections.dev.s2s.ai`) - Only proxies to backend

**Finding**: There is **no server-side logout API** deployed. Session management is handled entirely by Auth0.

### Current Implementation

1. **Navigate to /login** → May auto-redirect to app homepage if already logged in
2. **Detect Current State**:
   - On Auth0 login page → Fill form and submit
   - On app homepage → Click login button OR extract existing tokens
3. **Extract Refresh Token** → Search `localStorage`/`sessionStorage`
4. **Exchange for Access Token** → Call Auth0 `/oauth/token` with client credentials
5. **Make API Calls** → Use fresh `access_token`

### Configuration Required

Add to `.env` (see [AUTH0_SETUP.md](./AUTH0_SETUP.md) for details):
```bash
AUTH0_DOMAIN=https://systemtwosecurity.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
```

## ✅ What's Working

1. **Browser Automation**: MCP Playwright integration working perfectly
2. **Form Detection**: Correctly identifies Auth0 login page
3. **Form Filling**: Successfully fills email and password fields using DOM manipulation
4. **Form Submission**: Clicks submit button and waits for redirect
5. **Success Validation**: Verifies redirect to app homepage
6. **Password Security**: Reads from environment variables, supports special characters like `#`
7. **Token Search**: Searches localStorage, sessionStorage for access_token and refresh_token

## ❌ Current Challenges

### 1. **Persistent Auth0 SSO Session**
- **Problem**: Auth0 SSO session persists even after clearing local cookies/storage
- **Impact**: Subsequent login attempts skip the form (auto-login)
- **Root Cause**: Auth0 maintains session at their domain level
- **Workaround**: Need to either:
  - Use Playwright's incognito context (requires MCP server changes)
  - Navigate to Auth0's v2/logout endpoint with proper parameters
  - Manually clear browser data once before first run

### 2. **Cross-Origin Token Access**
- **Problem**: Auth cookies on `detections.dev.s2s.ai` don't transfer to `detections-backend.dev.s2s.ai`
- **Impact**: Can't make direct API calls to backend from authenticated browser session
- **Status**: Still investigating token storage location

## 🔍 Token Investigation Results

After successful login, checked storage for tokens:
- **localStorage**: Contains app state (i18next, sidebar settings, PostHog analytics)
- **sessionStorage**: PostHog session data
- **Cookies**: Analytics cookies, no visible JWT tokens
- **Likely Storage**: Tokens are probably in httpOnly cookies (not accessible to JavaScript)

## 🎯 Next Steps

### Option 1: Incognito Context (Recommended)
- Modify MCP client to request isolated browser context per login
- Each authentication gets fresh session
- Clean separation between different user logins

### Option 2: Auth0 v2/logout
- Navigate to proper Auth0 logout URL before each login
- Format: `https://{auth0-domain}/v2/logout?returnTo={app-url}&client_id={client-id}`
- Need to extract Auth0 domain and client ID from login flow

### Option 3: Token Extraction from Network
- Intercept OAuth callback to capture tokens from URL fragment
- Listen for network requests containing `access_token` and `refresh_token`
- Parse from redirect URL: `#access_token=...&refresh_token=...`

### Option 4: Accept Existing Session
- If already logged in, just proceed
- Use existing browser session for API calls
- Simpler but less reliable for automation

## 📝 Test Results

```bash
# Test 1: Fresh session (no existing auth)
✅ Form filled correctly
✅ Login successful
✅ Redirected to app
❌ No tokens found in accessible storage

# Test 2: Existing session
⚠️  Auto-redirected to homepage (already logged in)
⚠️  Form never displayed
✅ User is authenticated
❌ Can't force fresh login

# Test 3: API call from browser context
❌ CORS error: "Failed to fetch"
❌ Cookies don't transfer cross-origin
```

## 🛠️ Code Status

- ✅ `src/mcp/client.ts`: Implements login, form filling, token search
- ✅ `src/workflows/invitation.ts`: Uses authenticated session for API calls
- ✅ `src/workflows/setup.ts`: Uses authenticated session for API calls
- ⚠️  Currently blocked on: Cross-origin auth and session persistence

## 📚 References

- [Auth0 Logout Documentation](https://auth0.com/docs/logout)
- [Playwright Context API](https://playwright.dev/docs/api/class-browsercontext)
- [CORS and Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#credentials)

