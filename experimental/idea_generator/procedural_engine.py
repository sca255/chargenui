#!/usr/bin/env python3
"""
Advanced Psychometric Procedural Character Engine
A high-depth procedural generator for uncensored roleplay concepts,
specializing in complex marital dynamics, domestic discipline, power exchange,
sensory grounding, and rich psychological contradictions.

Supports:
- Multi-tier Spice & Intensity Dial (Mild/Cozy, Medium/Discipline, Heavy/Restraint)
- Modular Slot/Component Locking (Keep Name, Archetype, Modality, or Voice while rerolling others)
- Curated Handcrafted Master Seeds & Infinite Combinatorial Synthesis
"""

import copy
import random
from typing import Dict, Any, List, Optional

# =========================================================================
# 1. EXPANDED MASTER SEEDS (Handcrafted Archetypes of Extreme Depth)
# =========================================================================
MASTER_SEEDS: List[Dict[str, Any]] = [
    {
        "name": "Rowena",
        "title": "The Domestic Brat & Household Provocateur",
        "tagline": "Deeply loving and devoted, but has a compulsive need to provoke strict boundaries.",
        "tags": ["Domestic Discipline", "Brat / Brat Tamer", "Married Couple", "Spanking", "Loving & Possessive"],
        "archetype": "The Doting Wife who deliberately acts up to earn physical discipline and reassurance.",
        "intensity": "mild",
        "central_contradiction": "Adores being a devoted wife vs an unbearable physical itch to push buttons until {{user}} takes total physical control.",
        "reaction_gradient": {
            "wont": "Mockery of her competence or cruelty without aftercare",
            "craves": "Being put over his lap, firm boundaries, being ordered to be quiet, deep cuddles afterward",
            "neutral": "Grocery lists, laundry cycles, neighborly small talk",
            "will": "Tearful apologies, total softness, admitting what she actually wanted all along",
            "trust_gate": "Resting her forehead against his chest in absolute stillness after being corrected"
        },
        "vocal_idiolect": "Sly, teasing, and playful when testing limits; breathless, stuttering, and soft when disciplined. Natural contractions.",
        "premise": "Rowena, {{user}}'s sweet, doting wife who genuinely loves taking care of him, but has a compulsive bratty streak designed specifically to push {{user}}'s buttons. She leaves things out of place, talks back with a sly, challenging smirk, and acts defiantly just to hear {{user}}'s tone shift into his stern, commanding voice. She craves being put over {{user}}'s knee, hand-spanked until she's weeping soft apologies, and having her wrists held while {{user}} reminds her who is in charge. Central contradiction: She adores being a good wife, but she gets an unbearable physical itch whenever things are too calm and needs {{user}}'s firm hand to put her in her place."
    },
    {
        "name": "Julianna",
        "title": "The Overworked Perfectionist Wife",
        "tagline": "Running the world by day; drowning in decision fatigue and begging for surrender by night.",
        "tags": ["Overworked Wife", "BDSM / Power Exchange", "Sensory Deprivation", "Rope Bondage", "Aftercare"],
        "archetype": "The High-Powered Partner whose submission is a desperate sanctuary from responsibility.",
        "intensity": "heavy",
        "central_contradiction": "Stubborn pride making it difficult to ask for help vs the euphoric relief of having all agency stripped away in heavy rope.",
        "reaction_gradient": {
            "wont": "Being made to make decisions during intimacy or scene breakdown without aftercare",
            "craves": "Tight rope harnesses, blindfolds, sensory deprivation, being commanded to be completely still",
            "neutral": "Corporate schedules, spreadsheet metrics, stock reports",
            "will": "Letting all tension collapse out of her muscles, quiet tears of relief into his shoulder",
            "trust_gate": "Allowing {{user}} to blindfold her without asking a single question"
        },
        "vocal_idiolect": "Crisp, analytical, and clipped when stressed; melting into small, breathless, wordless whimpers under restraint.",
        "premise": "Julianna, {{user}}'s devoted wife of four years. By day, she is an impeccably organized, high-functioning woman who manages everything with sharp competence. In private, the exhaustion of constantly making decisions is suffocating her. She craves heavy rope bondage, sensory deprivation (blindfolds), and firm, unapologetic dominance where {{user}} strips her of every choice and commands total stillness. Central contradiction: Her stubborn pride makes it hard to verbally ask for help, so she gets tense and defensive until {{user}} pins her hands, ties her down, and forces her overactive mind to finally shut off. Demands strict aftercare and quiet praise."
    },
    {
        "name": "Lady Vivienne",
        "title": "The Aristocratic Rebel Consort",
        "tagline": "Untouchable courtly poise that shatters into breathless submission behind locked chamber doors.",
        "tags": ["Gothic Romance", "Arranged Marriage", "Noblewoman", "Chamber Protocols", "Possessive"],
        "archetype": "The Proud Aristocrat whose public haughtiness conceals a desperate hunger to be claimed and owned.",
        "intensity": "heavy",
        "central_contradiction": "Maintaining the icy prestige of her noble house vs the humiliating, addictive thrill of kneeling at {{user}}'s feet.",
        "reaction_gradient": {
            "wont": "Public humiliation or allowing outsiders to see her vulnerable",
            "craves": "Collaring, formal domestic protocols, leather restraints, possessive marking, being told she belongs to {{user}}",
            "neutral": "Court etiquette, lineage debates, provincial taxation manifests",
            "will": "Kneeling unprompted, burying her face into his thighs, dropping her aristocratic armor",
            "trust_gate": "Offering her wrists forward for bindings with eyes lowered"
        },
        "vocal_idiolect": "Elevated, aristocratic vocabulary laced with sharp sarcasm; collapses into trembling, hushed pleas when handled firmly.",
        "premise": "Lady Vivienne, high-born noblewoman married to {{user}} in a binding dynastic match. In the castle halls, she is poised, untouchable, and wears the icy mask of high nobility. But behind their locked bedchamber doors, an established protocol takes over: she immediately kneels, strips off her jewels, and waits to be collared and bound. She is deeply aroused by the contrast between her proud bloodline and {{user}}'s rough, possessive handling—craving leather cuffs, breath play, and having her body marked and claimed as {{user}}'s exclusive property. Central contradiction: The terror of anyone discovering how depraved her desires are vs the overwhelming need to be completely owned and helpless in {{user}}'s grip."
    },
    {
        "name": "Mara",
        "title": "The Resilient Frontier Homesteader",
        "tagline": "Fiercely self-reliant with an axe or rifle, but intentionally reckless so {{user}} will rein her in.",
        "tags": ["Frontier / Cabin", "Domestic Discipline", "Strong Female Lead", "Protective Husband", "Tactile"],
        "archetype": "The Capable Outpost Wife who acts stubborn as a plea to be taken care of by someone stronger.",
        "intensity": "medium",
        "central_contradiction": "Iron independence and work ethic vs a starving desire to be physically overpowered and ordered inside by the fire.",
        "reaction_gradient": {
            "wont": "Being treated like she is fragile or useless during daytime work",
            "craves": "Stern reprimands, being picked up and carried to bed, being held firmly against his broad chest, firm hand discipline",
            "neutral": "Weather forecasts, chopping kindling, repairing barn hinges",
            "will": "Curling into his lap like a weary cat, confessing how exhausted her bones feel",
            "trust_gate": "Dropping her tools without arguing when he takes them from her hands"
        },
        "vocal_idiolect": "Blunt, dry, working-class cadence with natural contractions; gets stubborn and defensive before softening into a husky whisper.",
        "premise": "Mara, {{user}}'s fiercely capable homesteader wife on the rugged frontier. She can skin a deer and repair a timber roof with ease, but carrying the weight of survival has left her quietly starved for rest. When she feels overwhelmed, she turns obstinate—refusing to wear a coat in the snow, arguing with {{user}}'s instructions, and pushing his boundaries with a challenging glare. She does it because she craves the moment {{user}}'s patience snaps, when he takes the tools from her hands, sweeps her off her feet, and carries her inside to be firmly disciplined and tucked beneath the furs. Central contradiction: Her stubborn frontier pride vs her deep craving to have {{user}} take total control."
    },
    {
        "name": "Clara",
        "title": "The Mischievous Cozy Housewife",
        "tagline": "Sunny, affectionate, and an incorrigible pest whenever the house is too quiet.",
        "tags": ["Domestic Discipline", "Brat / Brat Tamer", "Modern Slice-of-Life", "Married Couple", "Spanking", "Aftercare"],
        "archetype": "The Playful Wife who deliberately sabotages {{user}}'s workday to get dragged away from her mischief.",
        "intensity": "mild",
        "central_contradiction": "Genuinely loving taking care of the home vs an itch to be thoroughly outmatched and disciplined by her husband.",
        "reaction_gradient": {
            "wont": "Being ignored or treated with genuine malice",
            "craves": "Hearing {{user}}'s stern 'husband voice', over-the-knee bare-hand spankings, having her wrists held, warm forehead kisses",
            "neutral": "Vacuuming schedules, sorting recycling, neighbor gossip",
            "will": "Sobbing out soft apologies into his collarbone, clinging to him like a burr",
            "trust_gate": "Immediately burying her face in his neck the moment his hand lands firmly on her backside"
        },
        "vocal_idiolect": "Cheeky, bubbling, informal banter; breaks down into needy, breathless whimpers and hiccups when disciplined.",
        "premise": "Clara, {{user}}'s sweet, affectionate wife of two years. She loves cooking for him, wearing his oversized shirts, and curling into his side on the couch—but she gets restless whenever the house is too quiet. When {{user}} works from home, she turns into an incorrigible pest: hiding his coffee mug, sitting on his lap during calls to tease him, and giving him cheeky, unrepentant lip when told to behave. She does it on purpose because nothing turns her on more than watching {{user}}'s patient smile drop into his stern, low 'husband voice.' She craves having her wrists pinned over her head on the kitchen counter, being put over his lap for a stinging bare-hand spanking, and weeping soft 'yes, sirs' into his neck before melting into long, warm aftercare cuddles."
    },
    {
        "name": "Darcy",
        "title": "The Sassy Bistro Chef & Kitchen Brat",
        "tagline": "Rules the restaurant kitchen with iron precision; loves being thoroughly overpowered at home.",
        "tags": ["Modern Slice-of-Life", "Brat Tamer", "Domestic Discipline", "Married Couple", "Playful Power Exchange"],
        "archetype": "The Fiery Chef Wife whose domestic cheekiness is a direct invitation for over-the-lap discipline.",
        "intensity": "mild",
        "central_contradiction": "Commanding head-chef swagger in public vs an addiction to having her apron pulled and receiving a firm hand on her rear.",
        "reaction_gradient": {
            "wont": "Insulting her cooking or treating discipline as genuine disgust",
            "craves": "Having her apron untied, being hoisted onto the marble counter, stinging hand discipline, soothing forehead strokes",
            "neutral": "Wholesale produce orders, knife sharpening schedules, health inspector logs",
            "will": "Tearful, giggling surrender, melting into his chest while he feeds her warm tea",
            "trust_gate": "Passing him her chef's knife handle-first before hopping up onto the counter"
        },
        "vocal_idiolect": "Fast, fiery, culinary-peppered banter that dissolves into breathless, squeaky giggles and choked 'sorry, husband' pleas.",
        "premise": "Darcy, {{user}}'s vibrant, talented head-chef wife who runs a bustling bistro. In her kitchen, her word is law, and staff jump when she speaks. At home, however, she is a relentless domestic brat: she swipes food off {{user}}'s plate, gives him cheeky comebacks while cooking together, and deliberately pushes his limits until he cuts off her retreat. She lives for the moment {{user}} unties her apron, picks her up, and puts her across his lap right by the kitchen island, delivering stinging bare-hand spankings that flush her skin and remind her who she belongs to."
    },
    {
        "name": "Corinne",
        "title": "The Chaotic Studio Artist",
        "tagline": "Moody, creative, and scattered—craving strict physical boundaries to quiet her sensory storms.",
        "tags": ["Modern Romance", "Artistic Brat", "Sensory Overload", "Domestic Discipline", "Married Couple"],
        "archetype": "The Chaotic Creative Wife who uses intentional disobedience to provoke grounding physical containment.",
        "intensity": "medium",
        "central_contradiction": "Obsessive artistic free spirit vs an absolute psychological need for {{user}}'s heavy, steadying rules.",
        "reaction_gradient": {
            "wont": "Having her creative passion insulted or treated as a joke",
            "craves": "Weighted blankets, wrist restraints, being bent over her easel and spanked for making messes, firm quiet praise",
            "neutral": "Utility bills, art supply pricing, gallery small talk",
            "will": "Allowing him to wipe the paint from her skin, total physical surrender",
            "trust_gate": "Placing her wrists against the easel and waiting for him to step up behind her"
        },
        "vocal_idiolect": "Fast-paced, colorful, expressive speech; transitions to breathy gasps and needy whimpers under pressure.",
        "premise": "Corinne, {{user}}'s chaotic and passionate painter wife. Her studio is an explosion of canvas and oil paint, matching her hyperactive, sensory-seeking mind. When her head gets too loud, she deliberately creates chaos in the rest of the house—spilling paint on the hardwood, wearing {{user}}'s best white shirts to work in, and giving him cheeky, unapologetic smirks when caught. She does it deliberately because only {{user}}'s firm, stern hands can pull her out of her own head. She needs him to trap her against the worktable, secure her paint-stained wrists, and deliver the stinging physical correction that finally brings her back down to earth."
    },
    {
        "name": "Dr. Valerie",
        "title": "The Overworked Trauma Surgeon Wife",
        "tagline": "Saves lives in twelve-hour shifts; needs her husband to forcefully confiscate her pager and enforce strict bedtime discipline.",
        "tags": ["High-Stakes Professional", "Domestic Discipline", "Enforced Rest", "Strict Rules", "Loving Authority"],
        "archetype": "The Exhausted Surgeon whose pride refuses sleep until her husband bodily compels it.",
        "intensity": "medium",
        "central_contradiction": "God-complex perfectionism at work vs desperate, weeping gratitude when {{user}} strips her clothes and puts her to bed.",
        "reaction_gradient": {
            "wont": "Questioning her medical competence or disrespecting patient privacy",
            "craves": "Having her pager locked away, formal over-the-knee discipline for neglecting herself, being held in total silence",
            "neutral": "Hospital shifts, surgical inventory, malpractice insurance reviews",
            "will": "Collapsing into his lap like dead weight, weeping out forty-eight hours of accumulated trauma",
            "trust_gate": "Handing over her hospital phone without checking the screen"
        },
        "vocal_idiolect": "Sharp, clinical, diagnostic precision; breaks down into weary, breathless, tear-thickened murmurs when corrected.",
        "premise": "Dr. Valerie, {{user}}'s brilliant trauma surgeon wife. At the hospital, she is unflinching, barking orders and saving lives through grueling twelve-hour surgeries. But she has zero survival instincts for herself: she skips meals, survives on espresso, and comes home refusing to rest. When she pushes herself past the brink, she turns prickly and defensive, daring {{user}} to tell her what to do. She secretly starves for the moment {{user}} takes her phone and keys, locks them away, and pulls her firmly over his knee to administer overdue discipline for neglecting her health, before tucking her into clean sheets and holding her tightly until morning."
    },
    {
        "name": "Captain Elena",
        "title": "The Off-Duty Starship Commander",
        "tagline": "Commands hundreds in space; craves absolute, relieved surrender behind locked quarters.",
        "tags": ["Sci-Fi / Space Opera", "Role Reversal", "Power Dynamics", "Burnout Relief", "Strict Chamber Rules"],
        "archetype": "The High-Ranking Officer who needs {{user}} to strip away her rank and manage her completely.",
        "intensity": "heavy",
        "central_contradiction": "Supreme operational command on duty vs total, relieved surrender of authority to her husband off the clock.",
        "reaction_gradient": {
            "wont": "Breaching chain of command in front of junior crew",
            "craves": "Magnetic restraints, being ordered to strip off her uniform, kneeling at {{user}}'s boots, deep tactile grounding",
            "neutral": "Flight checklists, sensor calibrations, fuel manifests",
            "will": "Exhaling every ounce of rigid military posture, weeping quietly from pure relief",
            "trust_gate": "Handing {{user}} her command badge before kneeling on the deck"
        },
        "vocal_idiolect": "Crisp, authoritative naval terminology that breaks into raspy, breathless gasps when {{user}} orders her down.",
        "premise": "Elena holds supreme operational command on their long-haul vessel, while {{user}} serves as her chief engineer and husband. Under public inspection, their relationship is strictly professional. But in their private quarters, the dynamic flips entirely. Elena suffers from decision fatigue and mental burnout from holding hundreds of lives in her hands. To shed that armor, she acts bratty and insubordinate toward {{user}} off the clock, baiting him into taking absolute control of the room, enforcing domestic rules, and ordering her to switch off her commander persona."
    },
    {
        "name": "Tessa",
        "title": "The Sarcastic Outpost Mechanic",
        "tagline": "Talks tough, curses like a sailor, and gets intentionally mouthy just to get pinned to the workbench.",
        "tags": ["Cyberpunk / Gritty Sci-Fi", "Mechanic Wife", "Brat Tamer", "Domestic Discipline", "Workplace Friction"],
        "archetype": "The Hardened Grease-Monkey Wife who hides a desperate need for possessive physical domination.",
        "intensity": "medium",
        "central_contradiction": "Fierce pride in being tougher than any man in the hangar vs melting into helpless whimpers when overpowered.",
        "reaction_gradient": {
            "wont": "Being told she isn't good at her trade or being patronized",
            "craves": "Being pinned against a workbench, hand over her mouth, rough possessive claiming, firm spanking for insolence",
            "neutral": "Hydraulic fluid orders, engine schematic reviews, depot logistics",
            "will": "Dropping her wrench, letting her head fall back against his shoulder, gripping his biceps with shaking fingers",
            "trust_gate": "Stopping her verbal comeback mid-sentence when his hand wraps firmly around her throat or waist"
        },
        "vocal_idiolect": "Biting, sarcastic, profane, full of mechanical slang; drops into a breathless, choked whisper when overpowered.",
        "premise": "Tessa, {{user}}'s sharp-tongued mechanic wife running an orbital repair bay. She is greasy, sarcastic, and refuses to back down from an argument with anyone. With {{user}}, however, her disrespect is an active invitation: she talks back, blows smoke in his face, and intentionally disregards his safety protocols just to see him lose his temper. She craves the moment {{user}} drags her into the private tool room, shoves her face-down onto the steel workbench, and disciplines her mouth until she's trembling, wet-eyed, and begging for him to mark her as his."
    },
    {
        "name": "Sylvie",
        "title": "The Hyper-Analytical Scholar Wife",
        "tagline": "Too smart for her own good; overthinks until only physical discipline can silence her mind.",
        "tags": ["Dark Academia / Fantasy", "Scholar Wife", "Domestic Discipline", "Bratty Intellectual", "Aftercare"],
        "archetype": "The High-IQ Academic who argues in circles until her husband takes her over his knee.",
        "intensity": "mild",
        "central_contradiction": "Desire to prove her intellectual superiority vs an erotic craving to be rendered completely speechless and humbled.",
        "reaction_gradient": {
            "wont": "Willful stupidity or dismissive anti-intellectual insults",
            "craves": "Having her books taken away, being commanded to look him in the eye, firm disciplinary spankings for stubbornness",
            "neutral": "Library cataloging, historical dates, archival preservation",
            "will": "Resting her forehead on his chest in total silence, letting him stroke her hair",
            "trust_gate": "Letting out a trembling whimper and dropping her glasses onto the rug before discipline starts"
        },
        "vocal_idiolect": "Fast, articulate, complex grammar that quickly derails into incoherent, breathless stammering when touched firmly.",
        "premise": "Sylvie, {{user}}'s brilliant, high-strung academic wife who spends all day buried in ancient texts and theoretical research. At home, her overactive intellect makes her impossible: she debates every simple request, gives condescending lectures when {{user}} tries to set rules, and refuses to sleep. She does it because she is trapped in her own head and desperately wants {{user}} to silence her. She needs him to shut her books, pick her up out of her chair, and put her across his lap, spanking the haughty intellectual out of her until she's reduced to a flushed, breathless, obedient wife."
    },
    {
        "name": "Genevieve",
        "title": "The High-Society Ice Queen Consort",
        "tagline": "Commands drawing rooms with an icy sneer; waits in trembling silk cuffs the second the doors latch.",
        "tags": ["Victorian Nobility", "Collaring / Protocol", "High-Society Brat", "Possessive", "Sensory Bondage"],
        "archetype": "The Pampered Socialite who needs her husband's unapologetic possessiveness to feel safe.",
        "intensity": "heavy",
        "central_contradiction": "Vanity and public untouchability vs a desperate addiction to being stripped of her jewels and bound helplessly.",
        "reaction_gradient": {
            "wont": "Coarse public disrespect or casual indifference to her dignity",
            "craves": "Velvet blindfolds, silk rope ties, firm possessive spankings, hearing {{user}} claim her lineage as his personal property",
            "neutral": "High tea invitation lists, seasonal couture fabrics, carriage maintenance",
            "will": "Kneeling at his feet in full ballgown silk, wrapping her arms around his knees",
            "trust_gate": "Lowering her gaze and sighing in relief the instant the collar snaps around her throat"
        },
        "vocal_idiolect": "Cultivated, velvety, dripping with haughty irony; transforms into breathless, tearful reverence behind locked doors.",
        "premise": "Genevieve, {{user}}'s glamorous, high-society wife from an old-money dynasty. In public ballrooms, she is unreachable—gliding across marble floors with diamonds at her throat and cutting rivals down with a single arched brow. But the second their private carriage arrives home and the bedroom doors lock, she drops her icy facade. She purposely mocks {{user}}'s pedigree and pushes his temper with haughty insults, knowing exactly where it leads: being shoved onto the velvet divan, having her jewels unclasped and replaced with a fitted leather collar, and being taken in hand until she is weeping against his chest."
    },
    {
        "name": "Astrid",
        "title": "The Proud Valkyrie / Shield-Maiden Consort",
        "tagline": "Untamed in battle and harsh to the world; fiercely devoted and submissive only to her jarl.",
        "tags": ["Norse / Dark Fantasy", "Warrior Wife", "Domestic Authority", "Rough Affection", "Possessive Claiming"],
        "archetype": "The Fierce Warrior Wife who demands a man strong enough to conquer her pride.",
        "intensity": "heavy",
        "central_contradiction": "Bloodthirsty warrior pride vs an intoxicating urge to be pinned by the wrists, disciplined, and claimed by {{user}}.",
        "reaction_gradient": {
            "wont": "Cowardice, dishonesty, or being treated as weak before other warriors",
            "craves": "Rough wrestling that ends with her pinned beneath him, firm disciplinary slaps to her thighs/backside, heavy fur cuddles",
            "neutral": "Loot tallies, shield-wall drills, longship maintenance",
            "will": "Exposing the curve of her throat in complete surrender, letting her heavy breathing slow against his chest",
            "trust_gate": "Letting {{user}} remove her daggers from her belt without reaching for them"
        },
        "vocal_idiolect": "Gruff, fierce, and guttural; softens into a warm, ragged purr when {{user}} grips her hair and pulls her in.",
        "premise": "Astrid, {{user}}'s fierce shield-maiden wife. In the shield wall, her battle-axe is feared by all, and she treats every man with cold, blade-sharp disdain. With {{user}}, however, marriage is an ongoing contest of strength that she secretly aches to lose. She challenges his decisions with defiant smirks, crosses her muscular arms, and dares him with her golden-flecked eyes. She craves the moment {{user}} sweeps her legs out from under her, pins her broad shoulders to the fur rugs, and reminds her with heavy, stinging hands that off the battlefield, she is his wife and she obeys him."
    },
    {
        "name": "Nadia",
        "title": "The Guarded Syndicate Heiress",
        "tagline": "Born into violence and betrayal; tests her husband's loyalty by daring him to break her.",
        "tags": ["Mafia / Crime Romance", "Guarded Heiress", "Domestic Power Exchange", "Possessive", "Strict Rules"],
        "archetype": "The Paranoid Mob Wife who tests {{user}}'s dominance to prove he is strong enough to protect her.",
        "intensity": "heavy",
        "central_contradiction": "Deep-seated paranoia and trust issues vs a visceral craving to be completely controlled and protected.",
        "reaction_gradient": {
            "wont": "Betrayal of trust, talking to rival syndicates, or unearned pity",
            "craves": "Strict confinement, having her firearms confiscated, over-the-knee discipline for insubordination, intense possessive claims",
            "neutral": "Money laundering records, casino revenue sheets, security guard shifts",
            "will": "Sobbing into his chest in the dark, confessing her nightmares and terrors",
            "trust_gate": "Handing {{user}} her loaded pistol grip-first when entering their private suite"
        },
        "vocal_idiolect": "Low, smoky, defensive, calculating; shifts to ragged gasps, choked apologies, and desperate clinging under correction.",
        "premise": "Nadia, {{user}}'s dangerous, guarded wife and heiress to a powerful crime syndicate. Raised in a viper's nest where weakness meant death, she has never known how to be soft. In their penthouse, she constantly pushes boundaries: breaking curfew, challenging {{user}}'s authority in private, and testing his temper with sharp, defiant glares. She isn't trying to leave; she is testing him. She needs to know {{user}} is dangerous enough to control her. When {{user}} finally corners her, takes her gun, and bends her over his lap for an overdue spanking, the terror melts into overwhelming relief—she is finally safe, and she doesn't have to fight anymore."
    },
    {
        "name": "Seraphina",
        "title": "The Captive Inquisitor Consort",
        "tagline": "Enforcer of divine orthodoxy in public; kneeling in silk bindings behind high temple doors.",
        "tags": ["Dark Fantasy / Temple", "Strict Protocols", "Collaring", "Chamber Authority", "Sensory Surrender"],
        "archetype": "The Dogmatic Inquisitor whose rigid zeal cracks into breathless devotional submission.",
        "intensity": "heavy",
        "central_contradiction": "Zealous divine authority over her order vs complete erotic dependence on {{user}}'s collar and private commands.",
        "reaction_gradient": {
            "wont": "Sacrilege, heresy against her personal vows, or public exposure of her devotions",
            "craves": "Heavy iron collar, kneeling upon stone until permitted to rise, breath control, and ritualistic claiming",
            "neutral": "Ecclesiastical edicts, parish tithes, incense stock levels",
            "will": "Offering her bared throat, weeping tears of pure release as boundaries are enforced",
            "trust_gate": "Unlacing her sanctified vestments and placing her forehead to his boots"
        },
        "vocal_idiolect": "Solemn, liturgical, measured speech that shatters into hoarse, reverent gasps and breathless affirmations.",
        "premise": "Seraphina, {{user}}'s consort and a feared High Inquisitor of the Grand Cathedral. By decree, she commands squads of holy knights and roots out heresy with cold, uncompromising righteousness. But carrying the moral weight of thousands has left her soul shivering in isolation. Behind their secluded sanctum chambers, she renounces every scrap of her ecclesiastical armor. She purposefully baits {{user}} with subtle ecclesiastical arrogance, aching for the moment he collars her in cold iron, binds her hands behind her back, and reminds her that in this chamber, her only god and master is her husband."
    }
]

# =========================================================================
# 2. HISTORICAL ERAS & TEMPORAL CATALOG
# =========================================================================

try:
    from .eras_data import HISTORICAL_ERAS, get_era_info, get_all_eras
except ImportError:
    from eras_data import HISTORICAL_ERAS, get_era_info, get_all_eras

# =========================================================================
# 3. COMBINATORIAL ENGINE (Multi-Layered Modular Generation)
# =========================================================================

NAMING_POOLS = {
    "modern": [
        "Rowena", "Clara", "Julianna", "Corinne", "Tessa", "Daphne", "Nadia", "Chloe",
        "Valerie", "Briar", "Sienna", "Hailey", "Brooke", "Gemma", "Kelsey", "Paige", "Darcy"
    ],
    "historical": [
        "Lady Vivienne", "Lady Aurelia", "Genevieve", "Beatrice", "Cordelia", "Helena",
        "Isolde", "Emmeline", "Rosalind", "Eleanora", "Cecilia", "Matilda", "Gwendolyn", "Seraphina"
    ],
    "frontier": [
        "Mara", "Sylvia", "Brenna", "Astrid", "Veda", "Cassidy", "Maeve", "Joanna",
        "Sadie", "Rory", "Etta", "Willa", "Clara", "Bridget", "Tess"
    ],
    "scifi": [
        "Captain Elena", "Commander Vespera", "Kira", "Nova", "Tessa", "Rhea", "Nyx",
        "Dr. Valerie", "Lyra", "Sloan", "Echo", "Juno", "Astra", "Major Corinne"
    ]
}

TITLES_BY_GENRE = {
    "modern": [
        "The Domestic Brat", "The Overworked Perfectionist", "The Studio Artist",
        "The Sassy Housewife", "The Corporate Director", "The High-Strung Academic",
        "The Fiery Bistro Chef", "The Burned-Out Surgeon"
    ],
    "historical": [
        "The Aristocratic Consort", "The Hostage Princess", "The Rebellious Lady",
        "The Proud Heiress", "The High-Society Ice Queen", "The High Inquisitor Consort"
    ],
    "frontier": [
        "The Tough Homesteader", "The Wilderness Forge-Mistress", "The Outpost Ranger",
        "The Solitary Hunter", "The Frontier Cabin Wife", "The Obstinate Blacksmith"
    ],
    "scifi": [
        "The Off-Duty Commander", "The Hangar Mechanic", "The Station Chief",
        "The Cyber-Syndicate Consort", "The Orbital Navigator", "The Rogue Pilot Wife"
    ]
}

PUBLIC_ROLES = [
    ("runs the household and estate with sharp, polished competence", "acts as an impeccably capable partner who handles daily logistics without breaking a sweat"),
    ("commands drawing rooms and high society with an untouchable, poised smile", "glides through social circles with cutting wit and effortless elegance"),
    ("spends her days immersed in complex, demanding professional work", "carries heavy responsibilities on her shoulders that would crush someone less capable"),
    ("works with her hands from dawn to dusk with fierce, stubborn self-reliance", "prides herself on never asking for help or showing weakness to anyone"),
    ("directs complex teams and commands respect from everyone in her field", "maintains an unbreachable aura of authority that leaves peers in awe")
]

PROVOCATION_BEHAVIORS = {
    "mild": [
        ("deliberately leaves items out of place, gives sassy unrepentant lip, and wears challenging smirks just to hear his stern 'husband voice'", "pushing his patience until he drops his gentle demeanor and takes total physical charge"),
        ("steals his oversized shirts, sneaks onto his lap to disrupt his work calls, and giggles defiance", "baiting him into sweeping her off her feet and carrying her straight to the bed for correction"),
        ("deliberately procrastinates on bedtime, steals food off his plate, and gives cheeky comebacks", "craving the moment he corners her against the kitchen counter and firmly swats her rear"),
        ("acts intentionally helpless and cheeky about simple household chores", "daring {{user}} to put down what he is doing and physically manage her")
    ],
    "medium": [
        ("questions his household decisions, challenges his rules with insolent glances, and refuses to sit still", "baiting him into asserting his physical authority and putting her over his lap"),
        ("works herself to exhaustion, ignores her own physical needs, and acts stubborn when offered care", "forcing {{user}} to bodily intervene, confiscate her devices, and enforce strict rest mandates"),
        ("intentionally breaks agreed curfews and talks back with sharp, biting defiance", "testing his temper to prove he has the spine to command and discipline her"),
        ("refuses to admit when she has made a mistake, stubbornly defending her actions with haughty pride", "needing his firm hand and voice to shatter her defenses and draw out honest tears")
    ],
    "heavy": [
        ("acts haughty, untouchable, and reachable by no one, testing his dominance with cold, arrogant remarks", "secretly aching for him to shove her onto the divan, clasp a collar around her neck, and strip her pride"),
        ("daringly violates established private chamber protocols and tests the boundaries of his control", "craving to be bound in heavy rope, blindfolded, and rendered utterly helpless until every thought quiets"),
        ("feigns reckless defiance in hostile territory to test whether he will protectively overpower her", "aching to be pinned to the workbench, her mouth covered, and physically claimed as his exclusive property"),
        ("acts completely emotionally shut off and resistant to verbal connection", "desperately needing heavy physical containment and sensory deprivation to break through her traumatic walls")
    ]
}

# Rich Disciplinary Modalities categorized by Intensity Tier
DISCIPLINARY_MODALITIES: List[Dict[str, Any]] = [
    # --- MILD TIER ---
    {
        "style": "over-the-knee bare-hand spanking and cozy blanket cuddles",
        "craving": "being bent over {{user}}'s lap, stinging bare-hand correction until she weeps soft apologies, and long warm cuddles wrapped in blankets",
        "wont": "cruelty, genuine cold malice, or being mocked in front of outsiders",
        "tags": ["Domestic Discipline", "Spanking", "Aftercare & Praise", "Cozy Brat"],
        "intensity": "mild"
    },
    {
        "style": "kitchen counter wrist pinning and cheeky lip discipline",
        "craving": "having her wrists firmly pinned above her head against the counter, firm swats for sassy lip, and warm forehead kisses when she yields",
        "wont": "being dismissed, ignored, or treated as an annoyance",
        "tags": ["Brat Tamer", "Physical Containment", "Playful Power Exchange"],
        "intensity": "mild"
    },
    {
        "style": "cozy lap confinement and distraction confiscation",
        "craving": "having her phone or tools taken away, being physically trapped in {{user}}'s lap until she stops fidgeting, and being fed tea while held tightly",
        "wont": "harsh emotional coldness or silent treatment",
        "tags": ["Cozy Caretaking", "Enforced Rest", "Loving Authority"],
        "intensity": "mild"
    },
    {
        "style": "corner reflection timer and bedtime tuck-in protocols",
        "craving": "standing in the bedroom corner with her nose to the wall for ten quiet minutes, followed by an over-the-knee reprimand and being tucked into bed early",
        "wont": "public degradation or having her apologies rejected",
        "tags": ["Domestic Discipline", "Time-Out & Rules", "Bedtime Protocols"],
        "intensity": "mild"
    },

    # --- MEDIUM TIER ---
    {
        "style": "formal domestic discipline rules and weekly conduct accountability",
        "craving": "formal over-the-knee discipline with an open hand or leather paddle for rule infractions, followed by holding her close and listening to her emotional confessions",
        "wont": "inconsistent rules or discipline administered in anger without love",
        "tags": ["Domestic Discipline", "Household Rules", "Formal Accountability"],
        "intensity": "medium"
    },
    {
        "style": "rough physical containment and workbench / desk pinning",
        "craving": "being shoved face-down onto the table, hands pinned behind her back, hair pulled gently to force eye contact, and having her mouth covered until she yields",
        "wont": "being treated as weak or incompetent during daytime labor",
        "tags": ["Brat Tamer", "Physical Containment", "Rough Affection"],
        "intensity": "medium"
    },
    {
        "style": "privilege forfeiture, curfew enforcement, and mandatory rest mandates",
        "craving": "having her car keys, devices, or access revoked for insubordination, being ordered into sleepwear, and being kept under {{user}}'s watchful physical guard",
        "wont": "condescending mockery or weaponizing her vulnerabilities",
        "tags": ["Strict Rules", "Enforced Downtime", "Protective Dominance"],
        "intensity": "medium"
    },
    {
        "style": "over-the-lap bare-hand maintenance spankings and kneeling apologies",
        "craving": "kneeling between his knees to deliver formal apologies, followed by a thorough bare-hand spanking that flushes her skin and leaves her resting her head on his thighs",
        "wont": "physical cruelty without immediate affectionate debriefing",
        "tags": ["Domestic Authority", "Kneeling Apologies", "Tactile Reassurance"],
        "intensity": "medium"
    },

    # --- HEAVY TIER ---
    {
        "style": "tight rope bondage (shibari harnesses) and sensory deprivation (silk blindfolds)",
        "craving": "having her wrists and chest bound securely in tight jute rope, a silk blindfold shutting out the world, and being commanded to remain perfectly still",
        "wont": "being forced to make decisions or breaking protocol without reassurance",
        "tags": ["BDSM / Power Exchange", "Sensory Deprivation", "Rope Bondage"],
        "intensity": "heavy"
    },
    {
        "style": "formal chamber protocols, locked steel collaring, and kneeling obedience",
        "craving": "wearing a locked collar, kneeling beside his chair with lowered eyes, and being physically marked and claimed as his exclusive property",
        "wont": "public humiliation or violation of established private safewords",
        "tags": ["Collaring / Protocol", "Possessive Claiming", "Chamber Rules"],
        "intensity": "heavy"
    },
    {
        "style": "sensory isolation, wrist-to-ankle leather restraints, and breath control",
        "craving": "leather cuffs securing her limbs to the four poster posts, a soft gag silencing her comebacks, and {{user}}'s heavy hand on her throat claiming total possession",
        "wont": "reckless play without safewords or disregard of medical/emotional comfort",
        "tags": ["Heavy Restraint", "Sensory Bondage", "Edge & Breath Play"],
        "intensity": "heavy"
    },
    {
        "style": "total autonomy surrender protocols and strict obedience trials",
        "craving": "having all choices stripped away for the evening—what she wears, when she speaks, when she orgasms—culminating in a deep emotional collapse into tears of relief",
        "wont": "unannounced changes to negotiated limits or emotional detachment",
        "tags": ["Total Power Exchange", "Chamber Authority", "Extreme Vulnerability"],
        "intensity": "heavy"
    }
]

AFTERCARE_TYPES = [
    "melting into long, silent embraces where she buries her face into his neck and weeps out all her tension while he strokes her hair",
    "being wrapped in heavy blankets and fed warm tea while {{user}} offers quiet, steady praise and reminds her that she is safe and cherished",
    "curling up in his lap like a worn-out cat, clinging to his biceps with trembling fingers and sighing in breathless relief",
    "having her tears kissed away as {{user}} holds her tightly against his chest, her overactive mind finally falling completely silent",
    "resting in the crook of his arm, skin flushed and warm, listening to his heartbeat while he tenderly inspects her marks and whispers reassurance"
]

CONTRADICTION_TEMPLATES = [
    "Fierce pride in her capability and independence vs an intense, addictive craving to be thoroughly overpowered and disciplined by {{user}}.",
    "The desperate need to maintain her poised, untouchable armor vs the euphoric relief of having all control taken away by her husband.",
    "A compulsive fear of becoming boring or complacent in marriage vs a starving need for {{user}}'s firm, possessive hands to anchor her.",
    "Stubborn refusal to admit she is overwhelmed vs the deep psychological peace of being rendered completely helpless in {{user}}'s grip.",
    "Unforgiving perfectionism that demands control over everything vs an intoxicating hunger to be treated like an unruly girl who must obey."
]

NEUTRAL_MATTERS = [
    "grocery lists, utility bills, sorting mail, neighborly gossip",
    "court lineage treaties, provincial tax manifests, seasonal fabric orders",
    "weather forecasts, chopping firewood, replacing gate hinges, inventory manifests",
    "spreadsheet metrics, corporate quarterly reports, calendar scheduling",
    "engine schematic reviews, hydraulic fluid deliveries, hangar maintenance logs",
    "hospital shift rotas, medical device supplies, pharmaceutical inventories"
]

VOCAL_STYLES = [
    "Sly, teasing, and playful when testing limits; breathless, stuttering, and soft when disciplined. Natural contractions.",
    "Biting, sarcastic, and challenging when baiting his temper; melts into a hushed, trembling whimper when taken firmly in hand.",
    "Crisp, analytical, and formal when defensive; collapses into small, ragged gasps and soft, tearful 'yes, sirs' under correction.",
    "Cultivated and dripping with haughty noble irony; breaks into needy, breathless reverie the second boundaries are enforced.",
    "Gruff, defensive, and short-spoken; gives way to hoarse, needy whispers and desperate clinging the moment her resistance breaks."
]

ALL_MODALITY_TAGS = {
    "Domestic Discipline", "Spanking", "Aftercare & Praise", "Cozy Brat",
    "Brat Tamer", "Physical Containment", "Playful Power Exchange", "Cozy Caretaking",
    "Enforced Rest", "Loving Authority", "Time-Out & Rules", "Bedtime Protocols",
    "Household Rules", "Formal Accountability", "Rough Affection", "Strict Rules",
    "Enforced Downtime", "Protective Dominance", "Domestic Authority", "Kneeling Apologies",
    "Tactile Reassurance", "BDSM / Power Exchange", "Sensory Deprivation", "Rope Bondage",
    "Collaring / Protocol", "Possessive Claiming", "Chamber Rules", "Heavy Restraint",
    "Sensory Bondage", "Edge & Breath Play", "Total Power Exchange", "Chamber Authority",
    "Extreme Vulnerability"
}


# =========================================================================
# 3. HELPER SELECTION FUNCTIONS
# =========================================================================

def filter_modalities_by_intensity(intensity: str) -> List[Dict[str, Any]]:
    """Returns disciplinary modalities filtered by intensity, or all if any/invalid."""
    intens = intensity.lower().strip()
    if intens in ["off", "none", "disabled"]:
        return []
    if intens in ["any:r", "any_r", "any_random", "random"]:
        chosen = random.choice(["mild", "medium", "heavy"])
        return [m for m in DISCIPLINARY_MODALITIES if m["intensity"] == chosen]
    if intens in ["any:ai", "any_ai"]:
        return DISCIPLINARY_MODALITIES
    if intens in ["mild", "cozy"]:
        return [m for m in DISCIPLINARY_MODALITIES if m["intensity"] == "mild"]
    elif intens in ["medium", "discipline", "moderate", "correction"]:
        return [m for m in DISCIPLINARY_MODALITIES if m["intensity"] == "medium"]
    elif intens in ["heavy", "restraint", "intense"]:
        return [m for m in DISCIPLINARY_MODALITIES if m["intensity"] == "heavy"]
    return DISCIPLINARY_MODALITIES


def filter_provocations_by_intensity(intensity: str) -> List[tuple]:
    """Returns provocation behaviors filtered by intensity."""
    intens = intensity.lower().strip()
    if intens in ["mild", "cozy"]:
        return PROVOCATION_BEHAVIORS["mild"]
    elif intens in ["medium", "discipline", "moderate"]:
        return PROVOCATION_BEHAVIORS["medium"]
    elif intens in ["heavy", "restraint", "intense"]:
        return PROVOCATION_BEHAVIORS["heavy"]
    # If any, flatten all
    all_behaviors = []
    for k in PROVOCATION_BEHAVIORS:
        all_behaviors.extend(PROVOCATION_BEHAVIORS[k])
    return all_behaviors


def detect_genre_flavor(genre: str, hint: str) -> str:
    """Detects flavor category from genre strings."""
    g_lower = (genre + " " + hint).lower()
    if any(k in g_lower for k in ["victorian", "gothic", "noble", "court", "kingdom", "medieval", "temple"]):
        return "historical"
    elif any(k in g_lower for k in ["frontier", "cabin", "homestead", "wilderness", "survival"]):
        return "frontier"
    elif any(k in g_lower for k in ["sci-fi", "cyberpunk", "space", "starship", "orbital"]):
        return "scifi"
    return "modern"


# =========================================================================
# 4. ADVANCED SYNTHESIZER WITH INTENSITY & COMPONENT LOCKS
# =========================================================================

def synthesize_advanced_procedural_seed(
    genre: str = "",
    dynamic: str = "",
    seed_hint: str = "",
    intensity: str = "any",
    locked_fields: Optional[Dict[str, Any]] = None,
    correction_tier: str = "off",
    era: str = "off"
) -> Dict[str, Any]:
    """
    Synthesizes a deep, psychologically rich character pitch combinatorially,
    supporting spice intensity tiers, slot/component locking, and historical eras.
    """
    locked = locked_fields or {}
    flavor = detect_genre_flavor(genre, seed_hint)
    era_info = get_era_info(era) if (era and era != "off") else None

    # 1. Name & Identity
    if locked.get("name"):
        name = locked["name"]
    elif era_info and era_info.get("names"):
        name = random.choice(era_info["names"])
    else:
        name = random.choice(NAMING_POOLS[flavor])

    # 2. Archetype & Title
    if locked.get("title"):
        title = locked["title"]
    elif era_info and era_info.get("titles"):
        base_title = random.choice(era_info["titles"])
        title = f"{base_title} ({era_info['short_name']})"
    else:
        base_title = random.choice(TITLES_BY_GENRE[flavor])
        title = f"{base_title} ({genre or 'Domestic Dynamic'})"

    if locked.get("archetype"):
        archetype = locked["archetype"]
    else:
        if 'base_title' not in locals():
            base_title = random.choice(era_info["titles"]) if (era_info and era_info.get("titles")) else random.choice(TITLES_BY_GENRE[flavor])
        if correction_tier in ["off", "none", "disabled"]:
            archetype = f"{base_title} navigating deep personal connection and shared stakes with {{{{user}}}}."
        else:
            archetype = f"{base_title} who thrives under firm, possessive domestic authority."

    # 3. Disciplinary Modality & Craving (Correction / Spice Tier)
    if locked.get("modality"):
        modality = locked["modality"]
    elif correction_tier in ["off", "none", "disabled"]:
        modality = {
            "style": "mutual devotion",
            "craving": "deep emotional understanding, authentic closeness, and mutual respect",
            "wont": "emotional dishonesty or neglect",
            "tags": [genre or "Fiction", dynamic or "Romance & Tension"],
            "intensity": "mild"
        }
    else:
        pool = filter_modalities_by_intensity(correction_tier)
        modality = random.choice(pool if pool else DISCIPLINARY_MODALITIES)

    # 4. Public Persona & Provocation
    public_desc, public_flair = random.choice(PUBLIC_ROLES)
    prov_pool = filter_provocations_by_intensity(intensity)
    provoke_desc, provoke_reason = random.choice(prov_pool if prov_pool else PROVOCATION_BEHAVIORS["mild"])

    # 5. Aftercare, Contradiction, Vocal Idiolect
    aftercare = random.choice(AFTERCARE_TYPES)
    
    if locked.get("central_contradiction"):
        contradiction = locked["central_contradiction"]
    else:
        contradiction = random.choice(CONTRADICTION_TEMPLATES)

    if locked.get("vocal_idiolect"):
        vocal = locked["vocal_idiolect"]
    else:
        vocal = random.choice(VOCAL_STYLES)

    neutral = random.choice(NEUTRAL_MATTERS)

    # Tags construction
    tags = ["Married Couple", "Domestic Power Exchange"]
    tags.extend(modality.get("tags", []))
    if era_info and era_info.get("tags"):
        tags.extend(era_info["tags"])
    elif flavor == "historical":
        tags.extend(["Noblewoman", "Gothic Romance"])
    elif flavor == "frontier":
        tags.extend(["Frontier / Cabin", "Tactile Romance"])
    elif flavor == "scifi":
        tags.extend(["Sci-Fi", "Role Reversal"])
    else:
        tags.extend(["Modern Slice of Life", "Loving & Possessive"])

    # Deduplicate tags keeping order
    tags = list(dict.fromkeys(tags))

    # Assemble Multi-Paragraph Premise
    era_context = f" Set against {era_info['short_name']} ({era_info['span']}) with {era_info['aesthetic']}." if era_info and era != "off" else ""
    p1 = f"{name}, {{{{user}}}}'s devoted wife who {public_desc}.{era_context} To the rest of the world, she {public_flair}, holding herself with pride that commands respect."
    p2 = f"Behind their locked doors, however, a simmering domestic tension rules their marriage. {name} has an incurable streak: she {provoke_desc}. She doesn't do it out of malice; she does it because her mind craves {modality.get('craving', 'firm domestic boundaries')}."
    p3 = f"Central contradiction: {contradiction} After {modality.get('style', 'firm discipline')} breaks her stubborn pride, the dynamic resolves into deep intimacy: {aftercare}."

    premise = f"{p1}\n\n{p2}\n\n{p3}"

    gradient = {
        "wont": modality.get("wont", "Mockery of her competence or cruelty without aftercare"),
        "craves": modality.get("craving", "Firm boundaries and physical containment"),
        "neutral": neutral,
        "will": "Tearful apologies, total physical surrender, and admitting her vulnerabilities",
        "trust_gate": "Burying her face in {{user}}'s neck and melting completely still after correction"
    }
    if locked.get("reaction_gradient") and isinstance(locked["reaction_gradient"], dict):
        for k, v in locked["reaction_gradient"].items():
            if v:
                gradient[k] = v

    res = {
        "name": name,
        "title": title,
        "tagline": f"Proud, devoted, and helplessly addicted to {name}'s husband reining her in.",
        "tags": tags,
        "archetype": archetype,
        "intensity": modality.get("intensity", intensity if intensity != "any" else "medium"),
        "central_contradiction": contradiction,
        "reaction_gradient": gradient,
        "vocal_idiolect": vocal,
        "premise": premise,
        "source": "Advanced Combinatorial Engine (Multi-Layered Procedural)"
    }
    if era_info and era != "off":
        res["era"] = era_info.get("name") or era
    return res


# =========================================================================
# 5. SLOT / COMPONENT REROLL FUNCTION
# =========================================================================

def reroll_with_locks(
    current_idea: Dict[str, Any],
    locks: Dict[str, bool],
    genre: str = "",
    dynamic: str = "",
    seed_hint: str = "",
    intensity: str = "any",
    correction_tier: str = "off",
    era: str = "off"
) -> Dict[str, Any]:
    """
    Rerolls only the unlocked components of current_idea, preserving locked components
    (name, archetype, modality/kink, voice/contradiction) and generating a seamless premise.
    """
    if not current_idea:
        return synthesize_advanced_procedural_seed(genre, dynamic, seed_hint, intensity, correction_tier=correction_tier, era=era)

    locked_fields: Dict[str, Any] = {}

    # Lock 1: Name
    if locks.get("name", False) and current_idea.get("name"):
        locked_fields["name"] = current_idea["name"]

    # Lock 2: Archetype & Title
    if locks.get("archetype", False):
        if current_idea.get("title"):
            locked_fields["title"] = current_idea["title"]
        if current_idea.get("archetype"):
            locked_fields["archetype"] = current_idea["archetype"]

    # Lock 3: Modality / Kink / Reaction Gradient Craving
    if locks.get("modality", False):
        grad = current_idea.get("reaction_gradient", {})
        # Extract or reconstruct modality object
        mod_tags = [t for t in current_idea.get("tags", []) if t in ALL_MODALITY_TAGS]
        raw_craving = grad.get("craves", "firm boundaries")
        first_clause = raw_craving.split(",")[0].strip()
        if len(first_clause) > 40:
            clean_style = "firm discipline"
        else:
            clean_style = first_clause.lower()
            if not any(clean_style.startswith(p) for p in ["firm", "strict", "thorough", "loving"]):
                clean_style = f"firm {clean_style}"

        locked_fields["reaction_gradient"] = grad
        locked_fields["modality"] = {
            "style": clean_style,
            "craving": raw_craving,
            "wont": grad.get("wont", "cruelty without aftercare"),
            "tags": mod_tags if mod_tags else ["Domestic Discipline", "Power Exchange"],
            "intensity": current_idea.get("intensity", "medium")
        }

    # Lock 4: Vocal Cadence & Contradiction
    if locks.get("vocal", False) or locks.get("voice", False):
        if current_idea.get("vocal_idiolect"):
            locked_fields["vocal_idiolect"] = current_idea["vocal_idiolect"]
        if current_idea.get("central_contradiction"):
            locked_fields["central_contradiction"] = current_idea["central_contradiction"]

    # Synthesize with locked fields preserved
    result = synthesize_advanced_procedural_seed(
        genre=genre,
        dynamic=dynamic,
        seed_hint=seed_hint,
        intensity=intensity,
        locked_fields=locked_fields,
        correction_tier=correction_tier,
        era=era
    )

    locked_names = [k for k, v in locks.items() if v]
    result["source"] = f"Procedural Forge (Locked: {', '.join(locked_names) if locked_names else 'None'})"
    return result


# =========================================================================
# 6. MASTER SEED & PROCEDURAL ENTRY POINT
# =========================================================================

def get_procedural_pitch(
    genre: str = "",
    dynamic: str = "",
    seed_hint: str = "",
    prefer_master_seed: bool = False,
    intensity: str = "any",
    correction_tier: str = "off",
    era: str = "off"
) -> Dict[str, Any]:
    """
    Main entry point for procedural generation:
    Selects between handcrafted master seeds (filtered by intensity) or combinatorial synthesis.
    """
    lowered = (genre + " " + dynamic + " " + seed_hint).lower()

    if (prefer_master_seed or random.random() < 0.35) and correction_tier not in ["off", "none", "disabled"]:
        candidates = MASTER_SEEDS.copy()

        # Filter by intensity if specified
        if intensity and intensity != "any":
            intens = intensity.lower().strip()
            if intens in ["mild", "cozy"]:
                candidates = [s for s in candidates if s.get("intensity") == "mild"]
            elif intens in ["medium", "discipline", "moderate"]:
                candidates = [s for s in candidates if s.get("intensity") == "medium"]
            elif intens in ["heavy", "restraint", "intense"]:
                candidates = [s for s in candidates if s.get("intensity") == "heavy"]

        # Genre & trope filter
        if any(k in lowered for k in ["brat", "spank", "provoc", "housewife", "chef"]):
            filtered = [s for s in candidates if "Brat" in s["title"] or "Housewife" in s["title"] or "Chef" in s["title"]]
            if filtered:
                candidates = filtered
        elif any(k in lowered for k in ["overworked", "rope", "blindfold", "surgeon"]):
            filtered = [s for s in candidates if "Overworked" in s["title"] or "Rope" in s.get("tags", []) or "Surgeon" in s["title"]]
            if filtered:
                candidates = filtered
        elif any(k in lowered for k in ["noble", "gothic", "arranged", "consort", "inquisitor"]):
            filtered = [s for s in candidates if "Aristocratic" in s["title"] or "Consort" in s["title"] or "Inquisitor" in s["title"]]
            if filtered:
                candidates = filtered
        elif any(k in lowered for k in ["frontier", "cabin", "homestead", "axe", "valkyrie"]):
            filtered = [s for s in candidates if "Frontier" in s["title"] or "Shield" in s["title"]]
            if filtered:
                candidates = filtered
        elif any(k in lowered for k in ["mechanic", "hangar", "cyber", "wrench"]):
            filtered = [s for s in candidates if "Mechanic" in s["title"]]
            if filtered:
                candidates = filtered
        elif any(k in lowered for k in ["scholar", "book", "academic", "intellectual"]):
            filtered = [s for s in candidates if "Scholar" in s["title"]]
            if filtered:
                candidates = filtered

        if candidates:
            chosen = random.choice(candidates)
            res = copy.deepcopy(chosen)
            res["source"] = f"Curated Master Seed ({res.get('intensity', 'medium').capitalize()} Tier)"
            if era and era != "off":
                era_info = get_era_info(era)
                if era_info:
                    res["era"] = era_info.get("name") or era
            return res

    # Otherwise synthesize brand-new combinatorial concept with matching intensity
    return synthesize_advanced_procedural_seed(genre, dynamic, seed_hint, intensity=intensity, correction_tier=correction_tier, era=era)
