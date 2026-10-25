import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@ua/api-client';
import { useState, type FormEvent } from 'react';

import { api } from '../lib/api';

export function LoginScreen({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');
  const unconfigured = error instanceof ApiError && error.code === 'admin_unconfigured';
  const mutation = useMutation({
    mutationFn: (value: string) => api.login(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (token.trim()) mutation.mutate(token.trim());
  }

  if (unconfigured) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="brand-mark"><span /></div>
            <div><h1>Verwaltung</h1><p>University Assistant</p></div>
          </div>
          <h2>Dashboard nicht konfiguriert</h2>
          <p className="lead">Die Verwaltung bleibt absichtlich gesperrt, solange kein Operator-Token gesetzt ist.</p>
          <ol className="auth-steps"><li>Trage einen langen Zufallswert in <code>.env</code> ein:</li></ol>
          <pre className="auth-code">DASHBOARD_TOKEN=ein-langes-zufaelliges-token</pre>
          <p className="hint">Danach den Server neu starten und diese Seite neu laden. Jede <code>/v1/admin/*</code>-Route antwortet ohne Token mit <code>503</code>.</p>
          {onRetry ? <button className="btn secondary" type="button" onClick={onRetry}>Erneut versuchen</button> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <div className="brand-mark"><span /></div>
          <div><h1>Verwaltung</h1><p>University Assistant</p></div>
        </div>
        <p className="lead">Konten, Sitzungen, Plattformen, C@MPUS-Daten und Betriebszustand einsehen und verwalten.</p>
        <label className="field stack-field">
          Dashboard-Token
          <input
            type="password"
            autoComplete="current-password"
            placeholder="DASHBOARD_TOKEN"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <button className="btn" type="submit" disabled={mutation.isPending || !token.trim()}>
          <span className="icon" aria-hidden="true" />
          {mutation.isPending ? 'Anmelden …' : 'Anmelden'}
        </button>
        <div className="auth-error" role="alert">{mutation.error instanceof Error ? mutation.error.message : ''}</div>
        <p className="hint">Das Token wird ausschließlich als <code>HttpOnly</code>-Cookie gespeichert und nie in der Seite abgelegt.</p>
      </form>
    </div>
  );
}
