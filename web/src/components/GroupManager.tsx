import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2 } from 'lucide-react';
import axios from 'axios';

interface GroupConfig {
  id: string;
  name: string;
  group: {
    name: string;
    description: string;
    type: 'private' | 'public';
    settings: {
      allow_comments: boolean;
      notification_preferences: {
        new_member: boolean;
      };
    };
    unlisted: boolean;
  };
  source: {
    integration_type: string;
    name: string;
    description: string;
    connection_config: {
      repository: string;
      branch: string;
      root_path?: string;
    };
    pipeline_id?: string;
    pipeline_config?: {
      include_patterns?: string[];
      exclude_patterns?: string[];
      run_validation?: boolean;
      run_static_parsing?: boolean;
      run_ai_enrichment?: boolean;
      run_job_status?: boolean;
    };
    processing_config: {
      auto_sync: boolean;
      group_id: string;
    };
    credentials: {
      public: boolean;
    };
  };
}

interface GroupManagerProps {
  environment: string;
}

export function GroupManager({ environment }: GroupManagerProps) {
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [editingGroup, setEditingGroup] = useState<GroupConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data } = await axios.get('/api/groups');
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to load groups');
    }
  };

  const generateEmail = (groupId: string, env: string): string => {
    return `groups+${groupId}_${env}@detections.ai`;
  };

  const createNewGroup = (): GroupConfig => {
    const id = '';
    return {
      id,
      name: '',
      group: {
        name: '',
        description: '',
        type: 'private',
        settings: {
          allow_comments: true,
          notification_preferences: {
            new_member: true,
          },
        },
        unlisted: true,
      },
      source: {
        integration_type: 'github',
        name: '',
        description: '',
        connection_config: {
          repository: '',
          branch: 'main',
          root_path: '',
        },
        processing_config: {
          auto_sync: true,
          group_id: '<group_id>',
        },
        credentials: {
          public: true,
        },
      },
    };
  };

  const saveGroup = async (group: GroupConfig) => {
    if (!group.id || !group.name) {
      showMessage('error', 'Group ID and name are required');
      return;
    }

    try {
      await axios.post('/api/groups/save', group);
      showMessage('success', 'Group saved successfully');
      loadGroups();
      setEditingGroup(null);
      setShowAddForm(false);
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to save group');
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group configuration?')) return;

    try {
      await axios.delete(`/api/groups/${id}`);
      showMessage('success', 'Group deleted');
      loadGroups();
    } catch (error: any) {
      showMessage('error', 'Failed to delete group');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const GroupForm = ({ group, onSave, onCancel }: { group: GroupConfig; onSave: (g: GroupConfig) => void; onCancel: () => void }) => {
    const [formData, setFormData] = useState<GroupConfig>(group);
    const [githubUrl, setGithubUrl] = useState('');

    const updateField = (path: string, value: any) => {
      const keys = path.split('.');
      const updated = JSON.parse(JSON.stringify(formData));
      let current: any = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      setFormData(updated);
    };

    const parseGithubUrl = (url: string) => {
      try {
        // Handle various GitHub URL formats:
        // https://github.com/owner/repo
        // https://github.com/owner/repo/tree/branch
        // https://github.com/owner/repo/tree/branch/path/to/folder
        // github.com/owner/repo
        // owner/repo
        
        let cleanUrl = url.trim();
        
        // Remove protocol if present
        cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
        
        // Remove github.com if present
        cleanUrl = cleanUrl.replace(/^github\.com\//, '');
        
        // Split by /
        const parts = cleanUrl.split('/');
        
        if (parts.length < 2) {
          showMessage('error', 'Invalid GitHub URL. Expected format: owner/repo or full GitHub URL');
          return;
        }
        
        const owner = parts[0];
        const repo = parts[1];
        let branch = 'main';
        let rootPath = '';
        
        // Check if there's a branch specified
        if (parts.length >= 4 && parts[2] === 'tree') {
          branch = parts[3];
          
          // Check if there's a path after the branch
          if (parts.length > 4) {
            rootPath = '/' + parts.slice(4).join('/');
          }
        }
        
        // Update form data
        const updated = { ...formData };
        updated.source.connection_config.repository = `${owner}/${repo}`;
        updated.source.connection_config.branch = branch;
        updated.source.connection_config.root_path = rootPath;
        
        setFormData(updated);
        showMessage('success', `Parsed: ${owner}/${repo} (branch: ${branch}${rootPath ? ', path: ' + rootPath : ''})`);
      } catch (error: any) {
        showMessage('error', `Failed to parse GitHub URL: ${error.message}`);
      }
    };

    return (
      <div className="space-y-6 p-6 bg-white/5 dark:bg-gray-900/50 rounded-lg border border-white/20 dark:border-gray-700">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 dark:text-gray-300 mb-2">
              Group ID *
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => updateField('id', e.target.value)}
              placeholder="e.g., sigmahq"
              className="w-full px-4 py-2 bg-white/10 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 dark:text-gray-300 mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., SigmaHQ Private"
              className="w-full px-4 py-2 bg-white/10 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Auto-generated Email */}
        <div>
          <label className="block text-sm font-medium text-white/70 dark:text-gray-300 mb-2">
            Generated Email (Read-only)
          </label>
          <div className="px-4 py-2 bg-blue-500/10 dark:bg-blue-900/20 border border-blue-500/30 dark:border-blue-700 rounded-lg text-blue-300 dark:text-blue-400 font-mono text-sm">
            {formData.id ? generateEmail(formData.id, environment) : 'Enter Group ID to see email'}
          </div>
        </div>

        {/* Group Settings */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-white dark:text-gray-100">Group Settings</h4>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.group.name}
              onChange={(e) => updateField('group.name', e.target.value)}
              placeholder="Group name"
              className="w-full px-4 py-2 bg-white/10 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={formData.group.description}
              onChange={(e) => updateField('group.description', e.target.value)}
              placeholder="Description"
              className="w-full px-4 py-2 bg-white/10 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Source Configuration */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-white dark:text-gray-100">Source Configuration</h4>
          
          {/* GitHub URL Parser */}
          <div className="p-4 bg-blue-500/10 dark:bg-blue-900/20 border border-blue-500/30 dark:border-blue-700 rounded-lg">
            <label className="block text-sm font-medium text-blue-300 dark:text-blue-400 mb-2">
              🔗 GitHub Repository URL (paste full URL or owner/repo)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && parseGithubUrl(githubUrl)}
                placeholder="e.g., https://github.com/SigmaHQ/sigma/tree/master/rules"
                className="flex-1 px-4 py-2 bg-white/10 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => parseGithubUrl(githubUrl)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Parse URL
              </button>
            </div>
            <p className="text-xs text-white/50 dark:text-gray-400 mt-2">
              Supports: full URLs, owner/repo, URLs with branch and path
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.source.name}
              onChange={(e) => updateField('source.name', e.target.value)}
              placeholder="Source name"
              className="w-full px-4 py-2 bg-white/10 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={formData.source.description}
              onChange={(e) => updateField('source.description', e.target.value)}
              placeholder="Source description"
              className="w-full px-4 py-2 bg-white/10 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Parsed Fields (Read-only style but editable) */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-white/70 dark:text-gray-300 mb-1">Repository</label>
              <input
                type="text"
                value={formData.source.connection_config.repository}
                onChange={(e) => updateField('source.connection_config.repository', e.target.value)}
                placeholder="owner/repo"
                className="w-full px-4 py-2 bg-green-500/10 dark:bg-green-900/20 border border-green-500/30 dark:border-green-700 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white/70 dark:text-gray-300 mb-1">Branch</label>
              <input
                type="text"
                value={formData.source.connection_config.branch}
                onChange={(e) => updateField('source.connection_config.branch', e.target.value)}
                placeholder="main"
                className="w-full px-4 py-2 bg-green-500/10 dark:bg-green-900/20 border border-green-500/30 dark:border-green-700 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white/70 dark:text-gray-300 mb-1">Root Path (optional)</label>
              <input
                type="text"
                value={formData.source.connection_config.root_path || ''}
                onChange={(e) => updateField('source.connection_config.root_path', e.target.value)}
                placeholder="/rules"
                className="w-full px-4 py-2 bg-green-500/10 dark:bg-green-900/20 border border-green-500/30 dark:border-green-700 rounded-lg text-white dark:text-gray-100 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Save className="w-5 h-5" />
            Save Group
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
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

      {/* Add New Group Button */}
      {!showAddForm && !editingGroup && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-4 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Group
        </button>
      )}

      {/* Add Form */}
      {showAddForm && (
        <GroupForm
          group={createNewGroup()}
          onSave={saveGroup}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Form */}
      {editingGroup && (
        <GroupForm
          group={editingGroup}
          onSave={saveGroup}
          onCancel={() => setEditingGroup(null)}
        />
      )}

      {/* Existing Groups */}
      {!showAddForm && !editingGroup && (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="p-4 bg-white/5 dark:bg-gray-800/50 rounded-lg border border-white/20 dark:border-gray-700 hover:bg-white/10 dark:hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white dark:text-gray-100">{group.name}</h3>
                  <p className="text-sm text-white/70 dark:text-gray-300 font-mono">{group.id}</p>
                  <p className="text-sm text-white/50 dark:text-gray-400 mt-1">
                    Email: {generateEmail(group.id, environment)}
                  </p>
                  <p className="text-sm text-white/50 dark:text-gray-400">
                    Source: {group.source.connection_config.repository} ({group.source.connection_config.branch})
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

