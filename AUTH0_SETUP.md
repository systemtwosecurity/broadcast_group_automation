# Auth0 Configuration Guide

This application uses Auth0 for authentication and requires three configuration values to exchange refresh tokens for access tokens.

## Required Environment Variables

Add these to your `.env` file:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=https://systemtwosecurity.us.auth0.com
AUTH0_CLIENT_ID=your_client_id_here
AUTH0_CLIENT_SECRET=your_client_secret_here
```

## How to Get These Values

### 1. AUTH0_DOMAIN

This is your Auth0 tenant domain. It should be the full URL including `https://`.

**Example:** `https://systemtwosecurity.us.auth0.com`

You can find this in:
- Auth0 Dashboard → Settings → Tenant Settings → Domain

### 2. AUTH0_CLIENT_ID

This is the Client ID of your Auth0 application.

**Where to find it:**
1. Go to Auth0 Dashboard
2. Navigate to **Applications** → **Applications**
3. Select your application (e.g., "Detections Frontend")
4. Copy the **Client ID**

**Example:** `j3Hkwy368kyi6Jh1NyRXkERsVZyyBOQZ`

### 3. AUTH0_CLIENT_SECRET

This is the Client Secret of your Auth0 application.

**Where to find it:**
1. Same location as Client ID
2. Auth0 Dashboard → Applications → Applications → Your App
3. Copy the **Client Secret** (you may need to click "Show" first)

⚠️ **Security Note:** This is a sensitive credential. Never commit it to version control.

## How It Works

The automation flow:

1. **Browser Login** → User logs in via Auth0 in a headless browser
2. **Extract Refresh Token** → The app searches `localStorage` and `sessionStorage` for the `refresh_token`
3. **Exchange for Access Token** → Calls Auth0's `/oauth/token` endpoint:
   ```javascript
   POST https://systemtwosecurity.us.auth0.com/oauth/token
   {
     "grant_type": "refresh_token",
     "client_id": "your_client_id",
     "client_secret": "your_client_secret",
     "refresh_token": "the_refresh_token_from_browser"
   }
   ```
4. **Use Access Token** → Make API calls to backend with `Authorization: Bearer <access_token>`

## Troubleshooting

### Error: "AUTH0_DOMAIN environment variable is required"
- Make sure you've copied `.env.example` to `.env`
- Add the `AUTH0_DOMAIN` value to your `.env` file
- The value should include `https://` (e.g., `https://your-tenant.auth0.com`)

### Error: "Failed to refresh access token: 401"
- Double-check your `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`
- Ensure the client secret is for the correct application
- Verify the application has the necessary grant types enabled (refresh_token)

### Error: "No access_token or refresh_token found in storage"
- The application stores tokens in browser storage after login
- If using cookies instead of localStorage, you may need to intercept the OAuth callback
- Check if your application uses a different token storage mechanism

## Auth0 Application Settings

Ensure your Auth0 application has these grant types enabled:

1. **Authorization Code**
2. **Refresh Token**

To verify:
1. Auth0 Dashboard → Applications → Your App
2. Go to **Settings** tab
3. Scroll to **Advanced Settings** → **Grant Types**
4. Ensure "Refresh Token" is checked

## Security Best Practices

✅ **DO:**
- Store `AUTH0_CLIENT_SECRET` in environment variables only
- Use `.gitignore` to exclude `.env` files
- Rotate client secrets periodically
- Use different Auth0 applications for dev/qa/prod

❌ **DON'T:**
- Commit `.env` files to Git
- Share client secrets in Slack/email
- Use production credentials in development
- Hardcode secrets in source code

## References

- [Auth0 Token Exchange Documentation](https://auth0.com/docs/secure/tokens/refresh-tokens/use-refresh-tokens)
- [Auth0 Refresh Token Grant Type](https://auth0.com/docs/get-started/authentication-and-authorization-flow/refresh-token-grant)

