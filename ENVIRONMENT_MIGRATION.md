# Environment-Specific Token Migration Guide

## Overview

Tokens are now **environment-specific**. This means you can have different tokens for DEV, QA, and PROD environments.

When you switch environments in the UI, you'll see different token sets.

---

## 🔄 Token Format Changes

### **Old Format** (Pre-v2.2)
Tokens were shared across all environments:
```bash
ADMIN_TOKEN=eyJhbGci...
USER_TOKEN_SIGMAHQ=eyJhbGci...
USER_TOKEN_YARA_100DAYS=eyJhbGci...
```

### **New Format** (v2.2+)
Tokens are per-environment:
```bash
# Dev environment
ADMIN_TOKEN_DEV=eyJhbGci...
USER_TOKEN_SIGMAHQ_DEV=eyJhbGci...
USER_TOKEN_YARA_100DAYS_DEV=eyJhbGci...

# QA environment
ADMIN_TOKEN_QA=eyJhbGci...
USER_TOKEN_SIGMAHQ_QA=eyJhbGci...
USER_TOKEN_YARA_100DAYS_QA=eyJhbGci...

# Prod environment
ADMIN_TOKEN_PROD=eyJhbGci...
USER_TOKEN_SIGMAHQ_PROD=eyJhbGci...
USER_TOKEN_YARA_100DAYS_PROD=eyJhbGci...
```

---

## 📋 Migration Steps

### Option 1: Manual Migration (Recommended)

1. **Backup your current `.env` file:**
   ```bash
   cp .env .env.backup
   ```

2. **For DEV environment:**
   - Rename `ADMIN_TOKEN` → `ADMIN_TOKEN_DEV`
   - Rename `USER_TOKEN_<ID>` → `USER_TOKEN_<ID>_DEV`

3. **For QA/PROD environments:**
   - Get fresh tokens for each environment
   - Add them with `_QA` or `_PROD` suffix

4. **Example migration:**
   ```bash
   # Before
   ADMIN_TOKEN=abc123
   USER_TOKEN_SIGMAHQ=def456
   
   # After (if all were DEV tokens)
   ADMIN_TOKEN_DEV=abc123
   USER_TOKEN_SIGMAHQ_DEV=def456
   
   # Add QA tokens when ready
   ADMIN_TOKEN_QA=xyz789
   USER_TOKEN_SIGMAHQ_QA=ghi012
   ```

### Option 2: Use the UI (Easiest)

1. **For DEV:**
   - Select DEV environment in UI
   - Go to Tokens tab
   - Add your DEV tokens
   - UI automatically saves with `_DEV` suffix

2. **For QA:**
   - Switch to QA environment
   - Go to Tokens tab
   - Add your QA tokens
   - UI automatically saves with `_QA` suffix

3. **For PROD:**
   - Switch to PROD environment
   - Go to Tokens tab
   - Add your PROD tokens
   - UI automatically saves with `_PROD` suffix

---

## 🧪 Quick Migration Script

```bash
#!/bin/bash
# Add this to your .env file manually or run this script

echo "# Environment-specific tokens added $(date)" >> .env
echo "" >> .env

# If you want to use your current tokens for DEV only:
sed -i.bak 's/^ADMIN_TOKEN=/ADMIN_TOKEN_DEV=/' .env
sed -i 's/^USER_TOKEN_\([A-Z0-9_]*\)=/USER_TOKEN_\1_DEV=/' .env

echo "Migration complete! Old .env saved as .env.bak"
```

---

## ✅ Verification

After migration, verify your tokens are working:

1. **Start the application:**
   ```bash
   npm run dev:all
   ```

2. **Check DEV environment:**
   - Select DEV in UI
   - Go to Tokens tab
   - You should see your tokens

3. **Check QA environment:**
   - Select QA in UI
   - Go to Tokens tab
   - Add QA tokens if needed

4. **Check PROD environment:**
   - Select PROD in UI
   - Go to Tokens tab
   - Add PROD tokens if needed

---

## 📧 Email Changes

Email aliases are now environment-specific:

| Environment | Email Format |
|-------------|--------------|
| **DEV** | `groups+sigmahq_dev@detections.ai` |
| **QA** | `groups+sigmahq_qa@detections.ai` |
| **PROD** | `groups+sigmahq_prod@detections.ai` |

When you switch environments in the UI:
- ✅ Token list changes
- ✅ Email addresses update automatically
- ✅ Group configs show correct environment

---

## 🔧 Troubleshooting

### Issue: No tokens showing after migration

**Cause:** Tokens might still have old format in `.env`

**Solution:**
1. Open `.env` file
2. Verify tokens have `_DEV`, `_QA`, or `_PROD` suffix
3. Restart API server: `npm run dev:api`
4. Hard refresh browser: `Ctrl+Shift+R`

### Issue: Tokens work in DEV but not QA/PROD

**Cause:** You only have DEV tokens

**Solution:**
1. Get fresh tokens for QA/PROD from Chrome DevTools
2. Add them via UI or manually to `.env`
3. Each environment needs its own tokens

### Issue: Admin token fallback

**Note:** If `ADMIN_TOKEN_<ENV>` is not found, the system falls back to `ADMIN_TOKEN`.

This allows gradual migration:
```bash
# Fallback admin token (works for all environments)
ADMIN_TOKEN=your_admin_token

# Or per-environment (preferred)
ADMIN_TOKEN_DEV=your_dev_admin_token
ADMIN_TOKEN_QA=your_qa_admin_token
ADMIN_TOKEN_PROD=your_prod_admin_token
```

---

## 🎯 Benefits

### Before (Shared Tokens):
- ❌ One token set for all environments
- ❌ Risky: QA tokens might work in PROD
- ❌ Hard to manage multiple environments

### After (Environment-Specific):
- ✅ Isolated token sets per environment
- ✅ Safe: Can't accidentally use wrong tokens
- ✅ Easy multi-environment management
- ✅ Clear visual feedback in UI

---

## 💡 Best Practices

1. **Use UI for token management** (easiest way)
2. **Keep tokens environment-specific** (don't reuse across environments)
3. **Rotate tokens regularly** (especially after moving between environments)
4. **Test in DEV first** before adding QA/PROD tokens
5. **Use SKIP for tokens you don't have yet**

---

## 📞 Support

If you encounter issues:
1. Check `SERVER_RESTART.md` for restart procedures
2. Verify `.env` file format
3. Check browser console for errors
4. Restart API server: `lsof -ti:4501 | xargs kill -9 && npm run dev:api`

---

**Migration complete?** Switch between environments in the UI and verify tokens load correctly for each! 🎉

