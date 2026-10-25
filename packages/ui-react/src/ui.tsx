import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

import { Icon } from './icons';
import styles from './ui.module.css';

export type Tone = '' | 'ok' | 'warn' | 'danger' | 'blue';

export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      {sidebar}
      <div className={styles.workspace}>{children}</div>
    </div>
  );
}

export interface SidebarItem {
  href: string;
  label: string;
  icon?: string;
  active?: boolean;
  badge?: string | number;
}

export function Sidebar({
  items,
  footer,
  onNavigate,
}: {
  items: Array<SidebarItem | { label: string }>;
  footer?: ReactNode;
  onNavigate?: (href: string) => void;
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.mark} />
        <div>
          <div className={styles.brandTitle}>Verwaltung</div>
          <div className={styles.brandSub}>University Assistant</div>
        </div>
      </div>
      <nav className={styles.nav}>
        {items.map((item, index) => (
          'href' in item ? (
            <a
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}
              onClick={(event) => {
                if (!onNavigate) return;
                event.preventDefault();
                onNavigate(item.href);
              }}
            >
              {item.icon ? <Icon name={item.icon} size={16} /> : null}
              <span>{item.label}</span>
              {item.badge !== undefined ? <span className={styles.navBadge}>{item.badge}</span> : null}
            </a>
          ) : (
            <div key={`label-${index}`} className={styles.navLabel}>{item.label}</div>
          )
        ))}
      </nav>
      <div className={styles.sidebarFoot}>{footer}</div>
    </aside>
  );
}

export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className={styles.topbar}>
      <div>
        <h1 className={styles.topbarTitle}>{title}</h1>
        {subtitle ? <p className={styles.topbarSub}>{subtitle}</p> : null}
      </div>
      <div className={styles.row}>{actions}</div>
    </header>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className={styles.muted}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h2 className={styles.pageTitle}>{title}</h2>
        {subtitle ? <p className={styles.pageSub}>{subtitle}</p> : null}
      </div>
      <div className={styles.row}>{actions}</div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

export function Section({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className={styles.section}>
      {title || actions ? <div className={styles.spread}>{title ? <h3 className={styles.sectionTitle}>{title}</h3> : null}{actions}</div> : null}
      {children}
    </section>
  );
}

export function StatCard({ value, label, sub }: { value: ReactNode; label: string; sub?: string }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub ? <div className={styles.kpiSub}>{sub}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = '' }: { children: ReactNode; tone?: Tone }) {
  const map: Record<string, string> = { ok: styles.badgeOk, warn: styles.badgeWarn, danger: styles.badgeDanger, blue: styles.badgeBlue };
  return <span className={`${styles.badge} ${map[tone] ?? ''}`}>{children}</span>;
}

export function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
  return <span className={styles.avatar}>{initials}</span>;
}

export function Button({
  variant = 'primary',
  size = 'normal',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; size?: 'normal' | 'small' }) {
  const variantClass = variant === 'secondary' ? styles.buttonSecondary : variant === 'danger' ? styles.buttonDanger : '';
  return (
    <button className={`${styles.button} ${variantClass} ${size === 'small' ? styles.buttonSmall : ''}`} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={styles.input} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={styles.select} {...props} />;
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className={styles.checkbox}><input type="checkbox" {...props} />{label}</label>;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return <div className={styles.empty}><strong>{title}</strong>{detail ? <div>{detail}</div> : null}</div>;
}

export function Spinner() {
  return <span className={styles.spinner} aria-label="Lädt" />;
}

export function ErrorState({ message }: { message: string }) {
  return <div className={styles.error} role="alert">{message}</div>;
}

export function CopyButton({ value, label = 'Kopieren' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copy}
      title={label}
      aria-label={label}
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* ignore */ }
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={15} />
    </button>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <div className={styles.tableWrap}><table className={styles.table}>{children}</table></div>;
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortable?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = 'Keine Einträge',
  loading = false,
  sortKey,
  sortDirection,
  onSort,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  empty?: string;
  loading?: boolean;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}) {
  if (loading) return <div className={styles.empty}><Spinner /></div>;
  if (!rows.length) return <div className={styles.tableWrap}><EmptyState title={empty} /></div>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                {column.sortable && onSort ? (
                  <button type="button" className={styles.copy} onClick={() => onSort(column.key)}>
                    {column.header}{sortKey === column.key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                ) : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className={styles.spread}>
      <span className={styles.muted}>{total} Einträge · Seite {page} von {pages}</span>
      <div className={styles.row}>
        <Button variant="secondary" size="small" disabled={page <= 1} onClick={() => onPage(page - 1)}>Zurück</Button>
        <Button variant="secondary" size="small" disabled={page >= pages} onClick={() => onPage(page + 1)}>Weiter</Button>
      </div>
    </div>
  );
}

export function Dialog({ open, title, children, actions, onClose }: { open: boolean; title: string; children?: ReactNode; actions?: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={styles.dialogBackdrop} role="presentation" onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <h3 className={styles.dialogTitle}>{title}</h3>
        {children}
        <div className={styles.dialogActions}>{actions}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: Array<{ id: string; label: string }>; active: string; onChange: (id: string) => void }) {
  return (
    <div className={styles.tabs}>
      {tabs.map((tab) => (
        <button key={tab.id} type="button" className={`${styles.tab} ${active === tab.id ? styles.tabActive : ''}`} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface ToastItem { id: number; message: string; tone: 'info' | 'error' }
interface ToastContextValue { show: (message: string, tone?: 'info' | 'error') => void }
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, tone }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4000);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.toastHost}>
        {items.map((item) => <div key={item.id} className={`${styles.toast} ${item.tone === 'error' ? styles.toastError : ''}`}>{item.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

export { Icon };
