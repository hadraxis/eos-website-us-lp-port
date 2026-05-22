// @ts-nocheck
/* Portado verbatim do standalone (src/lib/assetLookupModel.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
export function buildAssetLookup(lookupSource) {
  const rows = Array.isArray(lookupSource.rows) ? lookupSource.rows.filter((row) => row.active) : [];
  const byType = rows.reduce((result, row) => {
    if (!result[row.entityType]) {
      result[row.entityType] = [];
    }
    result[row.entityType].push(row);
    return result;
  }, {});

  return {
    rows,
    byType,
    layoutRecipes: byType.layoutRecipe ?? [],
    coverAssets: byType.coverAsset ?? [],
    stackVisuals: byType.stackVisual ?? [],
    componentVisuals: byType.componentVisual ?? [],
  };
}
