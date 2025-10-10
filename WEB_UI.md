# 🎨 Web UI Documentation

A beautiful, responsive single-page application for managing broadcast group automation across all environments.

## 🚀 Quick Start

```bash
# Install dependencies
npm install
npm run install:web

# Start both API and Web UI
npm run dev:all

# Or run them separately:
npm run dev:api  # API server on port 3001
npm run dev:web  # Web UI on port 3000

# Open your browser
open http://localhost:3000
```

## 📸 Features

### 1. **Environment Switcher**
- Toggle between `dev`, `qa`, and `prod` environments
- Visual indication of active environment
- Status automatically refreshes when switching

### 2. **Group Selection**
- Multi-select groups for targeted operations
- "Select All" / "Deselect All" toggle
- Visual display of selected groups
- Empty selection = all groups processed

### 3. **Action Buttons**
- **Send Invitations**: Invite users to the platform
- **Setup Groups & Sources**: Create groups and sources
- **Delete All**: Remove both groups and sources
- **Delete Sources Only**: Keep groups, remove sources
- **Delete Groups Only**: Keep sources, remove groups
- **Reset Database**: Clear local state (doesn't touch API)

### 4. **Status Dashboard**
- Real-time status for all users
- Visual indicators:
  - ✅ Green checkmark: Completed
  - ⏰ Gray clock: Pending
  - ❌ Red X: Missing/Failed
- Columns:
  - **Invited**: User received invitation
  - **Token**: User has valid auth token in `.env`
  - **Group**: Group created in API
  - **Source**: Source created in API

### 5. **Success/Error Messages**
- Toast notifications for all operations
- Auto-dismiss after 5 seconds
- Color-coded (green = success, red = error)

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │────────▶│  Vite Dev   │────────▶│   Express   │
│  (React UI) │◀────────│   Server    │◀────────│  API Server │
│  Port 3000  │         │ (Proxy /api)│         │  Port 3001  │
└─────────────┘         └─────────────┘         └─────────────┘
                                                       │
                                                       ▼
                                         ┌──────────────────────┐
                                         │  CLI Workflows       │
                                         │  - Invitation        │
                                         │  - Setup             │
                                         │  - Database          │
                                         └──────────────────────┘
```

## 🔌 API Endpoints

### Health Check
```http
GET /api/health
Response: { status: 'ok', timestamp: '...' }
```

### Get All Groups
```http
GET /api/groups
Response: { groups: [{ id: 'sigmahq', name: 'SigmaHQ Private' }, ...] }
```

### Get Status for Environment
```http
GET /api/status/:environment
Response: {
  users: [{
    id: 'sigmahq',
    email: 'groups+sigmahq_dev@detections.ai',
    invited: true,
    hasToken: true,
    groupCreated: true,
    groupApiId: '123-456...',
    sourceCreated: true,
    sourceApiId: 'src-789...'
  }, ...]
}
```

### Send Invitations
```http
POST /api/invite
Body: {
  environment: 'dev',
  groupIds: ['sigmahq', 'yara_100days'] | null  // null = all
}
Response: { success: true, message: '...' }
```

### Setup Groups & Sources
```http
POST /api/setup
Body: {
  environment: 'dev',
  groupIds: ['sigmahq'] | null
}
Response: { success: true, message: '...' }
```

### Cleanup (Delete)
```http
POST /api/cleanup
Body: {
  environment: 'dev',
  groupIds: ['sigmahq'] | null,
  sourcesOnly: false,
  groupsOnly: false
}
Response: { success: true, message: '...' }
```

### Reset Database
```http
POST /api/reset
Body: {
  environment: 'dev',
  groupIds: ['sigmahq'] | null
}
Response: { success: true, message: '...' }
```

## 🎨 Tech Stack

### Frontend
- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Fast dev server & build tool
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Beautiful SVG icons
- **Axios**: HTTP client

### Backend
- **Express**: API server
- **CORS**: Cross-origin support
- **TypeScript**: Type safety

### Styling Features
- Gradient background (`from-gray-900 via-blue-900 to-gray-900`)
- Glassmorphism effects (`backdrop-blur-lg`, `bg-white/10`)
- Smooth transitions and hover effects
- Responsive design (mobile-first)
- Dark theme optimized for readability

## 🔧 Development

### Project Structure
```
web/
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles (Tailwind)
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript config
└── tsconfig.node.json   # Node TypeScript config
```

### Adding New Features

1. **Add API Endpoint** (`src/api/server.ts`):
```typescript
app.post('/api/my-feature', async (req, res) => {
  try {
    // Your logic here
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

2. **Add UI Handler** (`web/src/App.tsx`):
```typescript
const handleMyFeature = async () => {
  setLoading(true);
  try {
    await axios.post('/api/my-feature', { environment });
    showMessage('success', 'Feature executed!');
    await loadStatus();
  } catch (error: any) {
    showMessage('error', 'Feature failed');
  } finally {
    setLoading(false);
  }
};
```

3. **Add Button**:
```tsx
<button onClick={handleMyFeature} disabled={loading}>
  <MyIcon /> My Feature
</button>
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports 3000/3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### CORS Issues
- Ensure API server is running on port 3001
- Vite proxy is configured in `web/vite.config.ts`
- Check browser console for specific CORS errors

### Status Not Updating
- Check `.env` file has correct tokens
- Verify API server console for errors
- Check browser Network tab for failed requests
- Click "Refresh" button in Status Dashboard

### Build Issues
```bash
# Clean and rebuild
cd web
rm -rf node_modules dist
npm install
npm run build
```

## 🚢 Production Deployment

### Build for Production
```bash
# Build API
npm run build

# Build Web UI
cd web
npm run build
```

### Serve
```bash
# Serve API
node dist/api/server.js

# Serve Web UI (using nginx, vercel, etc.)
# Point to web/dist/ directory
```

### Environment Variables
```bash
# .env
ADMIN_TOKEN=your-admin-token
USER_TOKEN_SIGMAHQ=token-for-sigmahq
USER_TOKEN_YARA_100DAYS=token-for-yara
# ... etc
```

## 📝 Best Practices

1. **Always check status** before running operations
2. **Use group selection** to target specific groups
3. **Start with dev environment** before qa/prod
4. **Get fresh tokens** when they expire (1 hour)
5. **Use cleanup commands** to remove test data
6. **Reset database** only affects local state, not API

## 🆘 Support

See main **[README.md](./README.md)** for:
- CLI commands
- Token retrieval instructions
- Configuration details
- Architecture documentation

