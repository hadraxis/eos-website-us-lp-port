# Eos Website US — LP Port Handoff

Branch de entrega das duas novas landing pages para o site `eos-e.com`:

- `/lightning-backup` — interceptor V2H para Ford F-150 Lightning
- `/before-the-generator` — interceptor com framing alternativa ao gerador

## O que esse repo é

Repo pessoal de handoff. Contém **só os arquivos novos** das LPs (92 arquivos) — não é um fork nem espelho do repo prod de vocês. O branch `feat/lp-lightning-generator-routes` tem um único commit órfão com a entrega completa.

## Documentação principal

Toda a documentação técnica (arquitetura, route group, modelo de tracking, env vars, build, rollback, opt-in para tracking sitewide, recomendação de WordPress headless) está em:

**[`src/app/(lp)/README.md`](src/app/(lp)/README.md)**

## Como aplicar

1. Ler `src/app/(lp)/README.md` (pt-BR)
2. Copiar os 92 arquivos para os mesmos paths no repo prod
3. Aplicar os 2 patches documentados no README ao `src/components/layout/AppShell.tsx` (append 2 strings ao array `NO_NAV_FOOTER`) + `src/app/globals.css` (19 tokens novos no `@theme inline {}`)
4. Setar env vars no Vercel (opcional, todas degradam graciosamente)
5. `npm run build` e ship

## Stack alvo

Next.js 16, React 19, Tailwind v4, `motion` v12. Zero dependências novas no `package.json`.

## Rollback

`git revert` do commit de merge. Nenhum estado externo para desfazer.
