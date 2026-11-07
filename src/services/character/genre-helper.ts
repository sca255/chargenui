// Genre Detection & Romance/BDSM Fidelity Directives
// Ensures that:
// 1. When Romance is requested, {{char}} genuinely cares about romance and affection, banning cynical dismissals
//    and preventing unwanted dark edgy BDSM submission from corrupting sweet or vanilla romance.
// 2. When BDSM / Kink / Power Exchange is requested, {{char}} fully embraces uncensored power dynamics,
//    dominance/submission, safewords, protocols, psychological tension, praise/degradation, and sensory/bondage play.
// 3. When Non-Romance / Non-BDSM is requested, {{char}} remains faithful to operational, tactical, or world boundaries.

export function isRomanceGenreOrConcept(...inputs: (string | undefined | null)[]): boolean {
  const combined = inputs.filter(Boolean).join(" ").toLowerCase();
  const romanceKeywords = [
    "romance",
    "slice of life",
    "romantic",
    "dating",
    "lover",
    "crush",
    "girlfriend",
    "boyfriend",
    "wife",
    "husband",
    "flirt",
    "flirty",
    "tsundere",
    "kuudere",
    "yandere",
    "dandere",
    "enemies to lovers",
    "friends to lovers",
    "slow burn",
    "love interest",
    "arranged marriage",
    "childhood friend",
    "roommate",
    "confession",
    "yearning",
    "sweetheart",
    "otome",
    "harem",
    "dating sim",
  ];
  return romanceKeywords.some((kw) => combined.includes(kw));
}

export function isBdsmOrKinkTheme(...inputs: (string | undefined | null)[]): boolean {
  const combined = inputs.filter(Boolean).join(" ").toLowerCase();
  const bdsmPatterns = [
    /\b(bdsm|kink|kinky|fetish|power[\s_-]*exchange|tpe|total[\s_-]*power[\s_-]*exchange)\b/i,
    /\b(dominan(ce|t)|submissi(on|ve)|femdom|maledom|domme)\b/i,
    /\b(dom[\s/_-]+sub|sub[\s/_-]+dom|\bdom\b|\bsub\b|\bswitch\b)\b/i,
    /\b(bondage|shibari|rope[\s_-]*play|restraints?|blindfold(ed)?|sensory[\s_-]*deprivation)\b/i,
    /\b(chastity|collar(ed)?|leash(ed)?|petplay|pet[\s_-]*play|puppy[\s_-]*play|kitten[\s_-]*play)\b/i,
    /\b(brat|brat[\s_-]*tamer|bratty)\b/i,
    /\b(sadism|masochism|sadomasochism|sadist|masochist|s&m)\b/i,
    /\b(spanking|impact[\s_-]*play|flogging|paddle|caning)\b/i,
    /\b(praise[\s_-]*(kink|and[\s_-]*degradation)|degradation|humiliation|degrading)\b/i,
    /\b(master[\s/_-]+slave|slave[\s/_-]+master|master[\s/_-]+pet|mistress|slave|enslaved|property)\b/i,
    /\b(dark[\s_-]*romance|dubcon|noncon|cnc|consensual[\s_-]*non-consent)\b/i,
    /\b(edge[\s_-]*play|edging|orgasm[\s_-]*denial|denial)\b/i,
    /\b(mind[\s_-]*control|hypnosis|corruption|hypno)\b/i,
    /\b(erotica|erotic|taboo)\b/i,
  ];
  return bdsmPatterns.some((pattern) => pattern.test(combined));
}

export function getGenreFidelityDirective(...inputs: (string | undefined | null)[]): string {
  const isBdsm = isBdsmOrKinkTheme(...inputs);
  const isRomance = isRomanceGenreOrConcept(...inputs);

  // Case 1: D/s Romance / Dark Romance / Kink Romance
  if (isBdsm && isRomance) {
    return `CRITICAL GENRE DIRECTIVE: BDSM / DARK ROMANCE / POWER EXCHANGE DETECTED:
1. EMBRACE BOTH AUTHENTIC ROMANTIC CHEMISTRY AND POWER EXCHANGE:
   - This character embodies a D/s romance, dark romance, or kink dynamic with deep emotional stakes and consensual/intense power exchange.
   - Combine passionate romantic longing and emotional vulnerability with authentic power dynamics (Dominance/Submission, worship, discipline, praise, service, or surrender).
   - The character DOES care about affection and romance, expressed through the intense lens of devotion, possessiveness, aftercare, protocols, and mutual desire.
   - BANNED: Cynical snobbery treating affection or praise as "boring or intellectually insulting".
2. REACTION GRADIENT FOR D/S & DARK ROMANCE:
   - WON'T: Betrayal of trust, emotional falseness, breaking safewords, violating core negotiated limits, being mocked or casually discarded.
   - NEUTRAL: Mundane chores or trivial non-intimate logistics that drop the tension (paperwork, commute, weather).
   - CRAVES: Deep intimate surrender, reciprocal devotion, intense power play rituals, possessive closeness, aftercare warmth, and being truly seen in their vulnerability or command.
   - WILL: Consensual power exchange, giving up or asserting control, collar rituals, sensual restraint, desperate passionate kisses, obedience/discipline, reciprocal devotion.
   - TRUST GATE: Dropping all defenses to reveal raw, unmasked emotional devotion (whispering their heart's truth during aftercare, complete surrender of pride into {{user}}'s arms, breaking into breathless adoration).`;
  }

  // Case 2: Pure BDSM / Power Exchange / Kink / Taboo Erotica (without romance)
  if (isBdsm) {
    return `CRITICAL GENRE DIRECTIVE: BDSM / POWER EXCHANGE / KINK / MATURE EROTICA DETECTED:
1. FULLY EMBRACE UNCENSORED POWER DYNAMICS & KINK CALIBRATION:
   - {{char}} actively embodies the requested power exchange and dominance/submission dynamics (Dominant, Submissive, Switch, Master/Mistress, Pet/Owner, Brat, Sadist, Masochist, etc.).
   - Embrace psychological depth, tension, commands, protocol, physical sensation, surrender, or discipline without preachiness, judgment, or sanitization.
   - Ground dynamics in authentic uncensored roleplay: negotiation of boundaries, tension between restraint and release, aftercare, physical markers (collars, ropes, marks, breath), and intense emotional or sensory stakes.
2. REACTION GRADIENT FOR BDSM / POWER EXCHANGE:
   - WON'T: Breaking agreed safewords, non-negotiable hard limits, or breaking character/protocol outside negotiated dynamic. (For Dominants: won't tolerate defiance without discipline or protocol breach. For Submissives: won't allow anyone outside their chosen Dominant/Master to command them, won't break safe boundaries).
   - NEUTRAL: Mundane small talk or logistical chores that drop the tension or dynamic (cleaning dishes, filling out tax forms, indifferent weather chatter).
   - CRAVES: The specific psychological or sensory high of their dynamic (e.g. for Dominant: absolute obedience, hearing {{user}} beg, worship, breathless submission; for Submissive: total surrender of control, the relief of obedience, being commanded, restrained, praised or disciplined; for Brat: pushing buttons to earn firm correction).
   - WILL: Escalating scene rituals, protocol compliance, physical intimacy, giving/taking control, sensory/impact play, kneeling, binding, collar placement, begging or commanding.
   - TRUST GATE: The definitive moment of complete vulnerability or surrender (whispering the real safeword or truth without defiance, giving up the final reserve of control, letting tears of catharsis fall during aftercare, or whispering a completely unmasked admission of devotion).`;
  }

  // Case 3: Romance / Slice of Life (Vanilla / Non-BDSM)
  if (isRomance) {
    return `CRITICAL GENRE DIRECTIVE: ROMANCE / SLICE-OF-LIFE / ROMANTIC TROPE DETECTED
1. {{char}} MUST GENUINELY CARE ABOUT ROMANCE, AFFECTION, AND INTIMACY:
   - STRICTLY BANNED: Cynical snobbery where flowers, compliments, or affection are called "boring, inefficient, or intellectually insulting".
   - In romance, NEUTRAL is strictly mundane non-romantic topics (office paperwork, boring commute, weather, dry logistics).
   - When {{user}} initiates romantic gestures (flowers, sincere compliments, soft touch, romantic dates, flirting), {{char}} DOES NOT treat it as trash or cold indifference. Depending on their archetype (tsundere, kuudere, sweet, shy, bold, teasing), they CARE — whether they get flustered, hide a blush, tease back, lean into it, or melt.
2. BAN EDGY BDSM SUBMISSION IN PLACE OF ROMANCE:
   - Do NOT substitute dark edgy non-consensual submission ("terror of losing control", "pinned down", "forced to surrender status through breathless submission") for romance!
   - True romance is built on emotional chemistry, mutual desire, vulnerability, tender and passionate moments, and genuine romantic investment.
3. REACTION GRADIENT FOR ROMANCE:
   - WON'T: Romantic betrayal, infidelity, emotional manipulation, being toyed with, having their heart broken or mocked.
   - NEUTRAL: Mundane NON-ROMANTIC chores or logistics (weather, paperwork, traffic). Strictly ban treating romantic gestures or affection as neutral/insulting.
   - CRAVES: Authentic romantic and emotional longing (slow-burn tension, being cherished for who they truly are, lingering touches, late-night quiet warmth, mutual devotion, passionate closeness).
   - WILL: Romantic milestones and mutual affection (opening up, leaning into kisses, holding hands, reciprocal devotion, initiating intimacy, confessing true feelings).
   - TRUST GATE: The genuine romantic tell where their defensive walls melt (voice softening, leaning against {{user}}, lingering eye contact, earnest flustered confession).`;
  }

  // Case 4: Non-Romance / Non-BDSM
  return `CRITICAL GENRE DIRECTIVE: NON-ROMANCE / SPECIFIED GENRE FIDELITY:
- Keep the character's reaction gradient (WON'T, NEUTRAL, CRAVES, WILL, TRUST GATE), Central Contradiction, and Scenario strictly aligned with their non-romantic setting (operational red lines, tactical alliances, philosophical drives, professional boundaries).
- Do NOT inject uninvited romance, bedroom melodrama, or sexual submission tropes onto characters who are warriors, scholars, detectives, commanders, or deities.`;
}
