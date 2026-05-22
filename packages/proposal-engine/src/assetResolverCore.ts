// @ts-nocheck
/* Portado verbatim do standalone (src/lib/assetResolverCore.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
import { resolveLayoutRecipe } from './layoutRecipeResolver';
import { shouldShowSmartPanelVisual } from './proposalVisibility';

function findCoverAsset(lookup, evId) {
  return (
    lookup.coverAssets.find((asset) => asset.canonicalId === evId) ??
    lookup.coverAssets.find((asset) => asset.canonicalId === 'default-ev')
  );
}

function findPanelAsset(lookup) {
  return lookup.componentVisuals.find((asset) => asset.canonicalId === 'smart-panel');
}

function findStackAsset(lookup, batteryCount, v2x) {
  return lookup.stackVisuals.find(
    (asset) => Number(asset.batteryCount) === Number(batteryCount) && Boolean(asset.v2x) === Boolean(v2x)
  );
}

function getStackDisplayLabel(asset, stackIndex, stackCount) {
  if (stackCount <= 1) {
    return asset.displayLabel;
  }

  return `Battery Stack ${stackIndex + 1}`;
}

function getCaption(option) {
  const stackCount = option.system.stacks.length;
  const hasV2x = option.system.stacks.some((stack) => stack.v2x);
  const maxBatteryCount = hasV2x ? 5 : 6;
  const maxKwh = maxBatteryCount * 9;
  const largestStackBatteryCount = Math.max(
    0,
    ...option.system.stacks.map((stack) => Number(stack.batteryCount) || 0)
  );
  const remainingBatteryCount = Math.max(0, maxBatteryCount - largestStackBatteryCount);
  const addMoreText =
    remainingBatteryCount > 0
      ? `Add up to ${remainingBatteryCount} more ${remainingBatteryCount === 1 ? 'battery module' : 'battery modules'} in this stack.`
      : `This stack is at the ${maxKwh} kWh maximum.`;
  const contextLabel = hasV2x ? 'With V2X' : 'Without V2X';
  const capacityText = `${contextLabel}, stack capacity up to ${maxKwh} kWh (${maxBatteryCount} battery modules).`;
  const singleStackText = `${capacityText} ${addMoreText}`;

  return {
    captionTitle: 'Stack capacity',
    captionBody:
      stackCount > 1
        ? `${contextLabel}, each stack supports up to ${maxKwh} kWh (${maxBatteryCount} battery modules).`
        : singleStackText,
  };
}

function resolveOptionVisualModel(lookup, option) {
  const panelAsset = findPanelAsset(lookup);
  const stackCount = option.system.stacks.length;
  const stackAssets = option.system.stacks
    .map((stack, index) => {
      const asset = findStackAsset(lookup, stack.batteryCount, stack.v2x);
      if (!asset) {
        return null;
      }

      return {
        id: `${asset.canonicalId}-${index}`,
        assetRole: 'stack',
        v2x: stack.v2x,
        displayLabel: getStackDisplayLabel(asset, index, stackCount),
        imageSrc: `/${asset.imageRef}`,
      };
    })
    .filter(Boolean);

  const visualItems = [];
  if (panelAsset && shouldShowSmartPanelVisual(option.system)) {
    visualItems.push({
      id: panelAsset.canonicalId,
      assetRole: 'panel',
      v2x: false,
      displayLabel: panelAsset.displayLabel,
      imageSrc: `/${panelAsset.imageRef}`,
    });
  }

  visualItems.push(...stackAssets);

  return {
    layoutRecipe: resolveLayoutRecipe(lookup, visualItems),
    visualItems,
    ...getCaption(option),
  };
}

export function buildProposalRenderModelFromLookup(lookup, proposalState) {
  const primaryOption = proposalState.proposalOptions[0];
  const coverAsset = findCoverAsset(lookup, primaryOption?.system?.evId);

  const options = proposalState.proposalOptions.map((option) => ({
    ...option,
    visualModel: resolveOptionVisualModel(lookup, option),
  }));

  return {
    proposal: proposalState,
    coverAsset: {
      canonicalId: coverAsset?.canonicalId || 'default-ev',
      displayLabel: coverAsset?.displayLabel || 'Default EV Cover',
      imageSrc: `/${coverAsset?.imageRef || 'proposal-assets/covers/ev/ford-f150-lightning.png'}`,
    },
    options,
    primaryOption: options[0] ?? null,
  };
}
