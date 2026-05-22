// src/lib/angle-defaults.ts

export interface AngleConfig {
  current_setup: string | null;
  primary_pain: string | null;
  backup_scope: string | null;
  note: string;
}

export const ANGLE_DEFAULTS: Record<string, AngleConfig> = {
  generator_alternative: {
    current_setup: 'generator',
    primary_pain: 'outages',
    backup_scope: 'hvac_and_core_home',
    note: "Looking for a generator alternative? You\u2019re in the right place. Let\u2019s find the right system for your home.",
  },
  home_office_continuity: {
    current_setup: 'none',
    primary_pain: 'continuity',
    backup_scope: 'office_and_network',
    note: "Let\u2019s figure out what it takes to keep your office stable through Houston\u2019s brownouts.",
  },
  battery_first: {
    current_setup: 'none',
    primary_pain: 'solar_gaps',
    backup_scope: 'critical_loads',
    note: 'Planning to add solar later? This system is designed for exactly that.',
  },
  solar_control_layer: {
    current_setup: 'solar',
    primary_pain: 'solar_gaps',
    backup_scope: 'hvac_and_core_home',
    note: "Already have solar? Great \u2014 let\u2019s see how battery storage fits your existing setup.",
  },
  remote_confidence: {
    current_setup: 'none',
    primary_pain: 'remote_confidence',
    backup_scope: 'hvac_and_core_home',
    note: "Let\u2019s find a system that keeps your home running perfectly while you\u2019re away.",
  },
};

export function getAngleConfig(angle: string): AngleConfig | null {
  return ANGLE_DEFAULTS[angle] ?? null;
}
