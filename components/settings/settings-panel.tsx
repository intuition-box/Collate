'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getAddress, isAddress } from 'viem';

import type { AdminAppSettings, AdminSettingsResponse, PublicSettingsResponse } from '@/types/settings';

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
  const [settings, setSettings] = useState<AdminAppSettings | null>(null);
  const [walletInput, setWalletInput] = useState('');
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
      queryClient.setQueryData<PublicSettingsResponse>(['public-settings'], { settings: {
        showActivityInNav: payload.settings.showActivityInNav,
        showDiscoverInNav: payload.settings.showDiscoverInNav,
      } });
      await queryClient.invalidateQueries({ queryKey: ['creation-limits'] });
      setMessage('Settings saved. Navigation changes are live; new limits apply before the next wallet prompt.');
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

  function addWallet() {
    const candidate = walletInput.trim();
    if (!isAddress(candidate)) {
      setError('Enter a valid Ethereum wallet address.');
      return;
    }
    const wallet = getAddress(candidate);
    if (settings?.allowlistedWallets.some((item) => item.toLowerCase() === wallet.toLowerCase())) {
      setError('That wallet is already on the allowlist.');
      return;
    }
    setSettings((current) => current ? { ...current, allowlistedWallets: [...current.allowlistedWallets, wallet] } : current);
    setWalletInput('');
    setError(null);
    setMessage(null);
  }

  if (sessionState === 'loading') {
    return <div className="h-72 animate-pulse rounded-[1.5rem] border border-line bg-white/60" aria-label="Loading settings" />;
  }

  if (sessionState === 'signed_out') {
    return (
      <section className="mx-auto max-w-xl rounded-[1.5rem] border border-line/90 bg-white/76 p-6 sm:p-8">
        <p className="text-[0.68rem] uppercase tracking-terminal text-muted">Private access</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Open settings.</h1>
        <p className="mt-4 text-sm leading-7 text-muted">Enter the admin password to manage Collate settings.</p>

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
          {error ? <p className="text-sm text-dangerInk" role="alert">{error}</p> : null}
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
            aria-label="Show Activity in navigation"
            onClick={() => setSettings((current) => current ? { ...current, showActivityInNav: !current.showActivityInNav } : current)}
            disabled={isSubmitting}
            className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${
              settings?.showActivityInNav ? 'border-accent bg-accent' : 'border-line bg-white'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute left-1 top-1 h-6 w-6 rounded-full transition-[transform,background-color] motion-reduce:transition-none ${
                settings?.showActivityInNav ? 'translate-x-6 bg-black' : 'translate-x-0 bg-ink'
              }`}
            />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-5 rounded-[1.25rem] border border-line/80 bg-paper/45 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-base font-medium text-ink">Discover in navigation</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Show Discover in the primary navigation. The page stays available by direct link when this is off.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings?.showDiscoverInNav ?? false}
            aria-label="Show Discover in navigation"
            onClick={() => setSettings((current) => current ? { ...current, showDiscoverInNav: !current.showDiscoverInNav } : current)}
            disabled={isSubmitting}
            className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${
              settings?.showDiscoverInNav ? 'border-accent bg-accent' : 'border-line bg-white'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute left-1 top-1 h-6 w-6 rounded-full transition-[transform,background-color] motion-reduce:transition-none ${
                settings?.showDiscoverInNav ? 'translate-x-6 bg-black' : 'translate-x-0 bg-ink'
              }`}
            />
          </button>
        </div>
        <div className="mt-6 rounded-[1.25rem] border border-line/80 bg-paper/45 p-5 sm:p-6">
          <h2 className="text-lg font-medium text-ink">Batch limits</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Set the number of atoms or list entries allowed in one transaction on Mainnet and Testnet.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {([
              ['atomLimit', 'Normal atoms', 100],
              ['listLimit', 'Normal list entries', 100],
              ['privilegedLimit', 'Allowlisted wallets', 150],
            ] as const).map(([key, label, max]) => (
              <label key={key} className="block text-sm text-ink">
                {label}
                <input
                  type="number"
                  min={2}
                  max={max}
                  step={1}
                  value={settings?.[key] ?? ''}
                  onChange={(event) => setSettings((current) => current ? { ...current, [key]: event.target.value === '' ? NaN : Number(event.target.value) } : current)}
                  className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-ink outline-none focus:border-ink/35"
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">Normal limits: 2 to 100. Allowlisted limit: up to 150 and at least as high as both normal limits. These are Collate limits, not protocol limits.</p>
        </div>
        <div className="mt-6 rounded-[1.25rem] border border-line/80 bg-paper/45 p-5 sm:p-6">
          <h2 className="text-lg font-medium text-ink">Wallet allowlist</h2>
          <p className="mt-2 text-sm leading-6 text-muted">These wallets receive the higher limit for both creation paths.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={walletInput}
              onChange={(event) => setWalletInput(event.target.value)}
              placeholder="0x... wallet address"
              aria-label="Wallet address to allowlist"
              className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink outline-none focus:border-ink/35"
            />
            <button type="button" onClick={addWallet} disabled={!walletInput.trim()} className="rounded-full border border-ink px-5 py-3 text-sm text-ink disabled:opacity-45">Add wallet</button>
          </div>
          {settings?.allowlistedWallets.length ? (
            <ul className="mt-5 divide-y divide-line/75 border-t border-line/75">
              {settings.allowlistedWallets.map((wallet) => (
                <li key={wallet} className="flex min-w-0 items-center justify-between gap-3 py-3">
                  <span className="min-w-0 break-all font-mono text-xs text-ink">{wallet}</span>
                  <button type="button" onClick={() => setSettings((current) => current ? { ...current, allowlistedWallets: current.allowlistedWallets.filter((item) => item !== wallet) } : current)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-ink" aria-label={`Remove ${wallet}`}>Remove</button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-muted">No wallets added yet.</p>}
          <p className="mt-4 text-xs text-muted">Add or remove wallets here, then select Save changes to apply the allowlist.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-line/75 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite">
          {message ? <p className="text-sm text-successInk">{message}</p> : null}
          {error ? <p className="text-sm text-dangerInk" role="alert">{error}</p> : null}
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
