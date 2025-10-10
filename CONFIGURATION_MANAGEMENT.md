# Configuration Management Guide

This guide covers how to use the enhanced UI for managing tokens, groups, and sources dynamically.

## 🎯 Overview

The new configuration management interface allows you to:
- **Manage bearer tokens** directly in the UI (no more editing `.env` manually)
- **Create and edit groups** on the fly
- **Configure sources** for GitHub integrations
- **Auto-generate email aliases** based on environment and group ID
- **Switch between light and dark modes** for optimal viewing

## 🌓 Dark Mode Best Practices

The UI implements Tailwind CSS dark mode best practices:

### How It Works
- **Class-based dark mode**: Toggled via a button in the header
- **Persistent preference**: Uses `localStorage` to remember your choice
- **System preference detection**: Defaults to system theme on first load
- **Smooth transitions**: All color changes have smooth transitions
- **Optimized colors**: Custom dark mode color palette for better contrast and readability

### Color Scheme
```
Light Mode:
- Background: Gradient from gray-50 to blue-50
- Surface: White with gray borders
- Text: Gray-900 for primary, Gray-700 for secondary

Dark Mode:
- Background: Gradient from gray-900 to blue-900
- Surface: Semi-transparent white overlays
- Text: White for primary, White/70 for secondary
- Borders: White/20 for subtle separation
```

### Accessibility
- ✅ WCAG AA contrast ratios maintained in both modes
- ✅ Focus states clearly visible in both modes
- ✅ Icon clarity optimized for each mode

## 🔑 Token Management

### Viewing Tokens
1. Navigate to the **Tokens** tab
2. View all configured tokens (admin + user tokens)
3. Toggle visibility with the eye icon (hidden by default)

### Adding a New Token
1. Go to **Tokens** tab
2. In the "Add New Token" section:
   - **Group ID**: Enter a unique identifier (e.g., `sigmahq`, `yara_100days`)
   - **Email**: Enter the user's email (or leave auto-generated)
   - **Bearer Token**: Paste the token from Chrome DevTools
3. Click the **+** button

### Editing a Token
- Simply update the token value inline
- Click **Save** to persist changes

### Deleting a Token
- Click the trash icon next to the token
- Confirm deletion

### Behind the Scenes
- Tokens are saved to `.env` as `USER_TOKEN_<ID>` (e.g., `USER_TOKEN_SIGMAHQ`)
- Admin token is saved as `ADMIN_TOKEN`
- The server automatically reloads environment variables

## 🏗️ Group Management

### Viewing Groups
1. Navigate to the **Groups** tab
2. View all configured groups with their:
   - Display name
   - Group ID
   - Auto-generated email
   - Source repository and branch

### Adding a New Group
1. Go to **Groups** tab
2. Click **Add New Group**
3. Fill in the form:
   - **Group ID**: Unique identifier (lowercase, no spaces)
   - **Display Name**: Full name (e.g., "SigmaHQ Private")
   - **Group Settings**: Name, description, type (private/public)
   - **Source Configuration**: GitHub repo, branch, root path
4. Click **Save Group**

### Email Auto-Generation
The system automatically generates emails in the format:
```
groups+<group_id>_<environment>@detections.ai
```

**Examples:**
- `sigmahq` in `dev` → `groups+sigmahq_dev@detections.ai`
- `yara_100days` in `prod` → `groups+yara_100days_prod@detections.ai`

This ensures:
- ✅ Unique emails per environment
- ✅ Easy identification in email systems
- ✅ Automatic user creation on invitation

### Editing a Group
1. Click the **edit icon** (pencil) next to a group
2. Modify any fields
3. Click **Save Group**

### Deleting a Group
1. Click the **trash icon** next to a group
2. Confirm deletion
3. ⚠️ **Note**: This only removes the configuration, not API resources

### Behind the Scenes
- Groups are saved to `config/groups.json`
- User entries are auto-created in `config/users.json`
- The server reloads configurations automatically

## 📂 Source Configuration

Sources are configured as part of group creation. Each source has:

### Required Fields
- **Integration Type**: `github` (default)
- **Name**: Display name for the source
- **Description**: Brief description
- **Repository**: Format `owner/repo` (e.g., `SigmaHQ/sigma`)
- **Branch**: Target branch (e.g., `main`, `master`, `develop`)

### Optional Fields
- **Root Path**: Subdirectory to monitor (e.g., `/rules`, `/detections`)
- **Pipeline ID**: Custom pipeline identifier
- **Pipeline Config**: Advanced processing options

### Example Configuration
```json
{
  "source": {
    "integration_type": "github",
    "name": "SigmaHQ Public Rules",
    "description": "Community sigma rules from GitHub",
    "connection_config": {
      "repository": "SigmaHQ/sigma",
      "branch": "master",
      "root_path": "rules"
    },
    "processing_config": {
      "auto_sync": true,
      "group_id": "<group_id>"
    },
    "credentials": {
      "public": true
    }
  }
}
```

### Pipeline Configuration (Advanced)
For custom pipelines, you can configure:
- **Include Patterns**: File patterns to include (e.g., `**/*.yaml`, `**/*.yar`)
- **Exclude Patterns**: File patterns to exclude (e.g., `**/test/**`)
- **Validation**: Enable/disable rule validation
- **Static Parsing**: Parse rule syntax
- **AI Enrichment**: Add AI-generated metadata
- **Job Status Tracking**: Monitor sync jobs

## 🎨 UI Navigation

### Tabs
1. **Dashboard**: Main operations (invite, setup, status, cleanup)
2. **Tokens**: Manage bearer tokens
3. **Groups**: Create and edit group configurations

### Environment Switcher
- Located at the top of the page
- Switch between `dev`, `qa`, `prod`
- Affects:
  - Email generation
  - API endpoints
  - Status queries

### Group Selector
- On the Dashboard tab
- Select specific groups or "All Groups"
- Selected groups are highlighted
- Operations apply only to selected groups

## 🔄 Workflow

### For New Groups
1. **Create Group Configuration** (Groups tab)
   - Add group details
   - Configure source repository
   - System auto-generates email

2. **Add Token** (Tokens tab)
   - Add admin token (if not already present)
   - Leave user tokens empty for now

3. **Send Invitations** (Dashboard tab)
   - Select the new group
   - Click "Send Invitations"
   - Users receive emails

4. **Wait for User Verification**
   - Users verify email and set password
   - Out-of-band process (manual)

5. **Get User Token**
   - Login as the invited user
   - Copy token from Chrome DevTools
   - Add token in Tokens tab

6. **Setup Groups & Sources** (Dashboard tab)
   - Select the group
   - Click "Setup Groups & Sources"
   - System creates group and source

### For Existing Groups
1. **Update Configuration** (Groups tab)
   - Edit group or source details
   - Save changes

2. **Update Token** (Tokens tab)
   - Replace expired tokens
   - Save updated token

3. **Re-run Setup** (Dashboard tab)
   - Reset database state if needed
   - Re-run setup command

## 🛡️ Security Considerations

### Token Storage
- **Backend**: Tokens are stored in `.env` (gitignored)
- **Frontend**: Tokens are never cached or stored in browser
- **Transmission**: All API calls use HTTPS (in production)

### Best Practices
- ✅ Rotate tokens regularly (tokens expire after 1 hour)
- ✅ Use environment-specific tokens
- ✅ Never commit `.env` to Git
- ✅ Restrict token permissions to minimum required

### Token Masking
- Tokens are masked by default in the UI
- Click the eye icon to reveal temporarily
- UI shows first 10 and last 10 characters when masked

## 🚨 Common Issues

### Token Not Working
- **Issue**: API calls fail with 401 Unauthorized
- **Solution**: Token may have expired (1-hour lifetime). Get a fresh token from DevTools.

### Email Already Exists
- **Issue**: Invitation fails for a user
- **Solution**: User was already invited. Skip to token setup.

### Group Name Conflict
- **Issue**: "DUPLICATE_GROUP_NAME" error
- **Solution**: The script will automatically find and use the existing group ID.

### Changes Not Reflected
- **Issue**: Updated config doesn't take effect
- **Solution**: Restart the API server (`npm run dev:api`)

## 📊 Status Indicators

The Dashboard tab shows real-time status for each user:

| Icon | Meaning |
|------|---------|
| ✅ Green Checkmark | Completed |
| ⏳ Gray Clock | Pending |
| ❌ Red X | Not Set |

### Status Columns
- **Invited**: User received invitation email
- **Token**: Bearer token is configured
- **Group**: Group created in API
- **Source**: Source created and linked to group

## 💡 Tips

1. **Use Dark Mode**: Easier on the eyes for long configuration sessions
2. **Select Specific Groups**: Process groups individually to avoid timeouts
3. **Check Status Regularly**: Use the refresh button to see latest state
4. **Copy Tokens Carefully**: Ensure no extra whitespace when pasting
5. **Start with Dev Environment**: Test new groups in `dev` before `prod`

## 📝 API Endpoints (For Reference)

Configuration management endpoints:

```
GET    /api/tokens          # List all tokens
POST   /api/tokens          # Save/update token
DELETE /api/tokens/:id      # Delete token

GET    /api/groups          # List all groups
POST   /api/groups/save     # Save/update group
DELETE /api/groups/:id      # Delete group config
```

## 🔗 Related Documentation

- [README.md](./README.md) - Quick start and overview
- [WEB_UI.md](./WEB_UI.md) - Web UI architecture and API details
- [SECURITY.md](./SECURITY.md) - Security best practices
- [SETUP.md](./SETUP.md) - Installation and setup guide

---

**Questions or issues?** Check the main [README.md](./README.md) or open an issue on GitHub.

