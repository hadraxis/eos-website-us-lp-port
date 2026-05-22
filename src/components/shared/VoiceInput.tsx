'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Web Speech API voice-to-text button.
 * Feature-detects — renders nothing if the browser lacks support.
 * Appends transcribed text to the target value via onChange callback.
 */

interface Props {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}

// Feature detect once at module level
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : null;

export function VoiceInput({ value, onChange, className = '' }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    setSupported(!!SpeechRecognition);
  }, []);

  const toggle = useCallback(() => {
    if (listening && recRef.current) {
      recRef.current.stop();
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    recRef.current = rec;

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      const separator = value.trim() ? ' ' : '';
      onChange(value.trim() + separator + transcript);
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    rec.start();
    setListening(true);
  }, [listening, value, onChange]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      title={listening ? 'Listening...' : 'Speak your message'}
      className={`inline-flex items-center justify-center shrink-0 transition-colors ${
        listening
          ? 'text-red-500 animate-pulse'
          : 'text-muted hover:text-charcoal'
      } ${className}`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    </button>
  );
}
