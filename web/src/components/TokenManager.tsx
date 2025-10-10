import { useState, useEffect } from 'react';
import { Key, Save, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

interface Token {
  id: string;
  email: string;
  token: string;
}

interface TokenManagerProps {
  environment: string;
}

export function TokenManager(_props: TokenManagerProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [adminToken, setAdminToken] = useState('');
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});
  const [newToken, setNewToken] = useState({ id: '', email: '', token: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const { data } = await axios.get('/api/tokens');
      console.log('Loaded tokens:', data);
      setTokens(data.tokens || []);
      setAdminToken(data.adminToken || '');
    } catch (error: any) {
      console.error('Failed to load tokens:', error);
      showMessage('error', `Failed to load tokens: ${error.message}`);
    }
  };

  const saveToken = async (tokenData: Token) => {
    try {
      await axios.post('/api/tokens', tokenData);
      showMessage('success', 'Token saved successfully');
      loadTokens();
    } catch (error: any) {
      showMessage('error', 'Failed to save token');
    }
  };

  const deleteToken = async (id: string) => {
    if (!confirm('Are you sure you want to delete this token?')) return;
    
    try {
      await axios.delete(`/api/tokens/${id}`);
      showMessage('success', 'Token deleted');
      loadTokens();
    } catch (error: any) {
      showMessage('error', 'Failed to delete token');
    }
  };

  const toggleShowToken = (id: string) => {
    setShowTokens(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addNewToken = () => {
    if (!newToken.id || !newToken.email) {
      showMessage('error', 'Group ID and email are required');
      return;
    }
    // If token is empty, it will be set to "SKIP" by the backend
    saveToken(newToken);
    setNewToken({ id: '', email: '', token: '' });
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const maskToken = (token: string) => {
    if (token === 'SKIP') return 'SKIP';
    if (token.length <= 20) return '•'.repeat(token.length);
    return token.substring(0, 10) + '...' + token.substring(token.length - 10);
  };

  const isSkipToken = (token: string) => {
    return token === 'SKIP' || !token || token.trim() === '';
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-blue-500/10 dark:bg-blue-900/20 border border-blue-500/30 dark:border-blue-700 rounded-lg">
        <p className="text-sm text-blue-200 dark:text-blue-300">
          💡 <strong>Tip:</strong> Leave the token field empty to set it as "SKIP". Users with SKIP tokens will be skipped during setup operations.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-100 border border-green-500/30'
              : 'bg-red-500/20 text-red-100 border border-red-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Admin Token */}
      <div className="bg-white/5 dark:bg-gray-800/50 rounded-lg p-6 border border-white/20 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-white dark:text-gray-100 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-blue-400" />
          Admin Token
        </h3>
        <div className="flex gap-2">
          <input
            type={showTokens['admin'] ? 'text' : 'password'}
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="Enter admin bearer token"
            className="flex-1 px-4 py-2 bg-white/10 dark:bg-gray-900/50 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => toggleShowToken('admin')}
            className="px-3 py-2 bg-white/10 dark:bg-gray-700 hover:bg-white/20 dark:hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            {showTokens['admin'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <button
            onClick={() => saveToken({ id: 'admin', email: 'admin', token: adminToken })}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* User Tokens */}
      <div className="bg-white/5 dark:bg-gray-800/50 rounded-lg p-6 border border-white/20 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-white dark:text-gray-100 mb-4">User Tokens</h3>
        
        {/* Add New Token */}
        <div className="mb-6 p-4 bg-white/5 dark:bg-gray-900/50 rounded-lg border border-white/20 dark:border-gray-700">
          <h4 className="text-sm font-medium text-white/70 dark:text-gray-300 mb-3">Add New Token</h4>
          <div className="grid grid-cols-12 gap-2">
            <input
              type="text"
              value={newToken.id}
              onChange={(e) => setNewToken({ ...newToken, id: e.target.value })}
              placeholder="Group ID (e.g., sigmahq)"
              className="col-span-3 px-3 py-2 bg-white/10 dark:bg-gray-900/70 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              value={newToken.email}
              onChange={(e) => setNewToken({ ...newToken, email: e.target.value })}
              placeholder="Email"
              className="col-span-4 px-3 py-2 bg-white/10 dark:bg-gray-900/70 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              value={newToken.token}
              onChange={(e) => setNewToken({ ...newToken, token: e.target.value })}
              placeholder="Bearer token (leave empty to skip)"
              className="col-span-4 px-3 py-2 bg-white/10 dark:bg-gray-900/70 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addNewToken}
              className="col-span-1 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Existing Tokens */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tokens.map((token) => {
            const isSkip = isSkipToken(token.token);
            return (
              <div
                key={token.id}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  isSkip
                    ? 'bg-gray-500/10 dark:bg-gray-800/30 border-gray-500/20 dark:border-gray-600'
                    : 'bg-white/5 dark:bg-gray-900/50 border-white/10 dark:border-gray-700 hover:bg-white/10 dark:hover:bg-gray-900/70'
                }`}
              >
                <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-white dark:text-gray-100 font-mono text-sm">{token.id}</div>
                  <div className="col-span-4 text-white/70 dark:text-gray-300 text-sm truncate">{token.email}</div>
                  <div className="col-span-6 flex items-center gap-2">
                    {isSkip ? (
                      <span className="px-2 py-1 bg-gray-500/20 dark:bg-gray-700/30 border border-gray-500/30 dark:border-gray-600 rounded text-gray-400 dark:text-gray-500 text-xs font-medium">
                        NOT SET (SKIP)
                      </span>
                    ) : (
                      <span className="text-white/50 dark:text-gray-400 font-mono text-xs">
                        {showTokens[token.id] ? token.token : maskToken(token.token)}
                      </span>
                    )}
                  </div>
                </div>
                {!isSkip && (
                  <button
                    onClick={() => toggleShowToken(token.id)}
                    className="px-2 py-1 bg-white/10 dark:bg-gray-700 hover:bg-white/20 dark:hover:bg-gray-600 rounded text-white/70 dark:text-gray-300 transition-colors"
                  >
                    {showTokens[token.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => deleteToken(token.id)}
                  className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

