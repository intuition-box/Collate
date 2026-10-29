'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getAddress, isAddress } from 'viem';

import { isSettingsSectionDirty, mergeSavedSettings, pickSettingsSection, type SettingsSection } from '@/lib/settings/sections';
import type { AdminAppSettings, AdminSettingsResponse, PublicSettingsResponse } from '@/types/settings';

type SessionState = 'loading' | 'signed_out' | 'signed_in';
type SectionFeedback = { kind: 'success' | 'error'; text: string };

const SECTIONS: { id: SettingsSection; label: string; mobileLabel: string; description: string; saveLabel: string }[] = [
  { id: 'visibility', label: 'Visibility', mobileLabel: 'Visibility', description: 'Choose which community pages appear in the main navigation.', saveLabel: 'Save visibility' },
  { id: 'limits', label: 'Batch limits', mobileLabel: 'Limits', description: 'Set how many atoms or list entries can be created in one transaction.', saveLabel: 'Save limits' },
  { id: 'allowlist', label: 'Wallet allowlist', mobileLabel: 'Allowlist', description: 'Give selected wallets access to the higher batch limit.', saveLabel: 'Save allowlist' },
];

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
  const [savedSettings, setSavedSettings] = useState<AdminAppSettings | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>('visibility');
  const [feedback, setFeedback] = useState<Partial<Record<SettingsSection, SectionFeedback>>>({});
  const [walletInput, setWalletInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    setError(null);
    const response = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (response.status === 401) {
      setSessionState('signed_out');
      setSettings(null);
      setSavedSettings(null);
      return;
    }

    const payload = await readResponse<AdminSettingsResponse>(response);
    setSettings(payload.settings);
    setSavedSettings(payload.settings);
    setFeedback({});
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

  async function saveSection(section: SettingsSection) {
    if (!settings || !savedSettings) return;
    setIsSubmitting(true);
    setFeedback((current) => ({ ...current, [section]: undefined }));

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, values: pickSettingsSection(settings, section) }),
      });
      const payload = await readResponse<AdminSettingsResponse>(response);
      setSettings((current) => current ? mergeSavedSettings(current, savedSettings, payload.settings, section) : payload.settings);
      setSavedSettings(payload.settings);
      if (section === 'visibility') {
        queryClient.setQueryData<PublicSettingsResponse>(['public-settings'], { settings: {
          showActivityInNav: payload.settings.showActivityInNav,
          showDiscoverInNav: payload.settings.showDiscoverInNav,
        } });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['creation-limits'] });
      }
      setFeedback((current) => ({ ...current, [section]: { kind: 'success', text: `${SECTIONS.find((item) => item.id === section)?.label} saved.` } }));
    } catch (caughtError) {
      setFeedback((current) => ({ ...current, [section]: { kind: 'error', text: caughtError instanceof Error ? caughtError.message : 'Settings could not be saved.' } }));
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeSectionSettings(section: SettingsSection, update: (current: AdminAppSettings) => AdminAppSettings) {
    setSettings((current) => current ? update(current) : current);
    setFeedback((current) => ({ ...current, [section]: undefined }));
  }

  async function signOut() {
    setIsSubmitting(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      setSettings(null);
      setSavedSettings(null);
      setFeedback({});
      setError(null);
      setSessionState('signed_out');
      setIsSubmitting(false);
    }
  }

  function addWallet() {
    const candidate = walletInput.trim();
    if (!isAddress(candidate)) {
      setFeedback((current) => ({ ...current, allowlist: { kind: 'error', text: 'Enter a valid Ethereum wallet address.' } }));
      return;
    }
    const wallet = getAddress(candidate);
    if (settings?.allowlistedWallets.some((item) => item.toLowerCase() === wallet.toLowerCase())) {
      setFeedback((current) => ({ ...current, allowlist: { kind: 'error', text: 'That wallet is already on the allowlist.' } }));
      return;
    }
    changeSectionSettings('allowlist', (current) => ({ ...current, allowlistedWallets: [...current.allowlistedWallets, wallet] }));
    setWalletInput('');
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

  const currentSection = SECTIONS.find((item) => item.id === activeSection)!;
  const isDirty = !!settings && !!savedSettings && isSettingsSectionDirty(settings, savedSettings, activeSection);
  const currentFeedback = feedback[activeSection];

  return (
    <div className="mx-auto max-w-6xl min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-line/75 pb-7">
        <div>
          <p className="text-xs uppercase tracking-terminal text-muted">Admin settings</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Control what ships.</h1>
          <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted">Choose which pages appear in navigation and set the limits for each batch.</p>
        </div>
        <button type="button" onClick={() => void signOut()} disabled={isSubmitting} className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-ink/25 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">
          Sign out
        </button>
      </header>

      <div className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings sections" className="min-w-0 rounded-2xl border border-line/90 bg-white/72 p-2 lg:sticky lg:top-6">
          <div className="grid grid-cols-3 gap-1 lg:grid-cols-1">
            {SECTIONS.map((item) => {
              const active = activeSection === item.id;
              const hasDraft = !!settings && !!savedSettings && isSettingsSectionDirty(settings, savedSettings, item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-center text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:justify-between lg:px-4 lg:text-left lg:text-sm ${active ? 'bg-ink text-paper' : 'text-ink hover:bg-paper/70'}`}
                >
                  <span className="lg:hidden">{item.mobileLabel}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                  {hasDraft ? <span className="h-2 w-2 shrink-0 rounded-full bg-warning" title="Unsaved changes"><span className="sr-only">Unsaved changes</span></span> : null}
                </button>
              );
            })}
          </div>
        </nav>

        <section aria-labelledby="settings-section-title" className="min-w-0 rounded-2xl border border-line/90 bg-white/76 p-5 sm:p-8">
          <div className="border-b border-line/75 pb-6">
            <h2 id="settings-section-title" className="text-2xl font-semibold tracking-[-0.04em] text-ink sm:text-3xl">{currentSection.label}</h2>
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-muted">{currentSection.description}</p>
          </div>

          {activeSection === 'visibility' ? (
            <div className="mt-6 divide-y divide-line/75 rounded-2xl border border-line/80 bg-paper/40 px-5 sm:px-6">
              {([
                ['showActivityInNav', 'Activity in navigation', 'Show the community activity and leaderboard page in the public navigation.'],
                ['showDiscoverInNav', 'Discover in navigation', 'Show Discover in the public navigation. The page remains available by direct link when hidden.'],
              ] as const).map(([key, label, description]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink sm:text-base">{label}</p>
                    <p className="mt-1 text-pretty text-xs leading-5 text-muted sm:text-sm">{description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings?.[key] ?? false}
                    aria-label={`Show ${key === 'showActivityInNav' ? 'Activity' : 'Discover'} in navigation`}
                    onClick={() => changeSectionSettings('visibility', (current) => ({ ...current, [key]: !current[key] }))}
                    disabled={isSubmitting}
                    className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${settings?.[key] ? 'border-accent bg-accent' : 'border-line bg-white'}`}
                  >
                    <span aria-hidden="true" className={`absolute left-1 top-1 h-6 w-6 rounded-full transition-transform motion-reduce:transition-none ${settings?.[key] ? 'translate-x-6 bg-black' : 'translate-x-0 bg-ink'}`} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {activeSection === 'limits' ? (
            <div className="mt-6 rounded-2xl border border-line/80 bg-paper/40 p-5 sm:p-6">
              <p className="text-sm leading-6 text-muted">These limits apply on Mainnet and Testnet. The higher limit applies only to allowlisted wallets.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {([
                  ['atomLimit', 'Normal atoms', 100],
                  ['listLimit', 'Normal list entries', 100],
                  ['privilegedLimit', 'Allowlisted wallets', 150],
                ] as const).map(([key, label, max]) => (
                  <label key={key} className="block text-sm font-medium text-ink">
                    {label}
                    <input
                      type="number"
                      min={2}
                      max={max}
                      step={1}
                      value={settings && Number.isNaN(settings[key]) ? '' : settings?.[key] ?? ''}
                      onChange={(event) => changeSectionSettings('limits', (current) => ({ ...current, [key]: event.target.value === '' ? NaN : Number(event.target.value) }))}
                      disabled={isSubmitting}
                      className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-ink outline-none focus-visible:border-ink/35 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted">Normal limits: 2 to 100. Allowlisted limit: up to 150 and no lower than either normal limit. These are Collate limits, not protocol limits.</p>
            </div>
          ) : null}

          {activeSection === 'allowlist' ? (
            <div className="mt-6 rounded-2xl border border-line/80 bg-paper/40 p-5 sm:p-6">
              <p className="text-sm leading-6 text-muted">Wallets on this list receive the privileged limit for both atoms and list entries.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={walletInput}
                  onChange={(event) => setWalletInput(event.target.value)}
                  placeholder="0x... wallet address"
                  aria-label="Wallet address to allowlist"
                  disabled={isSubmitting}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink outline-none focus-visible:border-ink/35 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                />
                <button type="button" onClick={addWallet} disabled={isSubmitting || !walletInput.trim()} className="rounded-full border border-ink px-5 py-3 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45">Add wallet</button>
              </div>
              {settings?.allowlistedWallets.length ? (
                <ul className="mt-5 divide-y divide-line/75 border-t border-line/75">
                  {settings.allowlistedWallets.map((wallet) => (
                    <li key={wallet} className="flex min-w-0 items-center justify-between gap-3 py-3">
                      <span className="min-w-0 break-all font-mono text-xs text-ink">{wallet}</span>
                      <button type="button" onClick={() => changeSectionSettings('allowlist', (current) => ({ ...current, allowlistedWallets: current.allowlistedWallets.filter((item) => item !== wallet) }))} disabled={isSubmitting} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50" aria-label={`Remove ${wallet}`}>Remove</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-5 text-sm text-muted">No wallets added yet.</p>}
              <p className="mt-4 text-xs text-muted">Add or remove wallets, then save this section to apply the allowlist.</p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-4 border-t border-line/75 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite">
              {currentFeedback ? <p className={`text-sm ${currentFeedback.kind === 'error' ? 'text-dangerInk' : 'text-successInk'}`} role={currentFeedback.kind === 'error' ? 'alert' : undefined}>{currentFeedback.text}</p>
                : isDirty ? <p className="text-sm text-warningInk">Unsaved changes in {currentSection.label.toLowerCase()}.</p>
                  : <p className="text-sm text-muted">No unsaved changes.</p>}
            </div>
            <button
              type="button"
              onClick={() => void saveSection(activeSection)}
              disabled={isSubmitting || !isDirty}
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSubmitting ? 'Saving...' : currentSection.saveLabel}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
