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
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { ApiKey } from '../../types';
import * as api from '../../api/client';
import { useNotes } from '../../context/NotesContext';

export const ApiSettings: React.FC = () => {
  const { isOwner, showToast, openConfirmDialog } = useNotes();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'keys' | 'docs' | 'ai_tools'>('keys');

  // Inline forms (replaces modal-in-modal anti-patterns)
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
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
      setIsGenerating(true);
      const created = await api.createApiKey(newKeyName.trim());
      setRevealedKey(created.apiKey || null);
      setShowCreateCard(false);
      setNewKeyName('');
      loadKeys();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate API key');
    } finally {
      setIsGenerating(false);
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
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#3c4043]">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Key className="w-4.5 h-4.5 text-amber-500" />
            REST API & AI Integrations
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage agent API keys, inspect OpenAPI 3.1 endpoints, and export function schemas.
          </p>
        </div>

        {isOwner && activeSubTab === 'keys' && (
          <button
            type="button"
            onClick={() => setShowCreateCard(!showCreateCard)}
            className="h-8.5 px-3.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showCreateCard ? 'Close Form' : 'Generate API Key'}</span>
          </button>
        )}
      </div>

      {/* Sub-Navigation Pill Switcher */}
      <div className="inline-flex items-center gap-1 p-1 bg-gray-100/90 dark:bg-[#1a1b1e] rounded-lg border border-gray-200/80 dark:border-[#3c4043]">
        <button
          type="button"
          onClick={() => setActiveSubTab('keys')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeSubTab === 'keys'
              ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>API Keys ({apiKeys.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('docs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeSubTab === 'docs'
              ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Endpoints (OpenAPI 3.1)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ai_tools')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeSubTab === 'ai_tools'
              ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>AI Tool Schemas</span>
        </button>
      </div>

      {/* Revealed Key Banner Card */}
      {revealedKey && (
        <div className="p-4.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-3 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-xs">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>New API Key Generated Successfully</span>
            </div>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="p-1 rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-200">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 mt-0.5" />
            <span>
              Save this key immediately. For security, you will not be able to view this full key again once dismissed.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={revealedKey}
              className="flex-1 h-9 px-3 bg-white dark:bg-[#1a1b1e] border border-emerald-200 dark:border-emerald-800/70 rounded-lg font-mono text-xs text-gray-900 dark:text-gray-100 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(revealedKey)}
              className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-lg font-medium text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
            </button>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="h-9 px-3 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Inline Key Generation Form */}
      {showCreateCard && (
        <div className="p-5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-4 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-amber-200/70 dark:border-amber-900/60 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Generate New API Key
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateCard(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateKey} className="space-y-3.5 text-xs">
            <div className="max-w-md space-y-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Key Name / Description *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Antigravity Agent, Claude Desktop, CLI Sync"
                className="w-full h-9 px-3 bg-white dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/60">
              <button
                type="button"
                onClick={() => setShowCreateCard(false)}
                className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-xs font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating || !newKeyName.trim()}
                className="h-8.5 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Generating...' : 'Create Key'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 1: API Keys List */}
      {activeSubTab === 'keys' && (
        <div className="space-y-4">
          {!isOwner ? (
            <div className="p-8 text-center text-gray-500 rounded-xl border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629]">
              <Shield className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-xs">Only the Owner user can generate and revoke API keys.</p>
            </div>
          ) : loading ? (
            <div className="py-8 text-center text-gray-400 text-xs font-medium animate-pulse">Loading keys...</div>
          ) : apiKeys.length === 0 ? (
            <div className="p-10 text-center border-2 border-dashed border-gray-200 dark:border-[#3c4043] rounded-xl">
              <Bot className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">No API Keys Generated</h3>
              <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
                Generate an API key to allow external AI agents or automated scripts to interact with your QuickNotes workspace.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#252629] rounded-xl border border-gray-200/80 dark:border-[#3c4043] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-[#1f2023] border-b border-gray-200/80 dark:border-[#3c4043] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Key Name</th>
                      <th className="px-5 py-3">Prefix</th>
                      <th className="px-5 py-3">User</th>
                      <th className="px-5 py-3">Last Used</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#3c4043]">
                    {apiKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span>{k.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-[#1a1b1e] border border-gray-200/80 dark:border-[#3c4043] text-[11px] font-semibold">
                            {k.key_prefix}••••••••
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#1a1b1e] text-[11px] font-medium text-gray-700 dark:text-gray-300">
                            <Bot className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            <span>{k.username || 'System'}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-[11px] font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(k.id)}
                            title="Revoke API key"
                            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-[#3c4043] hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-colors inline-flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Terminal className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <div className="font-bold text-xs">Authorization Headers</div>
              <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Include your key in request headers via <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-[11px]">X-API-Key: sk_qn_...</code> or <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-[11px]">Authorization: Bearer sk_qn_...</code>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Notes Query */}
            <div className="p-4 bg-white dark:bg-[#252629] rounded-xl border border-gray-200/80 dark:border-[#3c4043] space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] font-mono border border-emerald-200/60 dark:border-emerald-800/60">
                    GET
                  </span>
                  <span className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100">
                    /api/notes
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Search & filter notes</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Full-text search, label filtering (AND/OR), date ranges, and attachment metadata.
              </p>
              <pre className="p-3 bg-gray-950 text-gray-100 rounded-lg font-mono text-[11px] overflow-x-auto border border-gray-800">
{`curl -X GET "http://localhost:3000/api/notes?q=meeting&tag_match=and" \\
  -H "X-API-Key: sk_qn_your_key_here"`}
              </pre>
            </div>

            {/* Note Creation */}
            <div className="p-4 bg-white dark:bg-[#252629] rounded-xl border border-gray-200/80 dark:border-[#3c4043] space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[11px] font-mono border border-blue-200/60 dark:border-blue-800/60">
                    POST
                  </span>
                  <span className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100">
                    /api/notes
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Create a note</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create markdown notes with checklists, color themes, and hierarchical tags.
              </p>
              <pre className="p-3 bg-gray-950 text-gray-100 rounded-lg font-mono text-[11px] overflow-x-auto border border-gray-800">
{`curl -X POST "http://localhost:3000/api/notes" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sk_qn_your_key_here" \\
  -d '{
    "title": "Release Notes v1.2",
    "content": "Updated settings modal and storage sync engine.",
    "color": "mint",
    "checklist_items": [{"text": "Deploy to staging", "is_completed": true}]
  }'`}
              </pre>
            </div>

            {/* Labels Management */}
            <div className="p-4 bg-white dark:bg-[#252629] rounded-xl border border-gray-200/80 dark:border-[#3c4043] space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] font-mono border border-emerald-200/60 dark:border-emerald-800/60">
                    GET
                  </span>
                  <span className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100">
                    /api/tags
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Fetch label tree</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Retrieve root categories and nested sub-labels with note counts.
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
              className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copied' : 'Copy Schemas (JSON)'}</span>
            </button>
          </div>

          <pre className="p-4 bg-gray-950 text-gray-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-96 border border-gray-800 shadow-inner">
            {JSON.stringify(aiToolsSpec?.tools || [], null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiSettings;
