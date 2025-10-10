# Auth0 Password Grant Setup

## 🎯 Why Do We Need This?

Your application stores authentication tokens in **httpOnly cookies** for security. This is excellent for security but means we cannot extract the bearer token from the browser for automation purposes.

The solution is to enable **Password Grant Type** in Auth0, which allows us to get tokens directly using username/password without browser automation.

## 📋 Setup Steps

### 1. Log into Auth0 Dashboard
Go to: https://manage.auth0.com/

### 2. Navigate to Your Application
- Go to **Applications** → **Applications**
- Find your application (Client ID: from your `.env` file)
- Click on it

### 3. Enable Password Grant
- Scroll down to **Advanced Settings**
- Click on the **Grant Types** tab
- Check the box for **"Password"** grant type
- Click **Save Changes** at the bottom

### 4. Verify API Audience (if needed)
- Go to **Applications** → **APIs**
- Find your API (e.g., `https://api.detections.ai`)
- Make sure it's enabled for your application

## ✅ What This Enables

Once Password Grant is enabled, the automation can:
1. ✅ Skip browser automation entirely (faster!)
2. ✅ Get tokens directly from Auth0 using username + password
3. ✅ Work in headless/CI environments
4. ✅ Be more reliable (no browser dependencies)

## 🔐 Security Notes

- Password Grant is safe when used in **trusted** automation scripts
- Your passwords are still in `.env` files (not checked into Git)
- Tokens are short-lived (expire in ~1 hour typically)
- This is a standard OAuth 2.0 flow supported by Auth0

## 🚀 After Setup

Once enabled, you can run:
```bash
npm run dev -- invite --env dev
```

The script will automatically use the Password Grant flow to get tokens without launching a browser!

## 🆘 Troubleshooting

If you see: `Grant type 'password' not allowed for the client`
→ Make sure you checked **Password** in Grant Types and clicked **Save Changes**

If you see: `access_denied`
→ Make sure your API audience is correct in the code (`https://api.detections.ai`)

