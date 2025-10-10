# Security Guide

## ✅ Secure Credential Management

This project uses **environment variables** for all sensitive credentials. **No passwords are stored in Git**.

### Configuration Files

| File | Contains | Safe for Git? |
|------|----------|---------------|
| `config/users.json` | User emails and IDs only | ✅ **YES** - No secrets |
| `config/groups.json` | Group configurations | ✅ **YES** - No secrets |
| `.env` | **Passwords and credentials** | ❌ **NO** - Gitignored |
| `.env.example` | Template with placeholders | ✅ **YES** - No real secrets |

### Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials:**
   ```bash
   # Admin Credentials
   ADMIN_EMAIL=your-admin@company.com
   ADMIN_PASSWORD=your_secure_password_here

   # User Passwords (after verification)
   USER_PASSWORD_SIGMAHQ=user_password_1
   USER_PASSWORD_YARA_100DAYS=user_password_2
   ```

3. **Never commit `.env` to Git** - it's already in `.gitignore`

### How It Works

```
┌─────────────────────┐
│   .env file         │  ← Your secrets (gitignored)
│  (not in Git)       │
└─────────────────────┘
          ↓
┌─────────────────────┐
│   Config.ts         │  ← Reads environment variables
│  (src/config/)      │
└─────────────────────┘
          ↓
┌─────────────────────┐
│   Application       │  ← Uses credentials securely
│   (workflows, CLI)  │
└─────────────────────┘
```

### Best Practices

✅ **DO:**
- Store credentials in `.env` file
- Use different `.env` files per environment (`.env.dev`, `.env.prod`)
- Keep `.env` files local to your machine
- Use strong passwords

❌ **DON'T:**
- Commit `.env` files to Git
- Share `.env` files via email or Slack
- Store passwords in JSON files
- Hardcode credentials in source code

### Multiple Environments

Create separate `.env` files for each environment:

```bash
.env.dev   # Development credentials
.env.qa    # QA credentials
.env.prod  # Production credentials
```

Load the appropriate file:
```bash
# Use development environment
cp .env.dev .env
npm run dev -- invite --env dev

# Use production environment
cp .env.prod .env
npm run dev -- invite --env prod
```

### CI/CD Integration

For automated deployments, use your CI/CD platform's secret management:

- **GitHub Actions**: Use encrypted secrets
- **GitLab CI**: Use CI/CD variables
- **Jenkins**: Use credentials plugin
- **Docker**: Use secrets or env vars at runtime

```bash
# Example: Docker with environment variables
docker run -e ADMIN_PASSWORD=$ADMIN_PASSWORD broadcast-automation
```

### Rotation & Revocation

If credentials are compromised:

1. **Immediately change passwords** in the application
2. **Update `.env` files** with new credentials
3. **Revoke old tokens** if applicable
4. **Audit logs** to check for unauthorized access

### Additional Security

Consider these enhancements:

- Use a **password manager** (1Password, LastPass) to generate and store passwords
- Enable **2FA** on admin accounts
- Use **short-lived tokens** where possible
- Implement **audit logging** for all operations
- Regularly **rotate credentials** (every 90 days)

---

## 🔒 Summary

**Credentials in `.env` → Application via `Config.ts` → Never in Git**

This approach follows industry best practices and keeps your secrets secure!

