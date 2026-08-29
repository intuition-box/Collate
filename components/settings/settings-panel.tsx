'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import type { AdminSettingsResponse, PublicAppSettings, PublicSettingsResponse } from '@/types/settings';

type SessionState = 'loading' | 'signed_out' | 'signed_in';

async function readResponse<ResponseType>(response: Response): Promise<ResponseType> {
  const payload = (await response.json()) as ResponseType & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'The request could not be completed.');
  return payload;
}

export function SettingsPanel() {
  const queryClient = useQueryClient();
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState<PublicAppSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    setError(null);
    const response = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (response.status === 401) {
      setSessionState('signed_out');
      setSettings(null);
      return;
    }

    const payload = await readResponse<AdminSettingsResponse>(response);
    setSettings(payload.settings);
    setSessionState('signed_in');
  }

  useEffect(() => {
    void loadSettings().catch((caughtError) => {
      setSessionState('signed_out');
      setError(caughtError instanceof Error ? caughtError.message : 'Settings could not be loaded.');
    });
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      await readResponse<{ authenticated: true }>(response);
      setPassword('');
      await loadSettings();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Sign-in failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await readResponse<AdminSettingsResponse>(response);
      setSettings(payload.settings);
      queryClient.setQueryData<PublicSettingsResponse>(['public-settings'], { settings: payload.settings });
      setMessage('Settings saved. The public navigation has been updated.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Settings could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    setIsSubmitting(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      setSettings(null);
      setMessage(null);
      setError(null);
      setSessionState('signed_out');
      setIsSubmitting(false);
    }
  }

  if (sessionState === 'loading') {
    return <div className="h-72 animate-pulse rounded-[1.5rem] border border-line bg-white/60" aria-label="Loading settings" />;
  }

  if (sessionState === 'signed_out') {
    return (
      <section className="mx-auto max-w-xl rounded-[1.5rem] border border-line/90 bg-white/76 p-6 sm:p-8">
        <p className="text-[0.68rem] uppercase tracking-terminal text-muted">Private access</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Open settings.</h1>
        <p className="mt-4 text-sm leading-7 text-muted">Enter the admin password to manage Collate’s public feature controls.</p>

        <form onSubmit={signIn} className="mt-8 space-y-4">
          <label className="block text-sm text-ink" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            className="w-full rounded-[1rem] border border-line bg-paper/45 px-4 py-3 text-ink outline-none transition-colors focus:border-ink/35"
          />
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting || !password}
            className="w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting ? 'Checking...' : 'Sign in'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-[1.6rem] border border-line/90 bg-white/76 p-6 sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-line/75 pb-7">
        <div>
          <p className="text-[0.68rem] uppercase tracking-terminal text-muted">Admin settings</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Control what ships.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">Change lightweight public controls without editing code or triggering a deployment.</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={isSubmitting}
          className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-ink/25 hover:text-ink disabled:opacity-50"
        >
          Sign out
        </button>
      </div>

      <div className="py-8">
        <div className="flex flex-col gap-5 rounded-[1.25rem] border border-line/80 bg-paper/45 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-base font-medium text-ink">Activity in navigation</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Show the community activity and leaderboard page in the primary public navigation.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings?.showActivityInNav ?? false}
            onClick={() => setSettings((current) => current ? { ...current, showActivityInNav: !current.showActivityInNav } : current)}
            className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
              settings?.showActivityInNav ? 'border-accent bg-accent' : 'border-line bg-white'
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-ink transition-transform ${
                settings?.showActivityInNav ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
            <span className="sr-only">Toggle Activity navigation visibility</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-line/75 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite">
          {message ? <p className="text-sm text-success">{message}</p> : null}
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={isSubmitting || !settings}
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </section>
  );
}
