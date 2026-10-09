import { AppItem, AppVersion, Review, CmsSettings, CmsAuditLog } from '../types';

const API_BASE = '/api/v1';

export async function apiFetchApps(params?: { category?: string; type?: string; search?: string; status?: string }): Promise<AppItem[]> {
  try {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All') query.set('category', params.category);
    if (params?.type && params.type !== 'ALL') query.set('type', params.type);
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);

    const res = await fetch(`${API_BASE}/apps?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.apps || [];
  } catch (err) {
    console.warn('apiFetchApps network issue, using local storage fallback:', err);
    return [];
  }
}

export async function apiFetchAppById(id: string): Promise<AppItem | null> {
  try {
    const res = await fetch(`${API_BASE}/apps/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiUploadApk(formData: FormData): Promise<AppItem> {
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.app;
}

export async function apiSubmitReview(appId: string, review: { userName: string; rating: number; comment: string; versionCode: number }): Promise<AppItem> {
  const res = await fetch(`${API_BASE}/apps/${appId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review)
  });
  if (!res.ok) throw new Error('Failed to submit review');
  const data = await res.json();
  return data.app;
}

export async function apiCheckUpdates(packages: { packageName: string; versionCode: number }[]): Promise<any[]> {
  const res = await fetch(`${API_BASE}/updates/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packages })
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.updates || [];
}

// Admin APIs
export async function apiAdminLogin(email: string): Promise<{ token: string; email: string }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Authentication denied');
  }
  return await res.json();
}

export async function apiFetchAdminApps(token?: string, email?: string): Promise<AppItem[]> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (email) headers['x-admin-email'] = email;

  const res = await fetch(`${API_BASE}/admin/apps`, { headers });
  if (!res.ok) throw new Error('Failed to fetch admin apps');
  const data = await res.json();
  return data.apps || [];
}

export async function apiUpdateAdminApp(id: string, updates: Partial<AppItem>, token?: string, email?: string): Promise<AppItem> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (email) headers['x-admin-email'] = email;

  const res = await fetch(`${API_BASE}/admin/apps/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update app');
  const data = await res.json();
  return data.app;
}

export async function apiDeleteAdminApp(id: string, token?: string, email?: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (email) headers['x-admin-email'] = email;

  const res = await fetch(`${API_BASE}/admin/apps/${id}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error('Failed to delete app');
}

export async function apiFetchAdminSettings(token?: string, email?: string): Promise<CmsSettings> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (email) headers['x-admin-email'] = email;

  const res = await fetch(`${API_BASE}/admin/settings`, { headers });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return await res.json();
}

export async function apiSaveAdminSettings(settings: CmsSettings, token?: string, email?: string): Promise<CmsSettings> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (email) headers['x-admin-email'] = email;

  const res = await fetch(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to save settings');
  const data = await res.json();
  return data.settings;
}

export async function apiFetchAdminAuditLogs(token?: string, email?: string): Promise<CmsAuditLog[]> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (email) headers['x-admin-email'] = email;

  const res = await fetch(`${API_BASE}/admin/audit-logs`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.auditLogs || [];
}

export async function apiFetchStorageStatus(): Promise<{
  provider: string;
  configured: boolean;
  bucket: string | null;
  region: string;
  endpointConfigured: boolean;
  hasAccessKey: boolean;
  hasSecretKey: boolean;
}> {
  try {
    const res = await fetch(`${API_BASE}/storage/status`);
    if (!res.ok) throw new Error('Failed to fetch storage status');
    return await res.json();
  } catch {
    return {
      provider: 'local',
      configured: false,
      bucket: null,
      region: 'auto',
      endpointConfigured: false,
      hasAccessKey: false,
      hasSecretKey: false
    };
  }
}

