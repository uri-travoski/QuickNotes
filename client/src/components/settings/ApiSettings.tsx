import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Bot,
  Shield,
  BookOpen,
  Terminal,
  Cpu,
  X,
} from 'lucide-react';
import { ApiKey } from '../../types';
import * as api from '../../api/client';
import { useNotes } from '../../context/NotesContext';

export const ApiSettings: React.FC = () => {
  const { isOwner, showToast, openConfirmDialog } = useNotes();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'keys' | 'docs' | 'ai_tools'>('keys');

  // New key modal & reveal modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Specs
  const [aiToolsSpec, setAiToolsSpec] = useState<any>(null);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const data = await api.fetchApiKeys();
      setApiKeys(data);
    } catch (err: any) {
      showToast('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) loadKeys();
    api.fetchAiToolsSpec().then(setAiToolsSpec).catch(console.error);
  }, [isOwner]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const created = await api.createApiKey(newKeyName.trim());
      setRevealedKey(created.apiKey || null);
      setShowCreateModal(false);
      setNewKeyName('');
      loadKeys();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate API key');
    }
  };

  const handleRevokeKey = (id: string) => {
    openConfirmDialog({
      title: 'Revoke API Key',
      message: 'Are you sure you want to revoke this API key? Any agent or integration using it will immediately lose access.',
      confirmText: 'Revoke Key',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.revokeApiKey(id);
          showToast('API key revoked');
          loadKeys();
        } catch (err: any) {
          showToast(err.message || 'Failed to revoke API key');
        }
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    showToast('Copied to clipboard');
    setTimeout(() => setCopiedKey(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#3c4043]">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            REST API & AI Integrations
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage API keys, inspect OpenAPI 3.1 endpoints, and export agent tool calling schemas.
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-10 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Generate API Key</span>
          </button>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-[6px] bg-gray-100/80 dark:bg-[#1a1b1e] border border-gray-200/60 dark:border-[#3c4043] w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('keys')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'keys'
              ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>API Keys ({apiKeys.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('docs')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'docs'
              ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Endpoints (OpenAPI 3.1)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ai_tools')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'ai_tools'
              ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>AI Tool Schemas</span>
        </button>
      </div>

      {/* Tab 1: API Keys List */}
      {activeSubTab === 'keys' && (
        <div className="space-y-4">
          {!isOwner ? (
            <div className="p-8 text-center text-gray-500">
              <Shield className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-xs">Only the Owner user can generate and revoke API keys.</p>
            </div>
          ) : loading ? (
            <div className="py-8 text-center text-gray-400 text-xs font-medium animate-pulse">Loading keys...</div>
          ) : apiKeys.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-[#3c4043] rounded-[6px]">
              <Bot className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">No API Keys Generated</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                Generate an API key to allow external AI agents or automation scripts to interact with your QuickNotes notes.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#28292c] rounded-[6px] border border-gray-200 dark:border-[#3c4043] shadow-xs overflow-hidden">
              {/* Horizontally scrollable container with generous column spacing */}
              <div className="overflow-x-auto max-w-full">
                <table className="min-w-[820px] w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50/90 dark:bg-[#202124] border-b border-gray-200 dark:border-[#3c4043] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="w-[240px] min-w-[220px] px-6 py-3.5">Key Name / Description</th>
                      <th className="w-[200px] min-w-[180px] px-6 py-3.5">API Key Prefix</th>
                      <th className="w-[150px] min-w-[130px] px-6 py-3.5">Assigned User</th>
                      <th className="w-[180px] min-w-[160px] px-6 py-3.5">Last Accessed</th>
                      <th className="w-[90px] min-w-[80px] px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#3c4043]">
                    {apiKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span>{k.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-[6px] bg-gray-100 dark:bg-[#1a1b1e] border border-gray-200/80 dark:border-[#3c4043] text-[11px] font-semibold">
                            {k.key_prefix}••••••••
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] bg-gray-100 dark:bg-[#1a1b1e] text-[11px] font-medium text-gray-700 dark:text-gray-300">
                            <Bot className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            <span>{k.username || 'System'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-[11px] font-mono whitespace-nowrap">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(k.id)}
                            title="Revoke API key"
                            className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors inline-flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: OpenAPI 3.1 Endpoints */}
      {activeSubTab === 'docs' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-[6px] border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Terminal className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5" />
            <div>
              <div className="font-bold text-xs">Authentication Header</div>
              <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Pass your API key in all requests via <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-[11px]">X-API-Key: sk_qn_...</code> or <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-[11px]">Authorization: Bearer sk_qn_...</code>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Notes Query */}
            <div className="p-4 bg-white dark:bg-[#28292c] rounded-[6px] border border-gray-200 dark:border-[#3c4043] space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[6px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs font-mono">
                  GET
                </span>
                <span className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100">
                  /api/notes
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Search and filter notes with date ranges, multi-label matching (AND/OR), full-text query, and attachments.
              </p>
              <pre className="p-3.5 bg-gray-900 text-gray-100 rounded-[6px] font-mono text-[11px] overflow-x-auto">
{`curl -X GET "http://localhost:3000/api/notes?q=kyoto&tag_ids=uuid1,uuid2&tag_match=and" \
  -H "X-API-Key: sk_qn_your_key_here"`}
              </pre>
            </div>

            {/* Note Creation */}
            <div className="p-4 bg-white dark:bg-[#28292c] rounded-[6px] border border-gray-200 dark:border-[#3c4043] space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[6px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs font-mono">
                  POST
                </span>
                <span className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100">
                  /api/notes
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create a note with checklists, color, and tags.
              </p>
              <pre className="p-3.5 bg-gray-900 text-gray-100 rounded-[6px] font-mono text-[11px] overflow-x-auto">
{`curl -X POST "http://localhost:3000/api/notes" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_qn_your_key_here" \
  -d '{
    "title": "Meeting Summary",
    "content": "Discussed roadmap and 2026 deliverables.",
    "color": "mint",
    "checklist_items": [{"text": "Follow up with team", "is_completed": false}]
  }'`}
              </pre>
            </div>

            {/* Labels Management */}
            <div className="p-4 bg-white dark:bg-[#28292c] rounded-[6px] border border-gray-200 dark:border-[#3c4043] space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[6px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs font-mono">
                  GET
                </span>
                <span className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100">
                  /api/tags
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Fetch 2-step nested label hierarchy (tree and flat list with note counts).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AI Agent Tool Calling Schemas */}
      {activeSubTab === 'ai_tools' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ready-to-use function declarations compatible with <strong>OpenAI</strong>, <strong>Claude</strong>, and <strong>Gemini</strong> tool calling.
            </p>

            <button
              type="button"
              onClick={() => copyToClipboard(JSON.stringify(aiToolsSpec?.tools || [], null, 2))}
              className="h-9 px-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#3c4043] dark:hover:bg-[#484c50] text-gray-700 dark:text-gray-200 rounded-[6px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Tool Schemas (JSON)</span>
            </button>
          </div>

          <pre className="p-4 bg-gray-950 text-gray-100 rounded-[6px] font-mono text-[11px] overflow-x-auto max-h-96 border border-gray-800 shadow-inner">
            {JSON.stringify(aiToolsSpec?.tools || [], null, 2)}
          </pre>
        </div>
      )}

      {/* Reveal Generated Key Modal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg bg-white dark:bg-[#28292c] rounded-[6px] shadow-keep-modal border border-gray-200 dark:border-[#3c4043] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4.5 border-b border-gray-100 dark:border-[#3c4043] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-500" />
                API Key Generated Successfully
              </h3>
              <button
                type="button"
                onClick={() => setRevealedKey(null)}
                className="p-1.5 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-[6px] border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs">
                ⚠️ <strong>Save this key immediately.</strong> You will not be able to view it again once this modal is closed.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Your Secret API Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={revealedKey}
                    className="flex-1 h-10 px-3.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] font-mono text-xs text-gray-900 dark:text-gray-100 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(revealedKey)}
                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-[6px] font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-[#3c4043]">
                <button
                  type="button"
                  onClick={() => setRevealedKey(null)}
                  className="h-10 px-4 bg-gray-900 hover:bg-black dark:bg-[#3c4043] dark:hover:bg-[#484c50] text-white font-semibold text-xs rounded-[6px] transition-all cursor-pointer"
                >
                  I have saved my key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-white dark:bg-[#28292c] rounded-[6px] shadow-keep-modal border border-gray-200 dark:border-[#3c4043] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4.5 border-b border-gray-100 dark:border-[#3c4043] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                Generate New API Key
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Key Name / Description *
                </label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Antigravity Agent, Claude Desktop, Cron Sync"
                  className="w-full h-10 px-3.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#3c4043]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 px-4 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3c4043] rounded-[6px] text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-semibold text-xs rounded-[6px] shadow-xs transition-all cursor-pointer"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiSettings;
