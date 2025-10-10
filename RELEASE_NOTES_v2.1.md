# Release Notes - v2.1.0: Configuration Management & Dark Mode

**Release Date:** January 10, 2025

## 🎉 Major New Features

### 1. **Dark Mode with Best Practices** 🌓
- **Class-based toggle**: Seamless switching between light and dark themes
- **System preference detection**: Automatically matches your OS setting
- **Persistent preference**: Remembers your choice across sessions
- **Smooth transitions**: Beautiful color transitions on theme change
- **Optimized palettes**: Custom colors for maximum readability
- **WCAG AA compliant**: Accessibility-first design

### 2. **Token Management UI** 🔑
- **Visual token management**: No more editing `.env` manually
- **CRUD operations**: Create, view, update, delete tokens in the UI
- **Secure masking**: Tokens hidden by default with toggle visibility
- **Auto-save**: Changes saved directly to `.env` file
- **Bulk operations**: Manage admin and all user tokens in one place

### 3. **Group Configuration Management** 🏗️
- **Create groups visually**: Full-featured form for new groups
- **Edit existing groups**: Inline editing with instant save
- **Delete groups**: Remove configurations safely
- **Live preview**: See your changes before saving
- **Validation**: Ensures all required fields are present

### 4. **Source Configuration** 📂
- **GitHub integration**: Configure repository, branch, and root path
- **Advanced options**: Pipeline config, include/exclude patterns
- **Validation settings**: Control rule validation and parsing
- **Public repositories**: Support for public GitHub repos

### 5. **Auto-Email Generation** ✉️
- **Smart formatting**: `groups+{id}_{env}@detections.ai`
- **Environment-aware**: Different emails for dev/qa/prod
- **Real-time preview**: See generated email as you type
- **Automatic creation**: User entries auto-created

## ✨ UI/UX Improvements

### Tabbed Interface
- **Dashboard**: Main operations (invite, setup, cleanup, status)
- **Tokens**: Token management hub
- **Groups**: Group and source configuration

### Visual Enhancements
- **Icon-rich**: Lucide React icons throughout
- **Status indicators**: Clear visual feedback (✅, ⏳, ❌)
- **Loading states**: Spinners during operations
- **Toast notifications**: Success/error messages with auto-dismiss
- **Responsive design**: Works on mobile, tablet, and desktop

### Improved Forms
- **Validation**: Client-side validation with helpful errors
- **Auto-focus**: Cursor automatically placed in first field
- **Keyboard navigation**: Tab through fields smoothly
- **Placeholder text**: Helpful examples in each field

## 🔧 Backend Improvements

### New API Endpoints
```
GET    /api/tokens          # List all tokens
POST   /api/tokens          # Save/update token
DELETE /api/tokens/:id      # Delete token

POST   /api/groups/save     # Save/update group
DELETE /api/groups/:id      # Delete group config
```

### File Management
- **Automatic .env updates**: Tokens saved directly to environment
- **Config persistence**: Groups saved to `config/groups.json`
- **User sync**: Auto-creates user entries in `config/users.json`
- **Hot reload**: Server picks up changes automatically

## 📚 Documentation

### New Guides
- **[CONFIGURATION_MANAGEMENT.md](./CONFIGURATION_MANAGEMENT.md)**: Complete guide to using the new UI
  - Dark mode usage
  - Token management walkthrough
  - Group configuration examples
  - Email generation explained
  - Security best practices

### Updated Docs
- **[README.md](./README.md)**: Updated feature list and documentation links
- **[WEB_UI.md](./WEB_UI.md)**: New API endpoints documented
- All guides reference the new configuration features

## 🔒 Security

- **Token masking**: Tokens never displayed in full by default
- **Secure transmission**: All API calls over HTTPS (in production)
- **No client storage**: Tokens never cached in browser
- **File-based persistence**: Tokens stay in `.env` (gitignored)
- **Access control**: Backend validates all configuration changes

## 🚀 Performance

- **Fast operations**: Configuration changes apply instantly
- **Optimized rendering**: React components memoized where possible
- **Lazy loading**: Components load on demand
- **Minimal API calls**: Only fetch when needed

## 🐛 Bug Fixes

- Fixed TypeScript compilation errors in workflows
- Removed unused MCPClient dependencies
- Fixed unused import warnings
- Cleaned up old App.tsx file

## 📦 Dependencies

### Added
- `lucide-react@^0.468.0`: Icon library for UI

### Updated
- All existing dependencies remain compatible

## 🔄 Migration Guide

**No migration needed!** This release is fully backward compatible.

### What Works Automatically
- ✅ Existing `.env` files
- ✅ Existing `config/groups.json`
- ✅ Existing `config/users.json`
- ✅ All CLI commands
- ✅ Docker deployments

### Optional: Try New Features
1. Start the web UI: `npm run dev:all`
2. Click the moon/sun icon to toggle dark mode
3. Go to **Tokens** tab to manage tokens visually
4. Go to **Groups** tab to create/edit groups

## 📊 Stats

- **9 files changed**
- **1,320 insertions**
- **174 deletions**
- **3 new components**
- **5 new API endpoints**
- **1 comprehensive documentation file**

## 🎯 What's Next

Potential future enhancements (not committed):
- [ ] Export/import configurations
- [ ] Bulk token import from CSV
- [ ] Configuration versioning
- [ ] Role-based access control
- [ ] Audit log for configuration changes

## 📝 Commit History

```
920508f feat: configuration management UI with dark mode
c1a982b feat: auto-select ports from range 4500-4900
d02d774 feat: granular cleanup with database state tracking
...
```

## 🙏 Acknowledgments

- **Tailwind CSS**: For excellent dark mode utilities
- **Lucide React**: For beautiful, consistent icons
- **React Community**: For best practices and patterns

---

**Ready to try it?** Run `npm run dev:all` and explore the new features!

**Questions?** Check [CONFIGURATION_MANAGEMENT.md](./CONFIGURATION_MANAGEMENT.md) or [README.md](./README.md).

