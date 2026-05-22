'use client';

import { useState, useEffect, useCallback } from 'react';
import { QUALIFY_CONFIG } from '@/lib/qualify.config';
import {
  loadSubmissions,
  clearSubmissions,
  downloadCSV,
  getColumns,
  type LeadRow,
} from './qualify-store';

const TIER_DOT: Record<number, string> = {
  1: 'bg-eos-green',
  2: 'bg-eos-blue',
  3: 'bg-eos-yellow',
  4: 'bg-muted',
};

// Human-readable column labels
const COL_LABELS: Record<string, string> = {
  id: 'ID',
  submitted_at: 'Submitted',
  score: 'Score',
  tier: 'Tier',
  tier_label: 'Tier Label',
  disqualified: 'DQ?',
  disqualify_reason: 'DQ Reason',
};

// Build label map from config steps
for (const step of QUALIFY_CONFIG.steps) {
  COL_LABELS[step.id] = step.question.replace(/\?$/, '').slice(0, 32);
}

type SortDir = 'asc' | 'desc';

function formatCell(col: string, val: unknown): string {
  if (val == null) return 'n/a';
  if (col === 'submitted_at') {
    try {
      return new Date(val as string).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch { return String(val); }
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

export function QualifyLeadsTable() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [sortCol, setSortCol] = useState<string>('submitted_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(() => setRows(loadSubmissions()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const columns = getColumns();

  const sorted = [...rows]
    .filter((r) => filterTier === 'all' || String(r.tier) === filterTier)
    .sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });

  function handleSort(col: string) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearSubmissions();
    refresh();
    setConfirmClear(false);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-rule bg-white p-10 text-center">
        <p className="text-muted text-sm">No submissions yet. Complete the qualification flow to see data here.</p>
        <a href="/qualify" className="mt-4 inline-block text-xs text-eos-blue hover:text-eos-accent-hover">
          Go to qualify flow &rarr;
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-semibold uppercase tracking-widest">
            {sorted.length} / {rows.length} leads
          </span>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="text-xs border border-rule rounded-[var(--radius-btn)] px-2 py-1.5
                       bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-eos-blue/30"
          >
            <option value="all">All tiers</option>
            <option value="1">Tier 1, Assessment-Ready</option>
            <option value="2">Tier 2, Qualified</option>
            <option value="3">Tier 3, Engaged</option>
            <option value="4">Tier 4, Cold</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCSV(sorted)}
            className="rounded-[var(--radius-btn)] bg-eos-blue px-4 py-2
                       text-white text-xs font-bold uppercase tracking-widest
                       hover:bg-eos-accent-hover transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={handleClear}
            className={`rounded-[var(--radius-btn)] px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors
                        ${confirmClear
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'border border-rule text-muted hover:text-charcoal'}`}
          >
            {confirmClear ? 'Confirm clear' : 'Clear all'}
          </button>
          {confirmClear && (
            <button
              onClick={() => setConfirmClear(false)}
              className="text-xs text-muted hover:text-charcoal transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Qualified leads table — scroll with arrow keys"
        className="overflow-x-auto rounded-[var(--radius-card)] border border-rule focus:outline-none focus-visible:ring-2 focus-visible:ring-eos-accent/40 focus-visible:ring-offset-2"
      >
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-surface border-b border-rule">
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-2.5 text-left font-semibold text-muted uppercase tracking-widest
                             whitespace-nowrap cursor-pointer hover:text-charcoal select-none"
                >
                  {COL_LABELS[col] ?? col}
                  {sortCol === col && (
                    <span className="ml-1 text-eos-blue">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-rule last:border-0 hover:bg-surface/50 transition-colors
                            ${row.disqualified ? 'opacity-50' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2.5 whitespace-nowrap text-charcoal">
                    {col === 'tier' && !row.disqualified ? (
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${TIER_DOT[row.tier] ?? 'bg-muted'}`} />
                        {row.tier}
                      </span>
                    ) : col === 'score' && !row.disqualified ? (
                      <span className="font-semibold text-eos-blue">{formatCell(col, row[col])}</span>
                    ) : (
                      <span className={col === 'id' ? 'font-mono text-muted' : ''}>
                        {formatCell(col, row[col])}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted text-right">
        Stored in browser localStorage. Export CSV to persist externally.
      </p>
    </div>
  );
}
