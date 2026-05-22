import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 24 }}>
      <p
        style={{
          color: '#0a84e8',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        Eos Proposal Uplift
      </p>
      <h1 style={{ fontSize: 36, margin: '8px 0 16px' }}>
        Standalone backoffice
      </h1>
      <p style={{ color: '#7b7b7b', fontSize: 16, lineHeight: 1.5 }}>
        Pacote de uplift pro slice de Proposal Generator do monorepo
        eosloan-turborepo. Espelha a estrutura de destino, mas roda standalone
        pra testar antes de integrar.
      </p>

      <ul style={{ marginTop: 32, paddingLeft: 18 }}>
        <li style={{ marginBottom: 16 }}>
          <Link
            href="/proposals/new"
            style={{ color: '#0a84e8', fontWeight: 700, fontSize: 18 }}
          >
            → Quote Builder (criar/editar uma proposta)
          </Link>
          <p style={{ color: '#7b7b7b', margin: '4px 0 0', fontSize: 14 }}>
            Form interativo + live preview embaixo. Edite cliente, plano, V2X,
            cover, pricing, discount. Apply = atualiza preview. Save = salva
            estado local (em prod = tRPC.proposal.create).
          </p>
        </li>
        <li style={{ marginBottom: 12 }}>
          <Link
            href="/proposals/sample"
            style={{ color: '#0a84e8', fontWeight: 700 }}
          >
            → Preview da proposta sample
          </Link>
          <p style={{ color: '#7b7b7b', margin: '4px 0 0', fontSize: 14 }}>
            So o ProposalDocument renderizado, sem controles. Ctrl+P exporta PDF.
          </p>
        </li>
      </ul>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #dfe3e8' }} />

      <h2 style={{ fontSize: 20, margin: '0 0 12px' }}>Setup</h2>
      <pre
        style={{
          background: '#f0f5f8',
          padding: 14,
          borderRadius: 12,
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
{`bun install
bun run docker:up
bun run db:migrate
bun run db:seed:pricing
bun run db:seed:ev-presets
bun run db:seed:asset-lookup
bun run verify:proposal-contract
bun run dev:backoffice`}
      </pre>

      <p style={{ color: '#7b7b7b', fontSize: 13, marginTop: 24 }}>
        Ver <code>README.md</code> e <code>APPLY.md</code> na raiz pra detalhes
        + como portar pro monorepo de destino.
      </p>
    </main>
  )
}
