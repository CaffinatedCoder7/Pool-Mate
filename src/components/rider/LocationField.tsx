import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Building2, GraduationCap, Home, Landmark, TrainFront, X, type LucideIcon } from 'lucide-react';
import { IconButton, Skeleton, TextField } from '@/components/ui';
import { cn } from '@/lib/cn';
import { locationService } from '@/services';
import type { LocationSuggestion } from '@/types/domain';

const kindIcons: Record<LocationSuggestion['kind'], LucideIcon> = {
  CAMPUS: GraduationCap,
  TRANSIT: TrainFront,
  OFFICE: Building2,
  RESIDENTIAL: Home,
  LANDMARK: Landmark,
};

interface LocationFieldProps {
  label: string;
  value: LocationSuggestion | null;
  onChange: (value: LocationSuggestion | null) => void;
  leadingIcon: LucideIcon;
  placeholder?: string;
  error?: string;
  /** Hide a location already used by the other field. */
  excludeId?: string;
}

/**
 * Searchable location combobox backed by LocationService (curated Jaipur
 * demo landmarks). Keyboard: ↑/↓ to move, Enter to choose, Esc to close.
 */
export function LocationField({ label, value, onChange, leadingIcon, placeholder, error, excludeId }: LocationFieldProps) {
  const listId = useId();
  const [query, setQuery] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  // Sync when the value changes from outside (e.g. swap, reset), but not when
  // the field itself cleared the value because the user started typing.
  const clearedByTyping = useRef(false);
  useEffect(() => {
    if (!value && clearedByTyping.current) {
      clearedByTyping.current = false;
      return;
    }
    setQuery(value?.label ?? '');
  }, [value]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const term = value && query === value.label ? '' : query;
    const timer = window.setTimeout(() => {
      locationService
        .suggest(term)
        .then((results) => {
          if (cancelled) return;
          setItems(results.filter((r) => r.id !== excludeId));
          setActive(-1);
        })
        .catch(() => !cancelled && setItems([]))
        .finally(() => !cancelled && setLoading(false));
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open, excludeId, value]);

  function choose(item: LocationSuggestion) {
    onChange(item);
    setQuery(item.label);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && open && active >= 0 && items[active]) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <TextField
        label={label}
        leadingIcon={leadingIcon}
        placeholder={placeholder}
        value={query}
        error={open ? undefined : error}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) {
            clearedByTyping.current = true;
            onChange(null);
          }
        }}
        trailing={
          query ? (
            <IconButton
              icon={X}
              label={`Clear ${label.toLowerCase()}`}
              size="sm"
              className="-mr-2 h-8 w-8"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery('');
                onChange(null);
                setOpen(true);
              }}
            />
          ) : null
        }
      />

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg">
          {loading && items.length === 0 ? (
            <div className="space-y-2 p-3" aria-hidden>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-4 text-body-sm text-ink-secondary" role="status">
              No demo locations match “{query}”. Try a landmark like “MNIT” or “Junction”.
            </p>
          ) : (
            <>
              {!query || (value && query === value.label) ? (
                <p className="px-3 pb-1 pt-2 text-micro uppercase text-ink-tertiary">Popular in Jaipur</p>
              ) : null}
              <ul role="listbox" id={listId} aria-label={`${label} suggestions`}>
                {items.map((item, index) => {
                  const Icon = kindIcons[item.kind];
                  return (
                    <li
                      key={item.id}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(item)}
                      onMouseEnter={() => setActive(index)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded px-3 py-2.5',
                        index === active ? 'bg-surface-muted' : 'hover:bg-surface-muted',
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                        <Icon className="h-4 w-4 text-ink-secondary" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-body-sm font-medium text-ink">{item.label}</span>
                        {item.secondaryLabel && <span className="block truncate text-caption text-ink-tertiary">{item.secondaryLabel}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
