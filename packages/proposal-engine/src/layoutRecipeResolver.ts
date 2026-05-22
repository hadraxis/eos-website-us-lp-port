// @ts-nocheck
/* Portado verbatim do standalone (src/lib/layoutRecipeResolver.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
export function resolveLayoutRecipe(lookup, visualItems) {
  const stackCount = visualItems.filter((item) => item.assetRole === 'stack').length;
  const hasV2x = visualItems.some((item) => item.assetRole === 'stack' && item.v2x);

  let recipeId = 'panel-stack';
  if (stackCount >= 3) {
    recipeId = 'panel-stack-stack-stack';
  } else if (stackCount === 2) {
    recipeId = 'panel-stack-stack';
  } else if (stackCount === 1 && hasV2x) {
    recipeId = 'panel-stack-v2x';
  }

  const recipe =
    lookup.layoutRecipes.find((item) => item.canonicalId === recipeId) ??
    lookup.layoutRecipes.find((item) => item.canonicalId === 'panel-stack');

  return {
    id: recipe?.canonicalId ?? 'panel-stack',
    ratios: String(recipe?.ratioSpec || '38|62')
      .split('|')
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0),
    gapPx: Number(recipe?.gapPx ?? 24),
    align: recipe?.align || 'center',
  };
}
