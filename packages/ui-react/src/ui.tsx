import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  isValidElement,
  cloneElement,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { Icon } from './icons';

export type Tone = '' | 'ok' | 'warn' | 'danger' | 'blue' | 'purple' | 'info';

const ShellContext = createContext<{ openMenu: () => void } | null>(null);

export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const nav = isValidElement(sidebar)
    ? cloneElement(sidebar as ReactElement<{ open?: boolean; onClose?: () => void }>, { open, onClose: close })
    : sidebar;
  return (
    <ShellContext.Provider value={{ openMenu: () => setOpen(true) }}>
      <div className="app-shell">
        <div className={`sidebar-backdrop${open ? ' show' : ''}`.trim()} onClick={close} />
        {nav}
        <div className="workspace">{children}</div>
      </div>
    </ShellContext.Provider>
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
  open = false,
  onClose,
}: {
  items: (SidebarItem | { label: string })[];
  footer?: ReactNode;
  onNavigate?: (href: string) => void;
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Seitenleiste">
      <div className="brand">
        <div className="brand-mark"><span /></div>
        <div><h1>Verwaltung</h1><p>University Assistant</p></div>
      </div>
      <nav className="nav" aria-label="Hauptnavigation">
        {items.map((item, index) => (
          'href' in item ? (
            <a
              key={item.href}
              href={item.href}
              className={`nav-item${item.active ? ' active' : ''}`}
              onClick={(event) => {
                if (!onNavigate) return;
                event.preventDefault();
                onNavigate(item.href);
                onClose?.();
              }}
            >
              {item.icon ? <Icon name={item.icon} /> : null}
              <span>{item.label}</span>
              {item.badge !== undefined ? <span className="nav-badge">{item.badge}</span> : null}
            </a>
          ) : (
            <p key={`label-${index}`} className="nav-label">{item.label}</p>
          )
        ))}
      </nav>
      <div className="sidebar-foot">{footer}</div>
    </aside>
  );
}

export function Topbar({
  title,
  subtitle,
  actions,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onRefresh?: () => void;
}) {
  const shell = useContext(ShellContext);
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn mobile-only" type="button" aria-label="Navigation öffnen" onClick={shell?.openMenu}>
          <Icon name="menu" />
        </button>
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="topbar-actions">
        {actions}
        {onRefresh ? (
          <button className="btn secondary small" type="button" onClick={onRefresh}>
            <Icon name="refresh" />
            <span>Aktualisieren</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}

/** Pages use the topbar for the title; this only renders page-level actions. */
export function PageHeader({ actions }: { title?: string; subtitle?: string; actions?: ReactNode }) {
  return actions ? <div className="form-actions" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>{actions}</div> : null;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card section-card ${className}`}>{children}</section>;
}

export function Section({ title, subtitle, children, actions }: { title?: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card section-card">
      {title || actions ? (
        <div className="section-head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="kpi-grid">{children}</div>;
}

export function StatCard({
  value,
  label,
  sub,
  icon,
  href,
  tone = '',
  onNavigate,
}: {
  value: ReactNode;
  label: string;
  sub?: string;
  icon?: string;
  href?: string;
  tone?: string;
  onNavigate?: (href: string) => void;
}) {
  const content = (
    <>
      <div className="kpi-top">
        {icon ? <span className="kpi-icon"><Icon name={icon} /></span> : <span />}
        {href ? <span className="kpi-arrow"><Icon name="arrow-right" /></span> : null}
      </div>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </>
  );
  const className = `kpi ${tone}`.trim();
  if (!href) return <div className={className}>{content}</div>;
  return (
    <a className={className} href={href} onClick={(event) => { if (!onNavigate) return; event.preventDefault(); onNavigate(href); }}>
      {content}
    </a>
  );
}

export function Badge({ children, tone = '' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge ${tone}`.trim()}>{children}</span>;
}

export function Avatar({ name, account, size = '' }: { name: string; account?: string | null; size?: '' | 'sm' | 'lg' }) {
  const source = String(name || account || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? '?').slice(0, 2);
  let hash = 0;
  for (const char of String(account || name || '?')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return <span className={`avatar a${hash % 6} ${size}`.trim()} aria-hidden="true">{letters.toUpperCase()}</span>;
}

export function Button({
  variant = 'primary',
  size = 'normal',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'normal' | 'small' }) {
  const variantClass = variant === 'secondary' ? 'secondary' : variant === 'danger' ? 'danger' : variant === 'ghost' ? 'ghost' : '';
  return (
    <button className={`btn ${variantClass} ${size === 'small' ? 'small' : ''}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field stack-field compact"><span>{label}</span>{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="check-row"><input type="checkbox" className="checkbox" {...props} />{label}</label>;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name="info" /></span>
      <strong>{title}</strong>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-label="Lädt" />;
}

export function Callout({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return <div className={`callout ${tone === 'warn' ? 'warn' : ''}`.trim()}><Icon name={tone === 'warn' ? 'alert' : 'info'} /><div>{children}</div></div>;
}

export function BackLink({ href, children, onNavigate }: { href: string; children: ReactNode; onNavigate?: (href: string) => void }) {
  return (
    <a
      className="back-link"
      href={href}
      onClick={(event) => {
        if (!onNavigate) return;
        event.preventDefault();
        onNavigate(href);
      }}
    >
      <Icon name="chevron-left" />
      {children}
    </a>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="callout warn" role="alert">{message}</div>;
}

export function CopyButton({ value, label = 'Kopieren' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      title={label}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value ?? ''));
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch { /* clipboard denied */ }
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} />
    </button>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="card table-card"><div className="table-wrap"><table className="data">{children}</table></div></div>;
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
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
  rowClassName,
  footer,
  plain = false,
  onRowClick,
  tableClassName = 'data',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  empty?: string;
  loading?: boolean;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  rowClassName?: (row: T) => string;
  footer?: ReactNode;
  plain?: boolean;
  onRowClick?: (row: T) => void;
  tableClassName?: string;
}) {
  const wrapperClass = plain ? 'table-card' : 'card table-card';
  if (loading) return <div className={wrapperClass}><div className="loading"><Spinner /> Wird geladen …</div>{footer}</div>;
  if (!rows.length) return <div className={wrapperClass}><EmptyState title={empty} />{footer}</div>;
  return (
    <div className={wrapperClass}>
      <div className="table-wrap">
        <table className={tableClassName}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.className}>
                  {column.sortable && onSort ? (
                    <button type="button" className="copy-btn" onClick={() => onSort(column.key)}>
                      {column.header}{sortKey === column.key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  ) : column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={rowClassName?.(row)}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => <td key={column.key} className={column.className}>{column.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const numbers = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let value = start; value <= Math.min(pages, start + 4); value += 1) numbers.push(value);
  return (
    <div className="pager">
      <span className="hint">{total} Einträge · Seite {page} von {pages}</span>
      <div className="row">
        <Button variant="secondary" size="small" disabled={page <= 1} onClick={() => onPage(page - 1)}>Zurück</Button>
        {numbers.map((value) => (
          <button key={value} type="button" className={`page-num${value === page ? ' current' : ''}`} onClick={() => onPage(value)}>{value}</button>
        ))}
        <Button variant="secondary" size="small" disabled={page >= pages} onClick={() => onPage(page + 1)}>Weiter</Button>
      </div>
    </div>
  );
}

export function Dialog({
  open,
  title,
  children,
  actions,
  onClose,
  wide = false,
  width,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  wide?: boolean;
  width?: number | string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''}`.trim()}
      style={width ? { width } : undefined}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClose={onClose}
    >
      <div className="modal-body">
        <div className="modal-head">
          <div className="modal-icon warn"><Icon name="info" /></div>
          <div><h2>{title}</h2></div>
        </div>
        {children}
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </dialog>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} className="tab" onClick={() => onChange(tab.id)}>
          {tab.label}
          {tab.count !== undefined ? <span className="tab-count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function BarList({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((item) => Number(item.count) || 0));
  return (
    <div className="bar-list">
      {items.map((item) => (
        <div key={item.label} className="bar-row">
          <div className="bar-label"><strong>{item.label}</strong><span>{item.count}</span></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round((Number(item.count) || 0) / max * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function HealthStrip({ items }: { items: [string, boolean][] }) {
  return (
    <div className="health-strip">
      {items.map(([label, ok]) => (
        <span key={label} className={`health-chip ${ok ? 'ok' : 'warn'}`}><span className="dot" />{label}</span>
      ))}
    </div>
  );
}

export function FieldBox({ label, value }: { label: string; value: ReactNode }) {
  return <div className="field-box"><span className="k">{label}</span><span className="v">{value}</span></div>;
}

export function Timeline({ children }: { children: ReactNode }) {
  return <div className="timeline">{children}</div>;
}

export function TimelineItem({ children, dot = '', time }: { children: ReactNode; dot?: string; time?: ReactNode }) {
  return (
    <div className="timeline-item">
      <span className={`timeline-dot ${dot}`.trim()} />
      <div className="timeline-body">{children}</div>
      {time ? <span className="timeline-time">{time}</span> : null}
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="row">{children}</div>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="muted">{children}</span>;
}

interface ToastItem { id: number; message: string; tone: 'info' | 'error' | 'ok' }
interface ToastContextValue { show: (message: string, tone?: 'info' | 'error' | 'ok') => void }
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, tone: 'info' | 'error' | 'ok' = 'info') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, tone }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4000);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast ${item.tone}`}><Icon name={item.tone === 'error' ? 'alert' : item.tone === 'ok' ? 'check-circle' : 'info'} /><span>{item.message}</span></div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

