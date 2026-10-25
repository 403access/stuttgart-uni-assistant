import './styles/dashboard.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ThemeProvider, ToastProvider } from '@ua/ui-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { queryClient } from './lib/query';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
