# @repo/proposal-mcp

Servidor MCP (stdio) que expoe o Proposal Generator pra controle agentico — feito pro **Aurora** consumir via seu cliente MCP/Gemini.

## Tools disponiveis

| Tool | O que faz |
|---|---|
| `health` | Sanity check de conexao |
| `list_plans` | Lista todos os bundle templates (Essential, Plus, Pro, Premium, Ultimate + comercial) |
| `get_catalog` | Pega o pricing_catalog ativo completo (items + bundles + rules + finance) |
| `price_config` | So charge_defaults + finance + rules |
| `list_ev_presets` | Lista todos os EVs mapeados com capacidade nominal |
| `get_ev_capacity` | Capacidade conservadora (kWh) por evId — usa pra autofill do builder |
| `list_proposals` | Lista propostas com filtros (status, search, customerId) |
| `get_proposal` | Pega uma proposta por id ou proposalNumber |
| `create_proposal` | Cria proposta — aceita sourcePayload pra preservar provenance |
| `patch_proposal` | Patch parcial — muda status, system, pricing etc |
| `delete_proposal` | Deleta (use status=VOID em vez, geralmente) |
| `render_model` | Render model completo (vem da VIEW SQL — fast path) |
| `render_asset_lookup` | Asset lookup payload (covers + layouts + stacks) via VIEW |
| `create_share_link` | Gera token rastreavel pra envio |
| `list_share_events` | Eventos (click/view) de um share link |

## Rodar

```bash
bun install
bun run --cwd packages/proposal-mcp start
```

Variavel `DATABASE_URL` deve estar setada (vem do `.env` do monorepo).

## Conectar no Aurora

Aurora usa Gemini + MCP client. Config sugerida (em `packages/aurora-engine` ou no agent que faz a orquestracao):

```json
{
  "mcpServers": {
    "eos-proposal": {
      "command": "bun",
      "args": ["run", "--cwd", "packages/proposal-mcp", "start"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

Apos conectar, Aurora ve as tools como functions chamaveis pelo Gemini.

## Casos de uso (Aurora-driven)

### 1. Auto-draft de proposta a partir do CRM
```
1. Aurora puxa customer + jtbd do CRM (ja faz isso)
2. Aurora chama list_plans pra ver o catalogo
3. Aurora chama get_ev_capacity({ evId: customer.evModel })
4. Aurora chama create_proposal com system + pricing montados
5. Aurora chama create_share_link, manda email
```

### 2. Atualizacao em batch de status
```
1. Aurora chama list_proposals({ status: 'SENT' })
2. Pra cada uma, list_share_events({ proposalNumber })
3. Se evento 'click' > 7 dias atras sem aceite, patch_proposal({ status: 'EXPIRED' })
```

### 3. Sugestao de cover EV
```
1. Aurora chama list_ev_presets
2. Cross-ref com Pipedrive person property "vehicle_model"
3. Patch proposal.system.coverArtKey + autofill V2X capacity via get_ev_capacity
```

## Source payload (provenance)

Tools de create/patch aceitam `sourcePayload` — payload bruto da origem. Vai pra coluna `proposal.source_payload` (jsonb).

Quando Aurora cria uma proposta automaticamente, sempre passe o contexto da decisao:
```json
{
  "sourcePayload": {
    "aurora": {
      "skill": "auto-draft-from-crm",
      "decisionTrace": [...],
      "modelVersion": "gemini-2.5-flash",
      "timestamp": "..."
    }
  }
}
```

Facilita debug + re-treino futuro.

## Limitacoes

- Nao expoe `export_pdf` (precisa de Playwright + dev server rodando — fica fora do MCP)
- Render model vem da view, entao o cover asset + visual model ainda precisam do builder JS pra layout fino. Pra preview rapida ja serve.
- Permission check: o MCP roda com a mesma role do DB user — nao tem CASL gating como o tRPC. Considere rodar como service account com permissoes scoped.
