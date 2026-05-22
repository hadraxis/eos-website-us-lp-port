'use client'

/**
 * useDraftPersistence — persiste o BuilderDraft em localStorage com debounce.
 *
 * Sem backend nesta gift app. Suficiente pra:
 *   - sobreviver hard refresh / navegacao entre /proposals/new e /proposals/sample
 *   - compartilhar estado entre rotas (mesmo key)
 *
 * Em prod no monorepo destino, trocar por trpc.backofficeProposals.update/byId.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'eos-proposal-draft'
const DEBOUNCE_MS = 300

type Draft = Record<string, unknown>

function readFromStorage(): Draft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

function writeToStorage(draft: Draft) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // silent — quota cheia, modo privado, etc
  }
}

export function clearPersistedDraft() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
}

/**
 * Hook de leitura+escrita do draft persistido.
 *
 * - `initial` e usado quando localStorage esta vazio
 * - escrita do estado e debounceada pra evitar I/O em cada keystroke
 * - listen no storage event pra sync cross-tab
 */
export function useDraftPersistence<TDraft extends Draft>(initial: TDraft) {
  const [draft, setDraftInternal] = useState<TDraft>(() => {
    const stored = readFromStorage()
    return (stored as TDraft) ?? initial
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // debounce write
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => writeToStorage(draft), DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [draft])

  // cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        setDraftInternal(JSON.parse(e.newValue) as TDraft)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setDraft = useCallback(
    (next: TDraft | ((current: TDraft) => TDraft)) => {
      setDraftInternal((current) =>
        typeof next === 'function' ? (next as (c: TDraft) => TDraft)(current) : next
      )
    },
    []
  )

  const resetDraft = useCallback(() => {
    clearPersistedDraft()
    setDraftInternal(initial)
  }, [initial])

  return { draft, setDraft, resetDraft, storageKey: STORAGE_KEY }
}

export const DRAFT_STORAGE_KEY = STORAGE_KEY
