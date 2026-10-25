import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@ua/api-client';
import { Button, Card, ErrorState, Field, Input, ThemeProvider } from '@ua/ui-react';
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

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <Card>
        <div style={{ width: 'min(420px, 90vw)' }}>
          <h1 style={{ marginTop: 0, fontSize: 22 }}>Verwaltung</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {unconfigured
              ? 'Das Dashboard ist nicht konfiguriert. Setze DASHBOARD_TOKEN in .env und starte den Server neu.'
              : 'Konten, Sitzungen, Plattformen, C@MPUS-Daten und Betriebszustand.'}
          </p>
          {error && !unconfigured ? <ErrorState message={error instanceof Error ? error.message : 'Anmeldung erforderlich.'} /> : null}
          {!unconfigured ? (
            <form onSubmit={submit}>
              <Field label="Dashboard-Token">
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="DASHBOARD_TOKEN"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                />
              </Field>
              <div style={{ marginTop: 14 }}>
                <Button type="submit" disabled={mutation.isPending || !token.trim()}>
                  {mutation.isPending ? 'Anmelden …' : 'Anmelden'}
                </Button>
              </div>
            </form>
          ) : onRetry ? <Button variant="secondary" onClick={onRetry}>Erneut versuchen</Button> : null}
          {mutation.error ? <div style={{ marginTop: 12 }}><ErrorState message={mutation.error instanceof Error ? mutation.error.message : 'Anmeldung fehlgeschlagen.'} /></div> : null}
        </div>
      </Card>
    </div>
  );
}
