import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, DataTable, Pagination, ThemeProvider } from '../src';

describe('@ua/ui-react', () => {
  it('renders a button and forwards clicks', async () => {
    const onClick = vi.fn();
    render(<ThemeProvider><Button onClick={onClick}>Speichern</Button></ThemeProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders table rows and an empty state', () => {
    const columns = [{ key: 'name', header: 'Name', render: (row: { id: number; name: string }) => row.name }];
    const { rerender } = render(<ThemeProvider><DataTable columns={columns} rows={[{ id: 1, name: 'Ada' }]} rowKey={(row) => row.id} /></ThemeProvider>);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    rerender(<ThemeProvider><DataTable columns={columns} rows={[]} rowKey={(row) => row.id} empty="Leer" /></ThemeProvider>);
    expect(screen.getByText('Leer')).toBeInTheDocument();
  });

  it('paginates', async () => {
    const onPage = vi.fn();
    render(<ThemeProvider><Pagination page={1} pageSize={10} total={25} onPage={onPage} /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(onPage).toHaveBeenCalledWith(2);
  });
});
