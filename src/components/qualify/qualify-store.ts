/**
 * qualify-store.ts
 *
 * localStorage-backed store for qualification submissions.
 * Each submission = one row: all step answers + score + tier + timestamp.
 *
 * Data shape is derived from QUALIFY_CONFIG so columns stay in sync
 * with whatever steps are defined in qualify.config.ts.
 */

import { QUALIFY_CONFIG } from '@/lib/qualify.config';
import type { ScoreBreakdown } from './scoring';
import type { StepAnswer } from './scoring';

const STORAGE_KEY = 'eos_qualify_leads';

// --- Row shape ---

export interface LeadRow {
  id: string;                        // uuid-lite: timestamp + random
  submitted_at: string;              // ISO string
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  score: number;
  tier: 1 | 2 | 3 | 4;
  tier_label: string;
  disqualified: boolean;
  disqualify_reason?: string;
  [fieldId: string]: unknown;        // dynamic step answer columns
}

export interface LeadContact {
  name: string;
  email: string;
  phone?: string;
}

// --- Helpers ---

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function load(): LeadRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LeadRow[]) : [];
  } catch {
    return [];
  }
}

function save(rows: LeadRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // storage full — silently skip
  }
}

// --- Public API ---

export function saveSubmission(
  answers: StepAnswer[],
  result: ScoreBreakdown,
  contact?: LeadContact,
): LeadRow {
  const row: LeadRow = {
    id: genId(),
    submitted_at: new Date().toISOString(),
    ...(contact?.name ? { contact_name: contact.name } : {}),
    ...(contact?.email ? { contact_email: contact.email } : {}),
    ...(contact?.phone ? { contact_phone: contact.phone } : {}),
    score: result.total,
    tier: result.tier,
    tier_label: result.tierLabel,
    disqualified: result.disqualified,
    disqualify_reason: result.disqualifyReason,
  };

  // Flatten step answers into columns
  for (const answer of answers) {
    row[answer.stepId] = answer.value;
  }

  const rows = load();
  rows.unshift(row); // newest first
  save(rows);
  return row;
}

export function saveNote(note: string): void {
  const rows = load();
  if (rows.length === 0) return;
  rows[0].voice_note = note;
  save(rows);
}

export function loadSubmissions(): LeadRow[] {
  return load();
}

export function clearSubmissions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// --- CSV export ---

/**
 * Returns ordered column headers: meta columns + step IDs (in config order) + score cols.
 */
export function getColumns(): string[] {
  const stepCols = QUALIFY_CONFIG.steps.map((s) => s.id);
  return [
    'id',
    'submitted_at',
    'contact_name',
    'contact_email',
    'contact_phone',
    ...stepCols,
    'score',
    'tier',
    'tier_label',
    'disqualified',
    'disqualify_reason',
    'voice_note',
  ];
}

function escapeCSV(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(rows: LeadRow[]): string {
  const cols = getColumns();
  const header = cols.join(',');
  const body = rows.map((row) => cols.map((col) => escapeCSV(row[col])).join(',')).join('\n');
  return `${header}\n${body}`;
}

export function downloadCSV(rows: LeadRow[]): void {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eos-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
