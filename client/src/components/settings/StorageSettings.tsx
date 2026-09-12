import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Check,
  Save,
  Zap,
  CheckCircle2,
  AlertCircle,
  Folder,
  Copy,
  ExternalLink,
  LogOut,
  Upload,
  FileText,
  Shield,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { StorageConfig } from '../../types';
import * as api from '../../api/client';
import { useNotes } from '../../context/NotesContext';

interface StorageTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export const StorageSettings: React.FC = () => {
  const { isOwner, showToast } = useNotes();
  
  const [activeProvider, setActiveProvider] = useState<'local' | 's3' | 'gdrive'>('local');
  const [loading, setLoading] = useState(true);
  const [testingType, setTestingType] = useState<'local' | 's3' | 'gdrive' | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: StorageTestResult }>({});

  // S3 Form State
  const [s3Config, setS3Config] = useState({
    bucket_name: '',
    region: 'us-east-1',
    endpoint_url: '',
    custom_domain: '',
    access_key_id: '',
    secret_access_key: '',
  });

  // Google Drive Form State
  const [gdriveConfig, setGdriveConfig] = useState({
    folder_id: 'root',
    client_email: '',
    private_key: '',
    service_account_json: '',
    client_id: '',
    client_secret: '',
    refresh_token: '',
    has_refresh_token: false,
    connected_email: '',
    service_account_json_configured: false,
  });

  // GDrive Mode: 'oauth' vs 'service_account'
  const [gdriveAuthMode, setGdriveAuthMode] = useState<'oauth' | 'service_account'>('oauth');
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [showJsonAutoFill, setShowJsonAutoFill] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const redirectUri = `${window.location.origin}/api/storage/gdrive/oauth/callback`;

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await api.fetchStorageConfigs();
      
      setActiveProvider(data.active_provider as any);

      // Populate S3 Config
      const s3 = (data.providers || []).find((c: StorageConfig) => c.provider_type === 's3')?.config || {};
      setS3Config({
        bucket_name: s3.bucket_name || '',
        region: s3.region || 'us-east-1',
        endpoint_url: s3.endpoint_url || '',
        custom_domain: s3.custom_domain || '',
        access_key_id: s3.access_key_id || '',
        secret_access_key: s3.secret_access_key || '',
      });

      // Populate GDrive Config
      const gdrive = (data.providers || []).find((c: StorageConfig) => c.provider_type === 'gdrive')?.config || {};
      setGdriveConfig({
        folder_id: gdrive.folder_id || 'root',
        client_email: gdrive.client_email || '',
        private_key: gdrive.private_key || '',
        service_account_json: gdrive.service_account_json || '',
        client_id: gdrive.client_id || '',
        client_secret: gdrive.client_secret || '',
        refresh_token: gdrive.refresh_token || '',
        has_refresh_token: !!gdrive.has_refresh_token,
        connected_email: gdrive.connected_email || '',
        service_account_json_configured: !!gdrive.service_account_json_configured,
      });

      if (gdrive.auth_mode) {
        setGdriveAuthMode(gdrive.auth_mode);
      } else if (gdrive.client_email || gdrive.service_account_json_configured) {
        setGdriveAuthMode('service_account');
      } else {
        setGdriveAuthMode('oauth');
      }
    } catch (err: any) {
      showToast('Failed to load storage configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) loadConfigs();
  }, [isOwner]);

  // Listen for OAuth Popup PostMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GDRIVE_OAUTH_SUCCESS' || event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        setIsConnectingOAuth(false);
        showToast(`Connected Google Drive account (${event.data.email || 'Success'})`);
        loadConfigs();
      } else if (event.data?.type === 'GDRIVE_OAUTH_ERROR') {
        setIsConnectingOAuth(false);
        showToast(`Google Drive connection error: ${event.data.message || 'Failed'}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isOwner) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Access Denied</h3>
        <p className="text-xs text-gray-400 mt-1">
          Only Owner users are authorized to configure storage providers.
        </p>
      </div>
    );
  }

  const isClientSecretClientId =
    !!gdriveConfig.client_secret &&
    !gdriveConfig.client_secret.includes('••') &&
    (gdriveConfig.client_secret.endsWith('.apps.googleusercontent.com') ||
      (!!gdriveConfig.client_id && gdriveConfig.client_secret.trim() === gdriveConfig.client_id.trim()));

  const isRefreshTokenClientSecret =
    !!gdriveConfig.refresh_token &&
    !gdriveConfig.refresh_token.includes('••') &&
    gdriveConfig.refresh_token.startsWith('GOCSPX-');

  const handleTestConnection = async (type: 'local' | 's3' | 'gdrive') => {
    if (type === 'gdrive') {
      if (isClientSecretClientId) {
        showToast('Error: Client Secret cannot be a Client ID (.apps.googleusercontent.com)');
        return;
      }
      if (isRefreshTokenClientSecret) {
        showToast('Error: The string starting with GOCSPX- is a Client Secret, not a Refresh Token');
        return;
      }
    }
    setTestingType(type);
    try {
      let config: any = {};
      if (type === 's3') {
        config = s3Config;
      } else if (type === 'gdrive') {
        config = {
          folder_id: gdriveConfig.folder_id,
          client_id: gdriveConfig.client_id,
          auth_mode: gdriveAuthMode,
          ...(gdriveConfig.client_secret && !gdriveConfig.client_secret.includes('••') ? { client_secret: gdriveConfig.client_secret } : {}),
          ...(gdriveConfig.refresh_token && !gdriveConfig.refresh_token.includes('••') ? { refresh_token: gdriveConfig.refresh_token } : {}),
          ...(gdriveConfig.private_key && !gdriveConfig.private_key.includes('••') ? { private_key: gdriveConfig.private_key } : {}),
          ...(gdriveConfig.client_email ? { client_email: gdriveConfig.client_email } : {}),
          ...(gdriveConfig.service_account_json ? { service_account_json: gdriveConfig.service_account_json } : {}),
        };
      }
      const res = await api.testStorageConnection(type, config);
      setTestResults((prev) => ({ ...prev, [type]: res }));
      if (res.success) {
        showToast(res.message || `Connection test passed for ${type.toUpperCase()}`);
      } else {
        showToast(res.message || `Connection failed for ${type.toUpperCase()}`);
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [type]: { success: false, message: err.message || 'Connection test error' },
      }));
      showToast('Connection test error');
    } finally {
      setTestingType(null);
    }
  };

  const handleSaveConfig = async (type: 'local' | 's3' | 'gdrive', setActive: boolean = true) => {
    if (type === 'gdrive') {
      if (isClientSecretClientId) {
        showToast('Error: Client Secret cannot be a Client ID (.apps.googleusercontent.com)');
        return;
      }
      if (isRefreshTokenClientSecret) {
        showToast('Error: The string starting with GOCSPX- is a Client Secret, not a Refresh Token');
        return;
      }
    }
    try {
      let config = {};
      if (type === 's3') {
        config = s3Config;
      } else if (type === 'gdrive') {
        config = {
          ...gdriveConfig,
          auth_mode: gdriveAuthMode,
        };
      }
      await api.updateStorageConfig(type, config, setActive);
      if (setActive) {
        setActiveProvider(type);
      }
      showToast(`Saved & activated configuration for ${type.toUpperCase()}`);
      loadConfigs();
    } catch (err: any) {
      showToast(err.message || 'Failed to save configuration');
    }
  };

  const handleSaveAndTestGoogleDrive = async () => {
    if (isClientSecretClientId) {
      showToast('Error: Client Secret cannot be a Client ID (.apps.googleusercontent.com)');
      return;
    }
    if (isRefreshTokenClientSecret) {
      showToast('Error: The string starting with GOCSPX- is a Client Secret, not a Refresh Token');
      return;
    }
    try {
      setTestingType('gdrive');
      const config = {
        ...gdriveConfig,
        auth_mode: 'oauth',
      };
      await api.updateStorageConfig('gdrive', config, true);
      setActiveProvider('gdrive');
      
      const testRes = await api.testStorageConnection('gdrive', {
        folder_id: gdriveConfig.folder_id,
        client_id: gdriveConfig.client_id,
        auth_mode: 'oauth',
        ...(gdriveConfig.client_secret && !gdriveConfig.client_secret.includes('••') ? { client_secret: gdriveConfig.client_secret } : {}),
        ...(gdriveConfig.refresh_token && !gdriveConfig.refresh_token.includes('••') ? { refresh_token: gdriveConfig.refresh_token } : {}),
      });
      setTestResults((prev) => ({ ...prev, gdrive: testRes }));
      if (testRes.success) {
        showToast(testRes.message || 'Connection OK');
      } else {
        showToast(testRes.message || 'Connection test failed');
      }
      loadConfigs();
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        gdrive: { success: false, message: err.message || 'Connection test error' },
      }));
      showToast(err.message || 'Failed to save and test');
    } finally {
      setTestingType(null);
    }
  };

  const [isSyncingStorage, setIsSyncingStorage] = useState(false);

  const handleSyncStorage = async () => {
    try {
      setIsSyncingStorage(true);
      const res = await api.syncStorage();
      showToast(res.message);
      loadConfigs();
    } catch (err: any) {
      showToast(err.message || 'Failed to sync attachments');
    } finally {
      setIsSyncingStorage(false);
    }
  };

  const handleSetActive = async (type: 'local' | 's3' | 'gdrive') => {
    try {
      await api.setActiveStorageProvider(type);
      setActiveProvider(type);
      showToast(`Switched active storage provider to ${type.toUpperCase()}`);
      loadConfigs();
    } catch (err: any) {
      showToast(err.message || 'Failed to set active provider');
    }
  };

  const handleConnectGoogleDrive = async () => {
    if (!gdriveConfig.client_id?.trim()) {
      showToast('Please enter your Google Client ID first');
      return;
    }
    if (!gdriveConfig.client_secret?.trim() && !gdriveConfig.has_refresh_token) {
      showToast('Please enter your Google Client Secret first');
      return;
    }

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // Open popup immediately on user click to prevent browser popup blockers from blocking it
    const popup = window.open(
      'about:blank',
      'Google_Drive_Authorization',
      `toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,copyhistory=no,width=${width},height=${height},top=${top},left=${left}`
    );

    if (popup) {
      try {
        popup.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Connecting to Google Drive...</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #202124; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #2d2e30; border: 1px solid #5f6368; border-radius: 16px; padding: 32px; max-width: 400px; text-align: center; }
              .spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #4285f4; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
              @keyframes spin { to { transform: rotate(360deg); } }
              h3 { margin: 0 0 8px; font-size: 16px; }
              p { color: #9aa0a6; font-size: 13px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="spinner"></div>
              <h3>Connecting to Google...</h3>
              <p>Please wait while we redirect you to Google's sign-in screen.</p>
            </div>
          </body>
          </html>
        `);
        popup.document.close();
      } catch (e) {
        // Document write fallback
      }
    }

    try {
      setIsConnectingOAuth(true);
      const { url } = await api.getGoogleDriveAuthUrl(
        gdriveConfig.client_id.trim(),
        gdriveConfig.client_secret?.trim() || undefined,
        redirectUri
      );

      if (popup && !popup.closed) {
        popup.location.href = url;
      } else {
        // If popup was somehow blocked, navigate main window
        window.location.href = url;
      }

      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer);
          setIsConnectingOAuth(false);
          loadConfigs();
        }
      }, 1200);
    } catch (err: any) {
      if (popup && !popup.closed) popup.close();
      showToast(err.message || 'Failed to initiate Google Drive authorization');
      setIsConnectingOAuth(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    try {
      setIsDisconnecting(true);
      await api.disconnectGoogleDrive();
      showToast('Disconnected Google Drive account');
      loadConfigs();
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirectUri(true);
    showToast('Redirect URI copied to clipboard');
    setTimeout(() => setCopiedRedirectUri(false), 2500);
  };

  const handleCreateGoogleDriveFolder = async () => {
    try {
      setIsCreatingFolder(true);
      const res = await api.createGoogleDriveFolder('QuickNotes');
      setGdriveConfig(prev => ({ ...prev, folder_id: res.folderId }));
      showToast(`Folder "${res.folderName}" created in Google Drive!`);
      // Automatically test connection with the new folder ID
      await handleTestConnection('gdrive');
    } catch (err: any) {
      showToast(err.message || 'Failed to create Google Drive folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const isGDriveOAuthConnected = !!(gdriveConfig.connected_email || gdriveConfig.has_refresh_token || gdriveConfig.refresh_token);

  return (
    <div className="space-y-5 animate-fade-in">
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-xs font-medium animate-pulse flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span>Loading storage configurations...</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ========================================================================= */}
          {/* 1. Local Disk Storage Card                                                */}
          {/* ========================================================================= */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              activeProvider === 'local'
                ? 'border-amber-500/70 ring-1 ring-amber-500/30 bg-white dark:bg-[#252629] shadow-xs'
                : 'border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#3c4043]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                  <Folder className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      Local Disk Storage
                    </h3>
                    {activeProvider === 'local' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200/60 dark:border-emerald-900/60">
                        Active Provider
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Stores files inside the application filesystem (<code className="font-mono text-[11px]">./uploads</code>).
                  </p>
                </div>
              </div>


            </div>

            {testResults['local'] && (
              <div
                className={`mt-3 p-2.5 px-3 rounded-lg text-xs flex items-center gap-2 ${
                  testResults['local'].success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/80 dark:border-red-800/80'
                }`}
              >
                {testResults['local'].success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="flex-1 font-medium">{testResults['local'].message}</span>
                {testResults['local'].latencyMs !== undefined && (
                  <span className="text-[10px] opacity-75 font-mono">({testResults['local'].latencyMs}ms)</span>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3c4043] flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={testingType === 'local'}
                onClick={() => handleTestConnection('local')}
                className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] hover:bg-gray-50 dark:hover:bg-[#323438] text-gray-700 dark:text-gray-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{testingType === 'local' ? 'Testing...' : 'Test Access'}</span>
              </button>
              {activeProvider !== 'local' && (
                <button
                  type="button"
                  onClick={() => handleSetActive('local')}
                  className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Set Active</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. Amazon S3 / S3-Compatible Storage Card                                 */}
          {/* ========================================================================= */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              activeProvider === 's3'
                ? 'border-amber-500/70 ring-1 ring-amber-500/30 bg-white dark:bg-[#252629] shadow-xs'
                : 'border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#3c4043]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      Amazon S3 / S3-Compatible Cloud Storage
                    </h3>
                    {activeProvider === 's3' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200/60 dark:border-emerald-900/60">
                        Active Provider
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Compatible with AWS S3, Cloudflare R2, Backblaze B2, MinIO, Wasabi, and DigitalOcean Spaces.
                  </p>
                </div>
              </div>


            </div>

            {testResults['s3'] && (
              <div
                className={`mt-3 p-2.5 px-3 rounded-lg text-xs flex items-center gap-2 ${
                  testResults['s3'].success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/80 dark:border-red-800/80'
                }`}
              >
                {testResults['s3'].success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="flex-1 font-medium">{testResults['s3'].message}</span>
                {testResults['s3'].latencyMs !== undefined && (
                  <span className="text-[10px] opacity-75 font-mono">({testResults['s3'].latencyMs}ms)</span>
                )}
              </div>
            )}

            {/* S3 Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 text-xs">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Bucket Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. my-saved-notes-bucket"
                  value={s3Config.bucket_name}
                  onChange={(e) => setS3Config({ ...s3Config, bucket_name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Region *
                </label>
                <input
                  type="text"
                  placeholder="e.g. us-east-1, auto, eu-central-1"
                  value={s3Config.region}
                  onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Endpoint URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://<account>.r2.cloudflarestorage.com"
                  value={s3Config.endpoint_url}
                  onChange={(e) => setS3Config({ ...s3Config, endpoint_url: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Custom CDN / Public Domain (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://cdn.example.com"
                  value={s3Config.custom_domain}
                  onChange={(e) => setS3Config({ ...s3Config, custom_domain: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Access Key ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. AKIAIOSFODNN7EXAMPLE"
                  value={s3Config.access_key_id}
                  onChange={(e) => setS3Config({ ...s3Config, access_key_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Secret Access Key *
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={s3Config.secret_access_key}
                  onChange={(e) => setS3Config({ ...s3Config, secret_access_key: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3c4043] flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={testingType === 's3'}
                onClick={() => handleTestConnection('s3')}
                className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] hover:bg-gray-50 dark:hover:bg-[#323438] text-gray-700 dark:text-gray-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Zap className="w-3.5 h-3.5 text-blue-500" />
                <span>{testingType === 's3' ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveConfig('s3')}
                className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Config</span>
              </button>

              {activeProvider !== 's3' && (
                <button
                  type="button"
                  onClick={() => handleSetActive('s3')}
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Set Active</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. Google Drive Storage Card (OAuth 2.1 & Service Account)                 */}
          {/* ========================================================================= */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              activeProvider === 'gdrive'
                ? 'border-amber-500/70 ring-1 ring-amber-500/30 bg-white dark:bg-[#252629] shadow-xs'
                : 'border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#3c4043]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      Google Drive Storage
                    </h3>
                    {activeProvider === 'gdrive' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200/60 dark:border-emerald-900/60">
                        Active Provider
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Direct cloud integration via Google Drive API v3 (OAuth 2.1 or Service Account).
                  </p>
                </div>
              </div>


            </div>

            {testResults['gdrive'] && (
              <div
                className={`mt-3 p-2.5 px-3 rounded-lg text-xs flex items-center gap-2 ${
                  testResults['gdrive'].success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200/80 dark:border-red-800/80'
                }`}
              >
                {testResults['gdrive'].success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="flex-1 font-medium">{testResults['gdrive'].message}</span>
                {testResults['gdrive'].latencyMs !== undefined && (
                  <span className="text-[10px] opacity-75 font-mono">({testResults['gdrive'].latencyMs}ms)</span>
                )}
              </div>
            )}

            {/* Google Drive Mode Switcher Tabs */}
            <div className="pt-4">
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100/90 dark:bg-[#1a1b1e] border border-gray-200/80 dark:border-[#3c4043] mb-4">
                <button
                  type="button"
                  onClick={() => setGdriveAuthMode('oauth')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    gdriveAuthMode === 'oauth'
                      ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>OAuth 2.1 (Google Sign-In)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGdriveAuthMode('service_account')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    gdriveAuthMode === 'service_account'
                      ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-purple-500" />
                  <span>Service Account JSON</span>
                </button>
              </div>

              {/* TAB 1: OAuth 2.1 Mode */}
              {gdriveAuthMode === 'oauth' && (
                <div className="space-y-3.5 text-xs">
                  {/* Connected Status Card */}
                  {isGDriveOAuthConnected && (
                    <div className="p-3.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#202124] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-gray-900 dark:text-white">
                              {gdriveConfig.connected_email || 'Connected Google Drive Account'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                              Connected
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            Attachments upload to your personal Google Drive storage.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isDisconnecting}
                        onClick={handleDisconnectGoogleDrive}
                        className="h-8 px-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-[#202124] hover:bg-red-50 dark:hover:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
                      </button>
                    </div>
                  )}

                  {/* Redirect URI Box */}
                  <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200/80 dark:border-[#3c4043] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500 flex-shrink-0">
                        Redirect URI:
                      </span>
                      <code className="text-[11px] font-mono text-gray-700 dark:text-gray-300 truncate select-all">
                        {redirectUri}
                      </code>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyRedirectUri}
                        className="h-8 px-3 rounded-lg bg-white dark:bg-[#28292c] border border-gray-200 dark:border-[#3c4043] hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                      >
                        {copiedRedirectUri ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedRedirectUri ? 'Copied' : 'Copy'}</span>
                      </button>

                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:underline flex-shrink-0"
                      >
                        <span>Cloud Console</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Client ID */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Client ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12345-abc.apps.googleusercontent.com"
                      value={gdriveConfig.client_id}
                      onChange={(e) => setGdriveConfig({ ...gdriveConfig, client_id: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  {/* Client Secret */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Client Secret
                      </label>
                      <span className="text-[11px] text-gray-400">Stored — leave blank to keep.</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showClientSecret ? 'text' : 'password'}
                        placeholder="•••••••• (set) or GOCSPX-..."
                        value={gdriveConfig.client_secret}
                        onChange={(e) => setGdriveConfig({ ...gdriveConfig, client_secret: e.target.value })}
                        className={`w-full h-9 pl-3 pr-9 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border ${
                          isClientSecretClientId
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-200 dark:border-[#3c4043] focus:border-amber-500'
                        } text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientSecret(!showClientSecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                        title={showClientSecret ? 'Hide secret' : 'Show secret'}
                      >
                        {showClientSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Refresh Token */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Refresh Token
                      </label>
                      <span className="text-[11px] text-gray-400">
                        {gdriveConfig.has_refresh_token ? '•••••••• (stored)' : 'Paste 1//... token'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showRefreshToken ? 'text' : 'password'}
                        placeholder={gdriveConfig.has_refresh_token ? '•••••••• (stored)' : '1//04...'}
                        value={gdriveConfig.refresh_token}
                        onChange={(e) => setGdriveConfig({ ...gdriveConfig, refresh_token: e.target.value })}
                        className={`w-full h-9 pl-3 pr-9 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border ${
                          isRefreshTokenClientSecret
                            ? 'border-amber-500 focus:border-amber-500'
                            : 'border-gray-200 dark:border-[#3c4043] focus:border-amber-500'
                        } text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRefreshToken(!showRefreshToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                        title={showRefreshToken ? 'Hide token' : 'Show token'}
                      >
                        {showRefreshToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Folder ID */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Destination Folder ID
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 1EHupLaI-Q8SbuhTa... (or leave as 'root')"
                        value={gdriveConfig.folder_id}
                        onChange={(e) => setGdriveConfig({ ...gdriveConfig, folder_id: e.target.value })}
                        className="flex-1 h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                      <button
                        type="button"
                        disabled={isCreatingFolder || !isGDriveOAuthConnected}
                        onClick={handleCreateGoogleDriveFolder}
                        className="h-9 px-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                      >
                        {isCreatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Folder className="w-3.5 h-3.5" />}
                        <span>{isCreatingFolder ? 'Creating...' : 'Create Folder'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Toolbar */}
                  <div className="pt-2 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isConnectingOAuth || !gdriveConfig.client_id?.trim()}
                      onClick={handleConnectGoogleDrive}
                      className="h-9 px-4 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#28292c] hover:bg-gray-50 dark:hover:bg-[#323438] text-gray-800 dark:text-gray-200 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>{isConnectingOAuth ? 'Authorizing...' : '1-Click Browser Login'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={testingType === 'gdrive'}
                      onClick={handleSaveAndTestGoogleDrive}
                      className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {testingType === 'gdrive' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{testingType === 'gdrive' ? 'Testing...' : 'Save & Test Connection'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Service Account JSON Mode */}
              {gdriveAuthMode === 'service_account' && (
                <div className="space-y-3.5 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Service Account Credentials
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowJsonAutoFill(!showJsonAutoFill)}
                      className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      {showJsonAutoFill ? 'Hide JSON Helper' : 'Auto-Fill from .json key file'}
                    </button>
                  </div>

                  {showJsonAutoFill && (
                    <div className="p-3.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/60 space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-purple-900 dark:text-purple-200 font-medium">
                          Upload key file or paste JSON:
                        </span>
                        <label className="h-8 px-3 rounded-lg bg-white dark:bg-[#202124] border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer">
                          <Upload className="w-3 h-3" />
                          <span>Choose .json</span>
                          <input
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const parsed = JSON.parse(event.target?.result as string);
                                    if (parsed.client_email && parsed.private_key) {
                                      setGdriveConfig((prev) => ({
                                        ...prev,
                                        client_email: parsed.client_email,
                                        private_key: parsed.private_key,
                                      }));
                                      showToast('Populated Client Email & Private Key');
                                      setShowJsonAutoFill(false);
                                      setPastedJson('');
                                    } else {
                                      showToast('JSON missing client_email or private_key');
                                    }
                                  } catch (err) {
                                    showToast('Invalid JSON file format');
                                  }
                                };
                                reader.readAsText(file);
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      <textarea
                        rows={3}
                        placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                        value={pastedJson}
                        onChange={(e) => setPastedJson(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-white dark:bg-[#1a1b1e] border border-purple-200/80 dark:border-purple-800/80 font-mono text-[11px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Client Email
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. my-app@project.iam.gserviceaccount.com"
                      value={gdriveConfig.client_email}
                      onChange={(e) => setGdriveConfig({ ...gdriveConfig, client_email: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Private Key
                    </label>
                    <textarea
                      rows={3}
                      placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                      value={gdriveConfig.private_key}
                      onChange={(e) => setGdriveConfig({ ...gdriveConfig, private_key: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-[11px] focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all leading-normal"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Google Drive Folder ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1a2b3c4d... (or 'root')"
                      value={gdriveConfig.folder_id}
                      onChange={(e) => setGdriveConfig({ ...gdriveConfig, folder_id: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3c4043] flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={testingType === 'gdrive'}
                onClick={() => handleTestConnection('gdrive')}
                className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] hover:bg-gray-50 dark:hover:bg-[#323438] text-gray-700 dark:text-gray-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Zap className="w-3.5 h-3.5 text-purple-500" />
                <span>{testingType === 'gdrive' ? 'Testing...' : 'Test Connection'}</span>
              </button>

              {activeProvider === 'gdrive' && (
                <button
                  type="button"
                  disabled={isSyncingStorage}
                  onClick={handleSyncStorage}
                  className="h-8 px-3 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100/60 text-purple-700 dark:text-purple-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  title="Upload existing local attachments to Google Drive folder"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStorage ? 'animate-spin' : ''}`} />
                  <span>{isSyncingStorage ? 'Syncing...' : 'Sync Local Files'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSaveConfig('gdrive')}
                className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Config</span>
              </button>

              {activeProvider !== 'gdrive' && (
                <button
                  type="button"
                  onClick={() => handleSetActive('gdrive')}
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Set Active</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageSettings;
