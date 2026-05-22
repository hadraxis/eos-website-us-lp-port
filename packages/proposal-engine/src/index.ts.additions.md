# Additions to `packages/proposal-engine/src/index.ts`

Apos copiar os novos arquivos, adicione estes exports ao **final** do `index.ts`:

```ts
// EV battery presets (autofill conservador)
export {
  buildEvBatteryPresetSet,
  getConservativeEvCapacityKwh,
  hasEvBatteryPreset,
  listEvBatteryPresets,
  type EvBatteryPreset,
  type EvBatteryPresetSet,
} from './ev-battery-presets'

// Aurora bridge (integracao com aurora-engine)
export {
  buildProposalEmbeddingText,
  generateProposalNarrative,
  suggestCoverAsset,
  type AuroraIdeationFn,
  type AuroraImageMatch,
  type AuroraImageSearchFn,
  type AuroraNarrativeContext,
} from './aurora-bridge'
```
