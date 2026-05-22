# Eos Landing Pages — Route Group `(lp)`

Landing pages independentes para destino de anúncios, que vivem dentro do próprio route group do Next.js App Router. Tudo o que elas precisam — componentes, helpers de lib, tracking, estilos, assets — é adicionado por este PR. Nenhuma rota, layout ou componente existente é modificado fora da pasta da LP, exceto por dois pontos aditivos mínimos (veja "Pontos de contato fora desta pasta" abaixo).

## URLs finais

- `/lightning-backup` — Interceptor V2H para Ford F-150 Lightning (carregador bidirecional Sigenergy V2X pareado com stack de bateria residencial, após o shutdown do Ford HIS)
- `/before-the-generator` — Interceptor com framing "alternativa ao gerador" (bateria vs. gerador, backup residencial sem barulho, sem combustível, sem manutenção)

Ambas as rotas são pré-renderizadas estaticamente em build time.

## Estrutura de pastas

```
src/app/(lp)/
├── layout.tsx              ← layout da LP: monta AnalyticsProvider + aplica wrapper .lp-scope
├── lp.css                  ← estilos base + utilidades Liquid Glass do iOS-26, todos scoped
├── lightning-backup/
│   └── page.tsx            ← rota /lightning-backup (renderiza <LightningInterceptLP />)
├── before-the-generator/
│   └── page.tsx            ← rota /before-the-generator (renderiza <GeneratorInterceptLP />)
└── README.md               ← este arquivo
```

`(lp)` é um route group do Next.js. **Route groups são sintaxe de pasta apenas — não afetam o path da URL.** As URLs finais são `/lightning-backup` e `/before-the-generator`, não `/lp/lightning-backup` etc.

## Por que um route group

O App Router permite que um route group tenha o próprio `layout.tsx` que só renderiza para rotas dentro dele. É assim que mantemos as LPs **totalmente isoladas:**

- O layout da LP monta o `AnalyticsProvider` (PostHog + pixel Nextdoor + delegação de eventos por LP). As outras páginas nunca renderizam este layout, então esses trackers nunca carregam nelas.
- O layout da LP envolve os children em um `<div className="lp-scope">` que ativa o `lp.css`. Todos os tokens de design, utilidades de glass, estilos base e helpers de bleed específicos da LP vivem sob `.lp-scope`, então as páginas existentes do prod permanecem pixel-idênticas.
- As rotas da LP renderizam em tela cheia (sem nav/footer do site). O chrome padrão é escondido pelo array `NO_NAV_FOOTER` existente no `AppShell.tsx` (duas strings adicionadas — `/lightning-backup` e `/before-the-generator` — mesmo padrão de `/get-started`, `/qualification-chat`, `/residential-c` etc.).

## Árvore de componentes

```
LightningInterceptLP  / GeneratorInterceptLP        (src/components/lp/)
├── SchematicBackground                              fundo SVG animado
├── ViewMoreBanner                                   banner teaser de scroll
├── StatsRow, CardCarousel                           (src/components/content/)
├── InlineEstimate / SystemBuilder + 6 step UIs      (src/components/estimate/)
└── QualifyFlow + 6 arquivos de suporte               (src/components/qualify/)
```

Helpers em `src/lib/`: `analytics-config`, `angle-defaults`, `behavior-tracker`, `city-data`, `eos-analytics` (augmentation de tipo Window), `estimate-types`, `lead-validation`, `lp-tracking`, `plan-math`, `qualify-types`, `qualify.config`, `scroll`, `track`, `ua`, mais `content/{site-content,types}` e `src/content/{generated/site-content, eos-site-analytics}`.

Rota de server adicionada: `src/app/api/verify-lead/route.ts` — endpoint de validação de email + telefone chamado pelo intro step do formulário de qualify. Faz fallback para `{stubbed: true}` se a env var `QUICKEMAILVERIFICATION_API_KEY` estiver faltando — degrada graciosamente.

Diretório público de assets: `public/images/lp/` (~30 imagens específicas da LP + 1 MP4 do hero + 1 WebM), `public/images/megan-advisor.png`, `public/videos/lp/yellow-generator.mp4`.

## Modelo de tracking

O tracking da LP inicializa apenas dentro do route group da LP — via `AnalyticsProvider` montado em `(lp)/layout.tsx`. O provider conecta:

- **PostHog** — pageviews, scroll depth percentil, web vitals, heatmaps, dead clicks, gravação de sessão com mascaramento dos campos do formulário (phone/email/name na whitelist). O autocapture é restrito a seletores `[data-track]` para manter o stream de eventos limpo.
- **Pixel Nextdoor** — page-view + evento de conversão disparado quando o formulário de qualify completa.
- **analytics-runtime.js** — engine global de delegação de eventos que dispara `cta_clicked`, `link_clicked`, `form_submit_attempted`, `form_field_invalid`, `page_scroll_summary` (com 20 buckets de threshold) e `session_started`. O mapa de seletores de CTA está sintonizado com o DOM real do prod (nav, plan cards, blog cards, location cards, contact links, footer links) — então o mesmo mapa funciona sitewide caso vocês decidam montar o `AnalyticsProvider` no root layout depois.

O `GTMLoader` + `RedditPixel` + `UTMCapture` + `UTMLinkEnhancer` já existentes do site continuam disparando nas LPs sem alteração — eles estão montados no root layout. O `AnalyticsProvider` da LP é configurado (via o shim `src/content/eos-site-analytics.ts`) para deixar o GTM e o pixel primário do Reddit desligados, então não há risco de inicialização dupla. O PostHog já está conectado através do container GTM existente, o que significa que a LP herda o PostHog automaticamente. O novo `AnalyticsProvider` adiciona apenas o Nextdoor e a engine do runtime.

## Pontos de contato fora desta pasta — 2 edições aditivas no repo de vocês

Este branch contém **só os arquivos novos** da entrega. Para o LP rodar, vocês precisam aplicar 2 edições aditivas em arquivos que já existem no repo prod de vocês. Ambas seguem padrões que vocês já usam.

### Touchpoint 1 — `src/components/layout/AppShell.tsx`

Anexar 2 strings ao array `NO_NAV_FOOTER` existente. Esconde nav/footer nas LPs (LPs renderizam full-bleed). Mesmo mecanismo já em uso para `/get-started`, `/qualification-chat`, as variantes AB `/residential-*` etc.

```diff
 const NO_NAV_FOOTER = [
   '/residential-c',
   '/residential-d-modular',
   '/residential-e-better-than',
   '/residential-f-no-flicker',
   '/residential-g-generator',
   '/residential-booking',
   '/qualification-residential-booking',
   '/qualification-chat',
   '/get-started',
   '/specifications',
+  '/lightning-backup',
+  '/before-the-generator',
 ];
```

### Touchpoint 2 — `src/app/globals.css`

Adicionar 19 tokens de design DENTRO do bloco `@theme inline {}` existente. Tailwind v4 gera as classes utilitárias (`bg-dark`, `bg-canvas`, `text-charcoal`, `bg-eos-accent` etc.) que os componentes das LPs usam. Nenhum desses nomes colide com classes que páginas existentes do prod já referenciem — puramente aditivo.

```diff
 @theme inline {
   /* Brand colors */
   --color-primary: #0080e3;
   --color-accent: #ffb700;
   --color-success: #5eb45e;

   /* Neutral */
   --color-background: #ffffff;
   --color-foreground: #374151;

   /* Font */
   --font-sans: var(--font-montserrat);
+
+  /* Eos LP theme tokens — used ONLY by /lightning-backup + /before-the-generator
+     landing pages. Tailwind v4 generates utility classes from these. Additive only. */
+
+  /* Dark sections (LP hero, nav, footer) */
+  --color-dark: #102b85;
+  --color-dark-surface: #0e2470;
+  --color-dark-elevated: #1c3eb3;
+  --color-dark-muted: rgba(255, 255, 255, 0.82);
+  --color-dark-rule: rgba(255, 255, 255, 0.1);
+
+  /* Warm canvas (LP content sections) */
+  --color-canvas: #FAFAF8;
+  --color-surface: #F2F1ED;
+  --color-charcoal: #1C1C1E;
+  --color-muted: #6B6B6F;
+  --color-rule: #E5E4E0;
+
+  /* EOS brand accents */
+  --color-eos-blue: #1565C0;
+  --color-eos-blue-on-dark: #90CAF9;
+  --color-eos-yellow: #F9A825;
+  --color-eos-green: #43A047;
+  --color-eos-accent: #1E88E5;
+  --color-eos-accent-hover: #42A5F5;
+  --color-eos-cyan: #00E5FF;
+  --color-eos-cyan-soft: rgba(0, 229, 255, 0.18);
+
+  /* Radii used by LP cards/buttons */
+  --radius-card: 12px;
+  --radius-btn: 8px;
 }
```

### Tudo o resto = arquivos novos

Os outros 92 arquivos do branch são arquivos novos que vivem em paths que o repo de vocês não tem hoje:

- `src/app/(lp)/` — route group + as 2 page.tsx + layout.tsx + lp.css + este README
- `src/components/{lp,content,qualify,estimate}/` — árvore de componentes das LPs
- `src/lib/*` — 18 helpers (analytics, tracking, qualify, plan-math, etc.)
- `src/content/{eos-site-analytics,generated/site-content}.ts`
- `src/app/api/verify-lead/route.ts` — validação server-side de email/telefone
- `public/images/lp/` + `public/images/megan-advisor.png` + `public/videos/lp/yellow-generator.mp4` + `public/scripts/analytics-runtime.js`

Copiem os arquivos novos para os mesmos paths no repo de vocês, apliquem os 2 patches acima, e está pronto.

## Variáveis de ambiente necessárias

Todas opcionais — as LPs degradam graciosamente se qualquer uma estiver faltando. Configure no painel da Vercel (escopos Production + Preview) para ativar a integração correspondente.

| Variável | Propósito | Fallback quando faltando |
|---|---|---|
| `NEXT_PUBLIC_N8N_LEAD_WEBHOOK_URL` | Webhook de intake de lead completa, disparado por `QualifyFlow.tsx` no submit do formulário | POST do webhook é pulado silenciosamente |
| `NEXT_PUBLIC_N8N_LEAD_STARTED_WEBHOOK_URL` | Webhook de remarketing para partial-completer, disparado por `SystemBuilder.tsx` quando o usuário preenche os campos do intro | POST do webhook é pulado silenciosamente |
| `NEXT_PUBLIC_NEXTDOOR_PIXEL_ID` | ID do pixel Nextdoor para atribuição de paid social | Bloco do pixel não renderiza |
| `NEXT_PUBLIC_POSTHOG_KEY` | Chave da API do projeto PostHog (apenas se quiserem que a camada da LP inicialize o PostHog ela mesma, em vez de herdar do container GTM) | PostHog inicializa via container GTM existente como antes |
| `NEXT_PUBLIC_POSTHOG_HOST` | Host da API do PostHog (default `https://us.i.posthog.com`) | Default usado |
| `QUICKEMAILVERIFICATION_API_KEY` | Checagem de deliverability de email em `/api/verify-lead` | Retorna `{stubbed: true}` e o formulário de qualify segue |

## Build / teste

```
npm install
npm run build      # ambas as rotas da LP pré-renderizam como estáticas; /api/verify-lead é função dinâmica
npm run dev        # visite http://localhost:3000/lightning-backup + /before-the-generator
```

## Notas de stack

- Next.js 16, React 19, Tailwind v4 (`@theme inline`), `motion` v12+ (sucessor do Framer Motion). Nenhuma dependência nova adicionada ao package.json.
- CTAs iOS-26 / "Liquid Glass" usam `backdrop-filter: blur() saturate()` + `color-mix(in oklab, ...)` para o tint translúcido da superfície, com fallbacks graciosos para `@supports not (backdrop-filter)` e `prefers-reduced-transparency: reduce`.
- CSS dos componentes da LP usa carrosséis com scroll-snap, hooks da View Transitions API (450ms cubic-bezier) e otimização content-visibility para conteúdo fora da viewport, mitigando a pressão de memória no iOS WKWebView.

## Rollback

`git revert <merge SHA>`. Nenhum estado de ambiente para desfazer; env vars faltando fazem a integração correspondente virar no-op silenciosamente.

---

## Aplicar tracking sitewide (opcional, opt-in de 1 linha)

Hoje o `AnalyticsProvider` só monta dentro de `(lp)/layout.tsx` - então PostHog (via Nextdoor pixel + engine de delegação `analytics-runtime.js`) só inicializam quando uma das duas rotas da LP renderiza. As outras páginas do site continuam idênticas a antes do PR.

Se quiserem que o pacote de tracking cubra **todas as páginas** (home, plans, locations, blog, residential-*, etc.), é uma edição de 1 linha em `src/app/layout.tsx`:

```tsx
// src/app/layout.tsx - adicionar import:
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";

// dentro de <body>, entre <RedditPixel /> e <UTMCapture />, adicionar:
<Suspense fallback={null}><AnalyticsProvider /></Suspense>
```

Ordem final do `<body>`:

```tsx
<GTMLoader />
<Suspense fallback={null}><RedditPixel /></Suspense>
<Suspense fallback={null}><AnalyticsProvider /></Suspense>   {/* NOVO */}
<Suspense fallback={null}><UTMCapture /></Suspense>
<UTMLinkEnhancer />
<AppShell>{children}</AppShell>
```

### O que vocês ganham ativando sitewide

- **PostHog** com pageview history-change, scroll-depth percentil, web vitals, heatmaps, dead-clicks, session recording (com mascaramento de campos sensíveis) - em todas as páginas, não só as LPs
- **Pixel Nextdoor** com PAGE_VIEW automático em todas as rotas
- **Engine `analytics-runtime.js`** dispara em todas as páginas:
  - `session_started` - primeiro hit por sessão
  - `page_context_loaded` - por pageview, com props completas (UTMs, gclid/fbclid/msclkid, device type, network speed, viewport, color scheme, landing page, entry source, navigation type)
  - `cta_clicked` - via mapa de 14 seletores sintonizado com o DOM atual do prod: nav (`a[href="/get-started"]`, `a[href="/plans"]`, `a[href="/contact"]`), home (`a[href="#options"]`), plan cards (`a[href^="/plans/"]`), blog cards (`a[href^="/blog/"]`), location cards (`a[href^="/locations/"]`), compare cards (`a[href^="/compare/"]`), contact (`a[href^="tel:"]`, `a[href^="mailto:"]`, `a[href*="outlook.office.com/book"]`), footer (`footer a[href]`), tabs (`[role="tab"]`)
  - `link_clicked` - para todo `<a>`, classificado em internal/external/mailto/tel/download
  - `form_submit_attempted` + `form_field_invalid` - para qualquer formulário
  - `page_scroll_summary` - flushed via `sendBeacon` em `pagehide` + `visibilitychange:hidden`, com 20 buckets de threshold (5% a 100% em incrementos de 5%)

### O que NÃO muda

- `GTMLoader` + `RedditPixel` + `UTMCapture` + `UTMLinkEnhancer` continuam idênticos - o `AnalyticsProvider` está configurado (via o shim `src/content/eos-site-analytics.ts`) para deixar GTM e Reddit primário desligados, então zero risco de double-init
- O iframe `app.eos-e.com/solution?embed=true` na `/get-started` permanece isolado por cross-origin - a engine de delegação não atinge cliques dentro dele, então os eventos atuais do `QualifyFlowClient.tsx` continuam disparando sem duplicação

### Conferência de namespace de eventos

Os 15 eventos que vocês já empurram para o `dataLayer` (de `src/lib/qualify/tracking.ts`) - `qualify_view`, `qualify_step_view`, `qualify_step_answer`, `qualify_monthly_comfort`, `fit_questions_completed`, `qualify_result_shown`, `qualify_high_intent`, `qualify_disqualified`, `qualify_submitted`, `book_assessment_after_estimate`, `start_application_after_estimate`, `lead_typebot`, `ab_test_assigned`, `ab_test_view`, `ab_test_cta_click` - **não colidem** com os eventos novos do AnalyticsProvider (`session_started`, `page_context_loaded`, `cta_clicked`, `link_clicked`, `form_submit_attempted`, `form_field_invalid`, `page_scroll_summary`, `js_error`, `unhandled_promise_rejection`, `user_identified`). Tags GTM existentes seguem disparando exatamente como antes.

### Smoke test depois de ativar

1. `npm run build` deve passar sem warnings novos
2. Carregar `/` → DevTools Network confirmar que `gtm.js?id=GTM-TQV5KW2K` carrega **exatamente uma vez** (zero double-init de GTM) e `redditstatic.com/ads/pixel.js?pixel_id=a2_izohry8y9k7k` carrega **exatamente uma vez**
3. Setar `NEXT_PUBLIC_NEXTDOOR_PIXEL_ID` no Vercel (e opcionalmente `NEXT_PUBLIC_POSTHOG_KEY` se quiserem PostHog independente do GTM) → recarregar → confirmar que `ads.nextdoor.com/public/pixel/ndp.js` carrega
4. Clicar em CTAs de várias páginas - confirmar eventos `cta_clicked { cta_label: ... }` no PostHog Live Events
5. Modo Preview do GTM em `GTM-TQV5KW2K` - todas as tags existentes disparam normalmente, nenhuma tag nova dispara por engano

### Rollback do opt-in

`git revert` do commit de mount no `layout.tsx`. AnalyticsProvider volta a só rodar dentro das LPs. Zero estado para desfazer.

---

## Side note — Recomendação de WordPress headless (follow-up opcional)

O copy das LPs está hardcoded em TSX nessas duas páginas (grau sandbox — rápido para ir ao ar, lento para iterar). Este site já tem a infraestrutura para tornar o copy das LPs editável pelo `wp-admin` sem engenharia. **Vocês estão 80% lá.**

### O que já existe no prod

- WordPress com plugin WPGraphQL rodando em `eos-e.com/blog` (conforme `wordpress-setup.md` na raiz do repo)
- Padrão de webhook de revalidação documentado (`functions.php` posta para `/api/revalidate` no publish)
- Next.js 16 com App Router, Cache Components e `revalidateTag` já disponíveis

O que falta é apenas: custom post types (CPTs) para conteúdo não-blog, uma rota de API que consuma eles, e uma pequena camada de fetch.

### O que o WP headless destravaria para as LPs

Sair de "qualquer mudança de copy é mudança de código" para "qualquer pessoa com acesso de editor pode trocar uma headline, um preço, uma estatística, uma resposta de FAQ ou um label de CTA sem deploy."

| Conteúdo hoje hardcoded em TSX | Poderia viver como campo de CPT no WP |
|---|---|
| Headline + subhead + eyebrow do hero | Options page (bloco por LP) |
| Preço + linhas de spec do picker de 3 tiers | CPT `plan` com `cash_price`, `kwh_usable`, `runtime_hours` |
| Números do StatsRow (ex.: "25 kW V2X bidirecional", "23 kW PV") | CPT `lp_stat` |
| Respostas do bloco de FAQ | CPT `faq_entry` com taxonomia `category` |
| Alt-text e legendas das imagens do carrossel | CPT `lp_image` com `alt`, `caption`, `order` |
| Copy narrativo das seções | Options page (blocos por seção) |

### Arquitetura

```
WordPress (Hostinger)              Next.js (Vercel)
─────────────────────              ────────────────
edit no wp-admin → publish   ──→   webhook em functions.php
                                    ↓
                              POST /api/revalidate { secret, tag: 'lp-content' }
                                    ↓
                              revalidateTag('lp-content')
                                    ↓
                              páginas da LP re-renderizam no próximo request (ISR)
```

Os arquivos `page.tsx` das LPs fariam fetch do WPGraphQL em build time com cache tag `'lp-content'`. O webhook dispara no publish → tag invalida → próximo request reconstrói o prerender estático. Propagação média: 5–15 segundos ponta a ponta. UX editorial bate com o modelo mental "publicar post e atualizar a página."

### O que NÃO move para o WP

- Todo o layout dos componentes TSX e estrutura do JSX
- Wiring de tracking / analytics + mapas de seletores
- Lógica do fluxo de qualify + regras de scoring
- Tokens de design, CSS, utilidades de glass
- Pipeline de build + middleware

A divisão: **dados no WP, apresentação em TSX.** Tudo que é string, número, preço, URL de imagem, alt-text — WP. Tudo que é estrutura, comportamento, animação ou geometria — TSX.

### Rollout faseado (se forem em frente)

1. **Fase 0 — Subir um CPT.** Registrar `faq_entry` primeiro (menor blast radius). Conectar um bloco de FAQ de uma LP para fazer fetch de `/api/wp/faq` com `cacheTag: 'lp-content'`. Time editorial ganha um item para testar o loop.
2. **Fase 1 — Options page para copy do hero.** Uma Options page no WP expõe `lp_lightning_hero_headline`, `lp_generator_hero_headline` etc. LPs fazem fetch da mesma rota `/api/wp/...`.
3. **Fase 2 — CPTs de stats + plan pricing.** Mover os números. Aqui é onde marketing recupera mais ciclos (mudanças de preço sobem sem engenharia).
4. **Fase 3 — Imagens do carrossel.** Mover os arrays de items do carrossel. Editorial pode adicionar/remover fotos de instalação conforme elas chegam.

### Trade-offs para considerar

- ✅ Edições não-engenheiro no nível de copy e preço (a maior parte da iteração das LPs)
- ✅ Reaproveita a infraestrutura WPGraphQL existente — nenhuma ferramenta nova ou dependência de SaaS
- ✅ Preview editorial built-in, estado de draft, publish agendado, histórico de versões (padrão do WP)
- ⚠️ Adiciona uma peça móvel — outage / lentidão do endpoint do WP afeta tempo de build (mitigado com cache stale-while-revalidate)
- ⚠️ Disciplina editorial necessária — decisões de copy passam a viver em dois lugares (CMS para conteúdo, código para estrutura). Precisa de regra "fonte única da verdade" por campo
- ⚠️ Wiring inicial da Fase 0 é trabalho real (4–8 horas de engenharia) antes do editor ver benefício
- ⚠️ Cache tags do ISR são feature do Next.js 16+ — atrelado à versão atual da stack

### Fora do escopo deste PR

Esta recomendação é uma nota lateral para o roadmap de vocês. **Este PR envia zero código WordPress.** As LPs sobem com copy hardcoded em TSX, que é a chamada certa para colocar tráfego de anúncios nas novas URLs ASAP. A migração para WP headless é uma conversa de Fase 2 se/quando o time editorial quiser o ciclo de volta.
