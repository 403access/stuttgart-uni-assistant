import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, ToastProvider } from '@ua/ui-react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoginScreen } from '../src/routes/login';

describe('admin login', () => {
  it('shows the token field before authentication', () => {
    const client = new QueryClient();
    render(
      <ThemeProvider>
        <ToastProvider>
          <QueryClientProvider client={client}>
            <LoginScreen />
          </QueryClientProvider>
        </ToastProvider>
      </ThemeProvider>,
    );
    expect(screen.getByText('Verwaltung')).toBeInTheDocument();
    expect(screen.getByLabelText('Dashboard-Token')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anmelden' })).toBeDisabled();
  });
});
