import { SCENARIOS } from './scenarios';

/** How scenarios relate to CJA reporting vs Tealium CDP identity edges (from stakeholder email, Apr 2026). */
export type ScenarioPerspective = 'all' | 'cjaReporting' | 'tealiumCdp';

const TAGS: Record<number, ('cja_reporting' | 'tealium_cdp')[]> = {
  1: ['tealium_cdp'],
  2: ['cja_reporting'],
  3: ['cja_reporting'],
  4: ['cja_reporting'],
  5: ['cja_reporting'],
  6: ['cja_reporting'],
  7: ['cja_reporting', 'tealium_cdp'],
  8: ['tealium_cdp'],
  9: ['cja_reporting'],
  10: ['cja_reporting'],
  11: ['cja_reporting'],
  12: ['cja_reporting'],
  13: ['cja_reporting'],
  14: ['cja_reporting'],
  15: ['cja_reporting'],
  16: ['cja_reporting'],
  17: ['cja_reporting'],
  18: ['cja_reporting'],
  19: ['tealium_cdp'],
  20: ['cja_reporting'],
  21: ['tealium_cdp'],
  22: ['tealium_cdp'],
  23: ['cja_reporting'],
  24: ['cja_reporting'],
};

const TAG_FOR_LENS: Record<Exclude<ScenarioPerspective, 'all'>, 'cja_reporting' | 'tealium_cdp'> = {
  cjaReporting: 'cja_reporting',
  tealiumCdp: 'tealium_cdp',
};

export function scenariosForPerspective(perspective: ScenarioPerspective) {
  if (perspective === 'all') return SCENARIOS;
  const tag = TAG_FOR_LENS[perspective];
  return SCENARIOS.filter(s => TAGS[s.id]?.includes(tag));
}
