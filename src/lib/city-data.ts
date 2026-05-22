// src/lib/city-data.ts

export type CityRecord = {
  zip: string;
  city: string;
  county: string;
  cluster: 'premium' | 'standard';
};

// Premium ZIPs from qualification scorecard
const PREMIUM_ZIPS = new Set([
  '77005', '77019', '77024', '77380', '77401', '77494',
]);

// Houston metro ZIP → city mapping
// Covers the 5 service area cities + Houston proper
const ZIP_MAP: Record<string, { city: string; county: string }> = {
  // Houston core
  '77001': { city: 'Houston', county: 'Harris' },
  '77002': { city: 'Houston', county: 'Harris' },
  '77003': { city: 'Houston', county: 'Harris' },
  '77004': { city: 'Houston', county: 'Harris' },
  '77005': { city: 'Houston', county: 'Harris' },
  '77006': { city: 'Houston', county: 'Harris' },
  '77007': { city: 'Houston', county: 'Harris' },
  '77008': { city: 'Houston', county: 'Harris' },
  '77009': { city: 'Houston', county: 'Harris' },
  '77010': { city: 'Houston', county: 'Harris' },
  '77011': { city: 'Houston', county: 'Harris' },
  '77012': { city: 'Houston', county: 'Harris' },
  '77013': { city: 'Houston', county: 'Harris' },
  '77014': { city: 'Houston', county: 'Harris' },
  '77015': { city: 'Houston', county: 'Harris' },
  '77016': { city: 'Houston', county: 'Harris' },
  '77017': { city: 'Houston', county: 'Harris' },
  '77018': { city: 'Houston', county: 'Harris' },
  '77019': { city: 'Houston', county: 'Harris' },
  '77020': { city: 'Houston', county: 'Harris' },
  '77021': { city: 'Houston', county: 'Harris' },
  '77022': { city: 'Houston', county: 'Harris' },
  '77023': { city: 'Houston', county: 'Harris' },
  '77024': { city: 'Houston', county: 'Harris' },
  '77025': { city: 'Houston', county: 'Harris' },
  '77026': { city: 'Houston', county: 'Harris' },
  '77027': { city: 'Houston', county: 'Harris' },
  '77028': { city: 'Houston', county: 'Harris' },
  '77029': { city: 'Houston', county: 'Harris' },
  '77030': { city: 'Houston', county: 'Harris' },
  '77031': { city: 'Houston', county: 'Harris' },
  '77032': { city: 'Houston', county: 'Harris' },
  '77033': { city: 'Houston', county: 'Harris' },
  '77034': { city: 'Houston', county: 'Harris' },
  '77035': { city: 'Houston', county: 'Harris' },
  '77036': { city: 'Houston', county: 'Harris' },
  '77037': { city: 'Houston', county: 'Harris' },
  '77038': { city: 'Houston', county: 'Harris' },
  '77039': { city: 'Houston', county: 'Harris' },
  '77040': { city: 'Houston', county: 'Harris' },
  '77041': { city: 'Houston', county: 'Harris' },
  '77042': { city: 'Houston', county: 'Harris' },
  '77043': { city: 'Houston', county: 'Harris' },
  '77044': { city: 'Houston', county: 'Harris' },
  '77045': { city: 'Houston', county: 'Harris' },
  '77046': { city: 'Houston', county: 'Harris' },
  '77047': { city: 'Houston', county: 'Harris' },
  '77048': { city: 'Houston', county: 'Harris' },
  '77049': { city: 'Houston', county: 'Harris' },
  '77050': { city: 'Houston', county: 'Harris' },
  '77051': { city: 'Houston', county: 'Harris' },
  '77053': { city: 'Houston', county: 'Harris' },
  '77054': { city: 'Houston', county: 'Harris' },
  '77055': { city: 'Houston', county: 'Harris' },
  '77056': { city: 'Houston', county: 'Harris' },
  '77057': { city: 'Houston', county: 'Harris' },
  '77058': { city: 'Houston', county: 'Harris' },
  '77059': { city: 'Houston', county: 'Harris' },
  '77060': { city: 'Houston', county: 'Harris' },
  '77061': { city: 'Houston', county: 'Harris' },
  '77062': { city: 'Houston', county: 'Harris' },
  '77063': { city: 'Houston', county: 'Harris' },
  '77064': { city: 'Houston', county: 'Harris' },
  '77065': { city: 'Houston', county: 'Harris' },
  '77066': { city: 'Houston', county: 'Harris' },
  '77067': { city: 'Houston', county: 'Harris' },
  '77068': { city: 'Houston', county: 'Harris' },
  '77069': { city: 'Houston', county: 'Harris' },
  '77070': { city: 'Houston', county: 'Harris' },
  '77071': { city: 'Houston', county: 'Harris' },
  '77072': { city: 'Houston', county: 'Harris' },
  '77073': { city: 'Houston', county: 'Harris' },
  '77074': { city: 'Houston', county: 'Harris' },
  '77075': { city: 'Houston', county: 'Harris' },
  '77076': { city: 'Houston', county: 'Harris' },
  '77077': { city: 'Houston', county: 'Harris' },
  '77078': { city: 'Houston', county: 'Harris' },
  '77079': { city: 'Houston', county: 'Harris' },
  '77080': { city: 'Houston', county: 'Harris' },
  '77081': { city: 'Houston', county: 'Harris' },
  '77082': { city: 'Houston', county: 'Harris' },
  '77083': { city: 'Houston', county: 'Harris' },
  '77084': { city: 'Houston', county: 'Harris' },
  '77085': { city: 'Houston', county: 'Harris' },
  '77086': { city: 'Houston', county: 'Harris' },
  '77087': { city: 'Houston', county: 'Harris' },
  '77088': { city: 'Houston', county: 'Harris' },
  '77089': { city: 'Houston', county: 'Harris' },
  '77090': { city: 'Houston', county: 'Harris' },
  '77091': { city: 'Houston', county: 'Harris' },
  '77092': { city: 'Houston', county: 'Harris' },
  '77093': { city: 'Houston', county: 'Harris' },
  '77094': { city: 'Houston', county: 'Harris' },
  '77095': { city: 'Houston', county: 'Harris' },
  '77096': { city: 'Houston', county: 'Harris' },
  '77098': { city: 'Houston', county: 'Harris' },
  '77099': { city: 'Houston', county: 'Harris' },
  // Katy
  '77449': { city: 'Katy', county: 'Harris / Fort Bend' },
  '77450': { city: 'Katy', county: 'Harris / Fort Bend' },
  '77491': { city: 'Katy', county: 'Fort Bend' },
  '77492': { city: 'Katy', county: 'Fort Bend' },
  '77493': { city: 'Katy', county: 'Fort Bend' },
  '77494': { city: 'Katy', county: 'Fort Bend' },
  // Sugar Land
  '77478': { city: 'Sugar Land', county: 'Fort Bend' },
  '77479': { city: 'Sugar Land', county: 'Fort Bend' },
  '77496': { city: 'Sugar Land', county: 'Fort Bend' },
  '77498': { city: 'Sugar Land', county: 'Fort Bend' },
  // Pearland
  '77581': { city: 'Pearland', county: 'Brazoria' },
  '77584': { city: 'Pearland', county: 'Brazoria' },
  '77588': { city: 'Pearland', county: 'Brazoria' },
  // The Woodlands
  '77380': { city: 'The Woodlands', county: 'Montgomery' },
  '77381': { city: 'The Woodlands', county: 'Montgomery' },
  '77382': { city: 'The Woodlands', county: 'Montgomery' },
  '77384': { city: 'The Woodlands', county: 'Montgomery' },
  '77385': { city: 'The Woodlands', county: 'Montgomery' },
  '77386': { city: 'The Woodlands', county: 'Montgomery' },
  '77389': { city: 'The Woodlands', county: 'Montgomery' },
  // Bellaire (premium enclave)
  '77401': { city: 'Bellaire', county: 'Harris' },
};

export function lookupZip(zip: string): CityRecord | null {
  const normalized = zip.trim().slice(0, 5);
  const entry = ZIP_MAP[normalized];
  if (!entry) return null;
  return {
    zip: normalized,
    city: entry.city,
    county: entry.county,
    cluster: PREMIUM_ZIPS.has(normalized) ? 'premium' : 'standard',
  };
}

export function isInServiceArea(zip: string): boolean {
  return lookupZip(zip) !== null;
}

export function isPremiumZip(zip: string): boolean {
  return lookupZip(zip)?.cluster === 'premium';
}

export function extractZip(input: string): string | null {
  const match = input.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}
