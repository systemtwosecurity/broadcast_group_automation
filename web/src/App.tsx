import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Server,
  Users,
  FolderPlus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Key,
  Moon,
  Sun,
  Layout,
} from 'lucide-react';
import { TokenManager } from './components/TokenManager';
import { GroupManager } from './components/GroupManager';

// Types
interface Group {
  id: string;
  name: string;
}

interface UserStatus {
  id: string;
  email: string;
  invited: boolean;
  hasToken: boolean;
  groupCreated: boolean;
  groupApiId: string | null;
  sourceCreated: boolean;
  sourceApiId: string | null;
}

type Environment = 'dev' | 'qa' | 'prod';
type Tab = 'dashboard' | 'tokens' | 'groups';

function App() {
  const [environment, setEnvironment] = useState<Environment>('dev');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Load status when environment changes
  useEffect(() => {
    console.log(`🔄 Environment changed to: ${environment}`);
    loadStatus();
  }, [environment]);

  const loadGroups = async () => {
    try {
      const { data } = await axios.get('/api/groups');
      setGroups(data.groups);
    } catch (error: any) {
      showMessage('error', 'Failed to load groups');
    }
  };

  const loadStatus = async () => {
    try {
      console.log(`📊 Loading status for environment: ${environment}`);
      const { data } = await axios.get(`/api/status/${environment}`);
      console.log(`✅ Loaded ${data.users.length} users for ${environment}`, data);
      setUserStatuses(data.users);
    } catch (error: any) {
      console.error(`❌ Failed to load status for ${environment}:`, error);
      showMessage('error', 'Failed to load status');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInvite = async () => {
    setLoading(true);
    try {
      await axios.post('/api/invite', {
        environment,
        groupIds: selectedGroups.length > 0 ? selectedGroups : null,
      });
      showMessage('success', 'Invitations sent successfully!');
      await loadStatus();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    try {
      await axios.post('/api/setup', {
        environment,
        groupIds: selectedGroups.length > 0 ? selectedGroups : null,
      });
      showMessage('success', 'Setup completed successfully!');
      await loadStatus();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (sourcesOnly: boolean = false, groupsOnly: boolean = false) => {
    if (!confirm(`Are you sure you want to delete ${sourcesOnly ? 'sources' : groupsOnly ? 'groups' : 'groups and sources'}?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/cleanup', {
        environment,
        groupIds: selectedGroups.length > 0 ? selectedGroups : null,
        sourcesOnly,
        groupsOnly,
      });
      showMessage('success', 'Cleanup completed successfully!');
      await loadStatus();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Cleanup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset the database? This only clears local state.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/reset', {
        environment,
        groupIds: selectedGroups.length > 0 ? selectedGroups : null,
      });
      showMessage('success', 'Database reset successfully!');
      await loadStatus();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleAllGroups = () => {
    setSelectedGroups(prev =>
      prev.length === groups.length ? [] : groups.map(g => g.id)
    );
  };

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: Layout },
    { id: 'tokens' as Tab, label: 'Tokens', icon: Key },
    { id: 'groups' as Tab, label: 'Groups', icon: FolderPlus },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900'
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold dark:text-white text-gray-900 mb-2 flex items-center gap-3">
              <Server className="w-10 h-10" />
              Broadcast Group Automation
            </h1>
            <p className="dark:text-blue-200 text-blue-900">
              Manage security content groups and sources across environments
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded-lg dark:bg-white/10 bg-gray-200 dark:hover:bg-white/20 hover:bg-gray-300 transition-colors"
          >
            {darkMode ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-blue-900" />}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-100 border border-green-500/30'
                : 'bg-red-500/20 text-red-100 border border-red-500/30'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Environment Selector */}
        <div className="dark:bg-white/10 bg-white backdrop-blur-lg rounded-lg p-6 mb-6 border dark:border-white/20 border-gray-300 shadow-lg">
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Environment</h2>
          <div className="flex gap-3">
            {(['dev', 'qa', 'prod'] as Environment[]).map(env => (
              <button
                key={env}
                onClick={() => {
                  console.log(`🎯 Switching environment from ${environment} to ${env}`);
                  setEnvironment(env);
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  environment === env
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'dark:bg-white/10 bg-gray-100 dark:text-white/70 text-gray-700 dark:hover:bg-white/20 hover:bg-gray-200'
                }`}
              >
                {env.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="dark:bg-white/10 bg-white backdrop-blur-lg rounded-lg border dark:border-white/20 border-gray-300 shadow-lg mb-6">
          <div className="flex border-b dark:border-white/20 border-gray-300">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all ${
                    activeTab === tab.id
                      ? 'dark:text-blue-400 text-blue-600 border-b-2 border-blue-500 dark:bg-white/5 bg-blue-50'
                      : 'dark:text-white/70 text-gray-600 dark:hover:bg-white/5 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Group Selection */}
                  <div className="dark:bg-white/5 bg-gray-50 rounded-lg p-6 border dark:border-white/10 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold dark:text-white text-gray-900">Select Groups</h2>
                      <button
                        onClick={toggleAllGroups}
                        className="text-sm dark:text-blue-300 text-blue-600 dark:hover:text-blue-200 hover:text-blue-700"
                      >
                        {selectedGroups.length === groups.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {groups.map(group => (
                        <label
                          key={group.id}
                          className="flex items-center gap-3 p-3 rounded-lg dark:bg-white/5 bg-white dark:hover:bg-white/10 hover:bg-gray-100 cursor-pointer transition-colors border dark:border-white/10 border-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroups.includes(group.id)}
                            onChange={() => toggleGroupSelection(group.id)}
                            className="w-5 h-5 rounded"
                          />
                          <div>
                            <div className="dark:text-white text-gray-900 font-medium">{group.name}</div>
                            <div className="dark:text-white/50 text-gray-500 text-sm">{group.id}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 text-sm dark:text-white/50 text-gray-600">
                      {selectedGroups.length > 0
                        ? `${selectedGroups.length} group(s) selected`
                        : 'All groups will be processed'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="dark:bg-white/5 bg-gray-50 rounded-lg p-6 border dark:border-white/10 border-gray-200">
                    <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Actions</h2>
                    <div className="space-y-3">
                      <button
                        onClick={handleInvite}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                        Send Invitations
                      </button>

                      <button
                        onClick={handleSetup}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderPlus className="w-5 h-5" />}
                        Setup Groups & Sources
                      </button>

                      <div className="border-t dark:border-white/20 border-gray-300 my-4"></div>

                      <button
                        onClick={() => handleCleanup()}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        Delete All (Groups + Sources)
                      </button>

                      <button
                        onClick={() => handleCleanup(true, false)}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete Sources Only
                      </button>

                      <button
                        onClick={() => handleCleanup(false, true)}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete Groups Only
                      </button>

                      <div className="border-t dark:border-white/20 border-gray-300 my-4"></div>

                      <button
                        onClick={handleReset}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                        Reset Database State
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Table */}
                <div className="dark:bg-white/5 bg-gray-50 rounded-lg p-6 border dark:border-white/10 border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold dark:text-white text-gray-900">Status Overview</h2>
                    <button
                      onClick={loadStatus}
                      className="text-sm dark:text-blue-300 text-blue-600 dark:hover:text-blue-200 hover:text-blue-700 flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b dark:border-white/20 border-gray-300">
                          <th className="p-3 dark:text-white/70 text-gray-700">Group ID</th>
                          <th className="p-3 dark:text-white/70 text-gray-700">Email</th>
                          <th className="p-3 dark:text-white/70 text-gray-700 text-center">Invited</th>
                          <th className="p-3 dark:text-white/70 text-gray-700 text-center">Token</th>
                          <th className="p-3 dark:text-white/70 text-gray-700 text-center">Group</th>
                          <th className="p-3 dark:text-white/70 text-gray-700 text-center">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userStatuses.map(user => (
                          <tr key={user.id} className="border-b dark:border-white/10 border-gray-200 dark:hover:bg-white/5 hover:bg-gray-100">
                            <td className="p-3 dark:text-white text-gray-900 font-mono text-sm">{user.id}</td>
                            <td className="p-3 dark:text-white/80 text-gray-700 text-sm">{user.email}</td>
                            <td className="p-3 text-center">
                              {user.invited ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400 inline" />
                              ) : (
                                <Clock className="w-5 h-5 text-gray-400 inline" />
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {user.hasToken ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400 inline" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400 inline" />
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {user.groupCreated ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400 inline" />
                              ) : (
                                <Clock className="w-5 h-5 text-gray-400 inline" />
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {user.sourceCreated ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400 inline" />
                              ) : (
                                <Clock className="w-5 h-5 text-gray-400 inline" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tokens Tab */}
            {activeTab === 'tokens' && (
              <TokenManager environment={environment} />
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
              <GroupManager environment={environment} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center dark:text-white/50 text-gray-600 text-sm">
          Broadcast Group Automation v2.0 • Built with React + TypeScript + Tailwind CSS
        </div>
      </div>
    </div>
  );
}

export default App;

