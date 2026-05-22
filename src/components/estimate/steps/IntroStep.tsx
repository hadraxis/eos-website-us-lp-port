'use client';

interface Props {
  name: string;
  email: string;
  phone: string;
  onChange: (field: 'name' | 'email' | 'phone', value: string) => void;
  onComplete: () => void;
}

/**
 * IntroStep — iOS 26 style contact gate. Lives inside PlanningSheet, so
 * no header chrome here. Three fields, single primary CTA. Fields use
 * native autofill triple (autoComplete + inputMode + autoCorrect/Capitalize
 * + enterKeyHint) so Safari Keychain / Android Smart Lock can fill in one
 * tap. Form-wrapped so Enter submits when canContinue.
 */
export function IntroStep({ name, email, phone, onChange, onComplete }: Props) {
  const canContinue =
    name.trim().length > 1 &&
    email.trim().includes('@') &&
    phone.replace(/\D/g, '').length >= 10;

  return (
    // Pinned-header layout: top section + scrollable middle + pinned footer.
    // For IntroStep the fields rarely overflow, but the structure matches
    // QualifyFlow so transitions between phases don't shift layout.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canContinue) onComplete();
      }}
      className="flex flex-col h-full min-h-0"
    >
      {/* Pinned header — avatar + greeting + question */}
      <div className="shrink-0 px-6 pt-8 md:px-10 md:pt-10">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/images/megan-advisor.png"
            alt=""
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-eos-accent/15"
          />
          <div>
            <p className="text-charcoal text-[13px] font-semibold leading-tight">Megan King</p>
            <p className="text-muted text-[11px] leading-tight">Your Houston advisor</p>
          </div>
        </div>

        <h2 className="text-charcoal text-[26px] md:text-3xl font-bold tracking-tight leading-[1.15] mb-2">
          Who are we putting this together for?
        </h2>
        <p className="text-muted text-[14px] leading-relaxed">
          Quick contact info so we can send the estimate and follow up.
        </p>
      </div>

      {/* Scrollable content — fields. Won't overflow at default sizes but
          keeps structural parity with QualifyFlow's long option lists. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 md:px-10">
        <div className="flex flex-col gap-4">
          <Field
            id="intro-name"
            label="Full name"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="Jane Smith"
            value={name}
            onChange={(v) => onChange('name', v)}
          />
          <Field
            id="intro-email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="jane@example.com"
            value={email}
            onChange={(v) => onChange('email', v)}
          />
          <Field
            id="intro-phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            autoCorrect="off"
            enterKeyHint="go"
            placeholder="(713) 555-0100"
            value={phone}
            onChange={(v) => onChange('phone', v)}
          />
        </div>
      </div>

      {/* Pinned footer — primary CTA always visible. Border-t separates
          from scrollable region above when content scrolls under it. */}
      <div className="shrink-0 px-6 pb-6 pt-4 md:px-10 md:pb-8 border-t border-rule/60 bg-canvas">
        <button
          type="submit"
          disabled={!canContinue}
          className="w-full bg-eos-accent text-white font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-35 disabled:cursor-not-allowed enabled:hover:bg-eos-accent-hover enabled:active:scale-[0.98] transition-all duration-150 shadow-[0_10px_24px_rgba(16,43,133,0.25)]"
        >
          Continue
        </button>
        <p className="text-muted text-[11px] text-center mt-3 leading-relaxed">
          About 2 minutes. 12 quick questions.
        </p>
      </div>
    </form>
  );
}

/**
 * Field — single reusable input row. iOS-26 visual: floating label above,
 * generous 14px vertical padding, soft border that thickens on focus, no
 * box-shadow noise. Inherits all native-autofill attrs from caller so
 * Safari Keychain / Android Smart Lock work without per-call repetition.
 */
function Field({
  id,
  label,
  value,
  onChange,
  ...inputProps
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-charcoal text-[12px] font-semibold tracking-wide uppercase mb-1.5"
      >
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        name={inputProps.name ?? id.replace(/^intro-/, '')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        suppressHydrationWarning
        className="w-full bg-surface/60 border border-rule rounded-2xl px-4 py-3.5 text-charcoal text-[15px] placeholder:text-muted/50 outline-none focus:bg-canvas focus:border-eos-accent/60 focus:ring-2 focus:ring-eos-accent/15 transition-all duration-150"
      />
    </div>
  );
}
