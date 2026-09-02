'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Inbox, AlertTriangle, RefreshCw, Search, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  key: string
  header: string
  sortable?: boolean
  className?: string
  headerClassName?: string
  cell: (row: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
  searchQuery?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  /** Enable row checkboxes */
  selectable?: boolean
  onSelectionChange?: (selected: Set<string | number>) => void
  /** Bulk action bar rendered when rows are selected */
  bulkActions?: (selected: Set<string | number>, clearSelection: () => void) => React.ReactNode
  /** Rows per page options */
  pageSizes?: number[]
  defaultPageSize?: number
  /** External sort control (controlled mode) */
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string, dir: 'asc' | 'desc') => void
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-[hsl(var(--surface-3))]" style={{ width: `${60 + (i * 17) % 35}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir?: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown size={14} className="text-[hsl(var(--subtle-foreground))]" />
  return dir === 'asc'
    ? <ChevronUp size={14} className="text-[hsl(var(--primary))]" />
    : <ChevronDown size={14} className="text-[hsl(var(--primary))]" />
}

// ── Main component ────────────────────────────────────────────────────────────
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  error = null,
  onRetry,
  searchQuery,
  emptyTitle,
  emptyDescription,
  emptyAction,
  selectable = false,
  onSelectionChange,
  bulkActions,
  pageSizes = [10, 25, 50],
  defaultPageSize = 25,
  sortKey: extSortKey,
  sortDir: extSortDir,
  onSort,
}: DataTableProps<T>) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [page, setPage] = useState(1)
  const [intSortKey, setIntSortKey] = useState<string>('')
  const [intSortDir, setIntSortDir] = useState<'asc' | 'desc'>('asc')
  const tbodyRef = useRef<HTMLTableSectionElement>(null)

  // Reset to page 1 when data changes
  useEffect(() => { setPage(1) }, [data.length])

  const sortKey = extSortKey ?? intSortKey
  const sortDir = extSortDir ?? intSortDir

  const handleSort = useCallback((key: string) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'
    if (onSort) {
      onSort(key, newDir)
    } else {
      setIntSortKey(key)
      setIntSortDir(newDir)
    }
  }, [sortKey, sortDir, onSort])

  // Client-side sort (when not controlled)
  const sortedData = !extSortKey && intSortKey
    ? [...data].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[intSortKey] ?? ''
        const bVal = (b as Record<string, unknown>)[intSortKey] ?? ''
        const cmp = String(aVal).localeCompare(String(bVal), 'tr')
        return intSortDir === 'asc' ? cmp : -cmp
      })
    : data

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const pageData = sortedData.slice((page - 1) * pageSize, page * pageSize)

  // Selection
  const allPageIds = pageData.map(row => keyExtractor(row))
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id))
  const someSelected = allPageIds.some(id => selected.has(id)) && !allSelected

  const toggleAll = () => {
    const next = new Set(selected)
    if (allSelected) allPageIds.forEach(id => next.delete(id))
    else allPageIds.forEach(id => next.add(id))
    setSelected(next)
    onSelectionChange?.(next)
  }

  const toggleRow = (id: string | number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    onSelectionChange?.(next)
  }

  const clearSelection = () => {
    setSelected(new Set())
    onSelectionChange?.(new Set())
  }

  // Keyboard navigation on rows
  const handleRowKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const rows = tbodyRef.current?.querySelectorAll('tr[tabindex]')
      ;(rows?.[index + 1] as HTMLElement)?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const rows = tbodyRef.current?.querySelectorAll('tr[tabindex]')
      ;(rows?.[index - 1] as HTMLElement)?.focus()
    }
  }

  const colCount = columns.length + (selectable ? 1 : 0)

  return (
    <div className="flex flex-col gap-0">
      {/* Bulk action bar */}
      {selectable && selected.size > 0 && bulkActions && (
        <div className="flex items-center gap-3 px-4 py-2 bg-[hsl(var(--primary-soft))] border-b border-[hsl(var(--border))]">
          <span className="text-sm text-[hsl(var(--primary))] font-medium">
            {selected.size} {t.selected}
          </span>
          <span className="text-[hsl(var(--border-strong))]">·</span>
          {bulkActions(selected, clearSelection)}
        </div>
      )}

      {/* Table — horizontal scroll container on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]" role="grid" aria-busy={isLoading}>
          <caption className="sr-only">Veri tablosu</caption>
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.5)]">
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    aria-label="Select all"
                    className="accent-[hsl(var(--primary))] w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'text-left px-4 py-3 text-label text-[hsl(var(--muted-foreground))]',
                    col.sortable && 'cursor-pointer select-none hover:text-[hsl(var(--foreground))]',
                    col.headerClassName
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortDir === 'asc' ? 'ascending' : 'descending'
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && <SortIcon active={sortKey === col.key} dir={sortDir} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody ref={tbodyRef} className="divide-y divide-[hsl(var(--border))]">
            {/* Loading */}
            {isLoading && Array.from({ length: pageSize > 10 ? 8 : 5 }).map((_, i) => (
              <SkeletonRow key={i} colCount={colCount} />
            ))}

            {/* Error */}
            {!isLoading && error && (
              <tr>
                <td colSpan={colCount} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertTriangle size={32} className="text-[hsl(var(--danger))]" />
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{error.message}</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[hsl(var(--surface-3))] text-sm hover:bg-[hsl(var(--border))] transition-colors"
                      >
                        <RefreshCw size={14} />
                        {t.tryAgain}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* No search results */}
            {!isLoading && !error && data.length === 0 && searchQuery && (
              <tr>
                <td colSpan={colCount} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={28} className="text-[hsl(var(--subtle-foreground))]" />
                    <p className="text-sm text-[hsl(var(--foreground))] font-medium">
                      &ldquo;{searchQuery}&rdquo; {t.noSearchResults}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t.clearSearch}</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty */}
            {!isLoading && !error && data.length === 0 && !searchQuery && (
              <tr>
                <td colSpan={colCount} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Inbox size={32} className="text-[hsl(var(--subtle-foreground))]" />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {emptyTitle ?? t.noDoctors}
                      </p>
                      {emptyDescription && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                          {emptyDescription}
                        </p>
                      )}
                    </div>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            )}

            {/* Rows */}
            {!isLoading && !error && pageData.map((row, idx) => {
              const id = keyExtractor(row)
              const isSelected = selected.has(id)
              return (
                <tr
                  key={id}
                  tabIndex={0}
                  onKeyDown={e => handleRowKeyDown(e, idx)}
                  className={cn(
                    'transition-colors duration-120 outline-none',
                    'hover:bg-[hsl(var(--surface-3))]',
                    'focus-visible:bg-[hsl(var(--primary-soft))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--primary))]',
                    isSelected && 'bg-[hsl(var(--primary-soft))]'
                  )}
                >
                  {selectable && (
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        aria-label={`Select row ${idx + 1}`}
                        className="accent-[hsl(var(--primary))] w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3', col.className)}>
                      {col.cell(row, idx)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card view — hidden on md+ (table shows) */}
      {/* NOTE: table already scrolls horizontally; card mode is an enhancement for very small screens */}

      {/* Pagination */}
      {!isLoading && !error && sortedData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-xs">{t.rowsPerPage}</label>
            <select
              id="page-size"
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="bg-[hsl(var(--surface-2))] border border-[hsl(var(--border))] rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[hsl(var(--foreground))]"
            >
              {pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs">
              {t.page} {page} {t.of} {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 rounded text-xs bg-[hsl(var(--surface-2))] border border-[hsl(var(--border))] disabled:opacity-40 hover:bg-[hsl(var(--surface-3))] transition-colors"
                aria-label={t.previous}
              >
                ‹
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 rounded text-xs bg-[hsl(var(--surface-2))] border border-[hsl(var(--border))] disabled:opacity-40 hover:bg-[hsl(var(--surface-3))] transition-colors"
                aria-label={t.next}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
