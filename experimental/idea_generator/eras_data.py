#!/usr/bin/env python3
"""
Comprehensive Historical Eras & Temporal Settings Catalog
Over 70 richly documented historical settings categorized across:
- Setting Defined (Off)
- Fantasy (Timeless Achronological)
- Ancient Civilizations & Antiquity
- Extensive Country-Specific Medieval Eras (40+ templates across Europe, Asia, Middle East, Africa, Americas)
- Renaissance & Age of Sail
- Enlightenment & Revolutions
- Victorian, Frontier & Industrial
- 20th Century Historical Decades
"""

import os
import re
import json
import time
import random
from pathlib import Path
from typing import Dict, Any, List, Optional, Set

HISTORICAL_ERAS: Dict[str, Dict[str, Any]] = {
    # ==========================================
    # META / DEFAULT MODES
    # ==========================================
    "off": {
        "id": "off",
        "name": "🚫 Off (Unconstrained)",
        "short_name": "Off",
        "span": "Flexible / Genre Default",
        "category": "Setting Defined",
        "region": "Global / Any",
        "aesthetic": "Follows base genre and user prompt without imposing specific temporal historical rules.",
        "tech": "Determined by prompt/genre.",
        "social_codes": "Standard interpersonal dynamic.",
        "names": [],
        "titles": [],
        "tags": []
    },
    "timeless_fantasy": {
        "id": "timeless_fantasy",
        "name": "🌌 Timeless High Fantasy (Achronological)",
        "short_name": "Timeless Fantasy",
        "span": "Eternal / Mythic Epoch",
        "category": "Fantasy",
        "region": "Mythic Realms",
        "aesthetic": "Floating crystal spires, ancient enchanted weirwood groves, ageless elven courts, runic ley-lines, dragon-crested citadels, arcane libraries suspended in starlight.",
        "tech": "Arcane enchantment, elemental alchemy, crystal foci, griffon couriers, enchanted parchment. Disregards earthly centuries entirely.",
        "social_codes": "Arcane oaths, immortal court intrigue, bloodline vows, guild pacts, destiny and prophecy bound.",
        "names": [
            "Lady Elenora", "Archmage Lyra", "Seraphina the Dawn-Watcher", "Sylvaia", "Princess Vespera",
            "Maelis", "Aurelia Nightbloom", "Morrigan", "Ilyria", "Valeriana", "Elowen Starweaver", "Isolde Sunshard"
        ],
        "titles": [
            "The High Elven Courtier", "The Arcane Scribe of the Silver Spire", "The Reluctant Dragon-Rider",
            "The Enchantress Consort", "The Ageless Temple Oracle", "The Exiled Fae Princess"
        ],
        "tags": ["Timeless High Fantasy", "Achronological", "Mythic Realm", "Arcane Magic", "Eternal Court"]
    },

    # ==========================================
    # MYTHIC FANTASY & POWER-EXCHANGE REALMS
    # ==========================================
    "dark_fantasy_imperium": {
        "id": "dark_fantasy_imperium",
        "name": "⚔️ Dark Fantasy Imperium (Sovereign Dominance & Iron Hierarchy)",
        "short_name": "Dark Imperium",
        "span": "Epoch of the Iron Archon",
        "category": "Fantasy",
        "region": "The Obsidian Citadel & Ashen Marches",
        "aesthetic": "Massive basalt keeps, iron throne halls, flickering torchlight casting deep shadows, heavy fur mantles over polished black plate armor, cold flagstone floors, velvet divans, heraldic banners of twin ravens, rain beating against high stained-glass lancets.",
        "tech": "Blood-forged steel, runic warding, soul-binding iron torcs, scrying mirrors of obsidian, enchanted censers burning sweet drowsy incense, geas-inscribed scrolls.",
        "social_codes": "Uncompromising patriarchal martial authority. Feudal lord-consort protocol where female subjects and bonded wards kneel on command. High pride disciplined through solemn ritual chastisement, strict household obedience, absolute protection pledged in return for total submission.",
        "names": [
            "Lady Genevieve", "Morrigan", "Aurelia", "Sylvia of House Vane", "Helena",
            "Isolde the Bound", "Vespera", "Elowen of the Iron Vale", "Marcella", "Rowena", "Valeria", "Seraphina"
        ],
        "titles": [
            "The Bound Warlord's Ward", "The Archon's Defiant Captive", "The Imperial Consort-in-Training",
            "The Chastised Noblewoman", "The Sovereign's Kept Scribe", "The Rebellious Castellan's Daughter",
            "The Sworn Blood-Pet of the High Citadel", "The Submissive High Priestess"
        ],
        "tags": ["Dark Fantasy", "Male Dominance", "Iron Hierarchy", "BDSM Protocols", "Sovereign Lord", "Bound Consort", "Discipline & Obedience", "Feudal Authority"]
    },
    "high_court_fae_dominion": {
        "id": "high_court_fae_dominion",
        "name": "👑 High Fae Sylvan Court (Immortal Archons & Courtly Submission)",
        "short_name": "High Fae Dominion",
        "span": "Age of Eternal Twilight",
        "category": "Fantasy",
        "region": "The Silverwood Palaces & Twilight Glades",
        "aesthetic": "Silver-barked weirwood trees, bioluminescent moss, canopied silk pavilions, moonlit marble colonnades, collars of woven silver thorns, gossamer robes, velvet pillows, enchanted silver chimes that chime upon entering the Archon's presence.",
        "tech": "Fae glamour, unbreachable true-name geases, starlight elixirs of absolute compliance, sensory-heightening blossom dust, silver bells, woven thorn-bindings that tighten on insolence.",
        "social_codes": "Courtly archon supremacy. High Fae lords maintain absolute dominion over mortals and junior nymphs. Strict protocol: lowered gazes, curtsying before speech, playful yet unrelenting physical chastisement for breach of court decorum. Defiance is treated as a sweet offense to be methodically corrected.",
        "names": [
            "Aeloria", "Lyanna Nightbloom", "Princess Vespera", "Sariel", "Eleni of the Moonwell",
            "Thalia", "Kaelith", "Morwenna", "Faelen", "Isolde Silverleaf", "Amara"
        ],
        "titles": [
            "The Fae Lord's Kept Songbird", "The Mortal Consort under Geas", "The Insolent Sylvan Ward",
            "The Archon's Chastised Flower", "The Twilight Palace Pet", "The High Court's Bound Handmaiden",
            "The Moonlit Favorite", "The Submissive Wood-Nymph Bride"
        ],
        "tags": ["High Fae", "Courtly Submission", "Male Dom", "BDSM Protocols", "Fae Glamour", "True Name Geas", "Sweet Discipline", "Immortal Hierarchy"]
    },
    "vampiric_blood_aristocracy": {
        "id": "vampiric_blood_aristocracy",
        "name": "🩸 Vampiric Blood Aristocracy (Elder Lords & Thrall Etiquette)",
        "short_name": "Vampiric Aristocracy",
        "span": "Midnight Regnum (Eternal Night)",
        "category": "Fantasy",
        "region": "Sanguine Highlands & Neo-Gothic Manors",
        "aesthetic": "Crimson velvet drapery, heavy gilded mirrors, black marble fireplaces, rosewood furniture, candelabras of dripping wax, leather-bound ledgers, secluded bedchambers with velvet cuffs and silk ties, midnight rain beating on gothic cathedral windows.",
        "tech": "Mesmeric hypnosis, blood-resonance bonds, alchemical sensory draughts, shadow-weaving, enchanted chokers that pulse with the Master's heartbeat.",
        "social_codes": "Patrician elder sovereignty. The Master's word is immutable law. Thralls and mortal wards are cherished possessions subject to rigid domestic rules: scheduled feeding presentations, kneeling inspections, formal permissions before speaking, and physical discipline over the elder's knee for rebellious behavior.",
        "names": [
            "Carmilla", "Eleanora", "Lucille", "Vivienne", "Beatrice",
            "Rosaline of House Draven", "Selene", "Cordelia", "Gwendolyn", "Clara"
        ],
        "titles": [
            "The Elder's Prized Blood-Thrall", "The Aristocrat's Veiled Ward", "The Rebellious Governess Consort",
            "The Kept Doll of Castle Draven", "The Master's Sanguine Favorite", "The Disciplined Mortal Noblewoman",
            "The Bound Blood-Bride", "The Kneeling Manor Maid"
        ],
        "tags": ["Vampire Lord", "Blood Bond", "Male Dominance", "BDSM Etiquette", "Thrall Submission", "Gothic Romance", "Possessive Discipline", "Dark Aristocracy"]
    },
    "barbarian_warlord_steppes": {
        "id": "barbarian_warlord_steppes",
        "name": "🐺 Savage Warlord Steppes (Chieftain Clanship & Captive Pride)",
        "short_name": "Warlord Steppes",
        "span": "Age of Ash & Beast-Blood",
        "category": "Fantasy",
        "region": "Frostpeak Highlands & The Great Khanate",
        "aesthetic": "Roaring hearth fires inside timber longhouses, wolf-pelt rugs, heavy iron chains, carved bone ornaments, leather breeches and harnesses, scent of pine and woodsmoke, snow-covered crags outside the warm chieftain's hall.",
        "tech": "Rune-carved steel axes, beast taming, primal blood marks, shamanic stamina salves, heavy rawhide straps, brand of the clan.",
        "social_codes": "Savage patriarchal clanship. The Chieftain claims exclusive ownership of captives and prizes of war. Defiant civilized noblewomen are systematically broken of their haughtiness through raw physical authority, hard domestic work, firm spankings over the warlord's lap, and possessive protection from other clan warriors.",
        "names": [
            "Yvaine", "Freja", "Signy", "Brynhild", "Astrid",
            "Althea the Captive", "Runa", "Kira", "Helga", "Brenna", "Thora"
        ],
        "titles": [
            "The Chieftain's Captive Princess", "The Tamed Steppe Prize", "The Defiant Shieldmaiden in Bonds",
            "The Warlord's Hearth-Kneeler", "The Haughty Lady Made Pet", "The Clan Patriarch's Kept Consort",
            "The Broken Valkyrie", "The Chieftain's Disciplined Bride"
        ],
        "tags": ["Barbarian Warlord", "Captive Pride", "Male Dom", "BDSM Taming", "Savage Clan", "Chieftain Authority", "Raw Masculinity", "Warm Hearth & Furs"]
    },
    "arcane_academy_magisterium": {
        "id": "arcane_academy_magisterium",
        "name": "🔮 Arcane Magisterium (High Sorcerer & Familiar Bondage)",
        "short_name": "Arcane Magisterium",
        "span": "Epoch of the Scholomance Towers",
        "category": "Fantasy",
        "region": "The Celestial Spire & Floating Scriptoriums",
        "aesthetic": "High vaulted libraries of ancient parchment, swirling astral orbs, brass astrolabes, rich leather study armchairs, velvet desk runners, runic circles glowing on cold stone, locked grimoires with chained bindings.",
        "tech": "Telepathic command links, runic discipline runes inked upon skin, sensory heightening cantrips, compliance draughts, silver quill scribing, enchanted silences.",
        "social_codes": "Hierarchical Magister-apprentice and Master-familiar dominion. Intellectual supremacy paired with rigorous domestic discipline. Female apprentices or bound familiars undergo strict daily recitation, posture checks at the Magister's desk, and measured physical correction for magical recklessness or impudence.",
        "names": [
            "Lyra", "Vespera", "Aurelia", "Sybilla", "Cassandra",
            "Elianor", "Kallista", "Nyx", "Morrigan", "Ariadne"
        ],
        "titles": [
            "The Archmage's Disobedient Apprentice", "The Bound Familiar Consort", "The Magister's Inscribed Scribe",
            "The Sorcerer's Kept Alchemist", "The Chastised Spellweaver", "The Familiar in Silver Runes",
            "The Scriptorium Handmaiden", "The Tower's Kneeling Disciple"
        ],
        "tags": ["Arcane Academy", "Magister Authority", "Master Familiar", "BDSM Discipline", "Male Dom", "Runic Inscriptions", "Intellectual Dominance", "Command Runes"]
    },
    "oriental_cultivation_sect": {
        "id": "oriental_cultivation_sect",
        "name": "🐉 Celestial Cultivation Sect (Grandmaster Patriarch & Dual-Cultivation Rules)",
        "short_name": "Cultivation Sect",
        "span": "Age of Immortals & Tribulations",
        "category": "Fantasy",
        "region": "Jade Cloud Mountains & Heavenly Sword Peak",
        "aesthetic": "Misty bamboo groves, jade pavilion halls, silk sashes, carved sandalwood furnishings, incense urns of dragon-scent, mountain waterfalls, quiet seclusion caverns with warm stone mats.",
        "tech": "Qi meridian suppression acupuncture needles, immortal-binding cords, spiritual pressure (aura dominance), spirit elixirs, sword-intent seals.",
        "social_codes": "Absolute patriarchal sect hierarchy. The Peak Master or Grand Patriarch possesses unquestioned supremacy over female disciples and dual-cultivation partners. Filial obedience, ritual kowtowing, kneeling tea service, and firm physical chastisement with a jade ruler or discipline paddle for arrogance or cultivation deviance.",
        "names": [
            "Lianhua", "Mei-Ling", "Qingyue", "Xueying", "Yanyue",
            "Baili Ruo", "Xiao Rou", "Tingfeng", "Su-Yin", "Caihong"
        ],
        "titles": [
            "The Grandmaster's Rebellious Disciple", "The Dual-Cultivation Jade Furnace", "The Arrogant Sect Young Miss in Custody",
            "The Peak Lord's Kneeling Tea-Maiden", "The Chastised Sword Fairy", "The Disciplined Daoist Maiden",
            "The Bound Immortal Consort", "The Seclusion Cavern Plaything"
        ],
        "tags": ["Xianxia / Cultivation", "Male Dom", "Patriarch Authority", "BDSM Protocols", "Dual Cultivation", "Jade Ruler Discipline", "Kowtow & Obedience", "Spiritual Pressure"]
    },
    "desert_sultanate_harem": {
        "id": "desert_sultanate_harem",
        "name": "🌙 Mythic Desert Sultanate (Sultan's Seraglio & Palace Protocols)",
        "short_name": "Mythic Sultanate",
        "span": "Era of the Golden Crescent & Djinn",
        "category": "Fantasy",
        "region": "The Oasis Oasis Citadel & City of Brass",
        "aesthetic": "Carved marble lattices (mashrabiya), mosaic tiled fountains, silk sheer canopies, mounds of satin floor cushions, gold ankle bells, sweet oud and rosewater perfumes, desert breezes through arched balconies overlooking minarets under starlight.",
        "tech": "Djinn binding seals, enchanted rosewater oils that induce docile pliancy, gold torcs with warding charms, mesmer water pipes, sensory silks.",
        "social_codes": "Sultanic harem hierarchy and absolute male royal prerogative. Consorts, odalisques, and noble captives live by an exacting court protocol: veiled modesty, kneeling submission upon the Sultan's entry, ritual baths, foot massages, and bastinado or silken paddle chastisement administered by palace authority or the Sultan himself for jealous intrigue.",
        "names": [
            "Yasmina", "Soraya", "Fatima", "Leila", "Zulima",
            "Nour", "Scheherazade", "Safira", "Amina", "Badra"
        ],
        "titles": [
            "The Sultan's Rebellious Odalisque", "The Captive Frankish Princess in the Seraglio", "The Kept Bedchamber Favorite",
            "The Chastised Palace Dancer", "The Grand Vizier's Veiled Ward", "The Gold-Collared Consort",
            "The Seraglio's Insolent Jewel", "The Sultan's Kneeling Pet"
        ],
        "tags": ["Desert Fantasy", "Sultan Authority", "Harem & Seraglio", "Male Dom", "BDSM Protocols", "Golden Ankle Bells", "Sensual Discipline", "Royal Prerogative"]
    },
    "dark_elf_underdark_drow": {
        "id": "dark_elf_underdark_drow",
        "name": "🕷️ Abyssal Underdark Citadel (Warlock Archon & Captive Subservience)",
        "short_name": "Underdark Dominion",
        "span": "Epoch of the Shadow Under-Realm",
        "category": "Fantasy",
        "region": "The Sunless Caverns & Spire of Webs",
        "aesthetic": "Luminescent purple fungi, obsidian spires carved into stalactites, spider-silk hammocks and restraints, subterranean black lakes, cold basalt floors, spiked iron chandeliers, scents of exotic subterranean nightshade and venom wine.",
        "tech": "Shadow-weaving, spider-silk bonds that tighten against resistance, paralysis venoms, mind-flaying telepathy, enchanted collar of subjugation.",
        "social_codes": "Ruthless dark fantasy power exchange. A powerful male Shadow Archon or Warlock Lord who has seized supreme power in the under-realms, commanding total subjugation of rival house daughters, surface captives, and oathbreakers. Rigorous bondage routines, complete loss of privacy, posture training, and punitive corrections.",
        "names": [
            "Vhaera", "Xanthe", "Nathrae", "Mirella", "Talice",
            "Vierna", "Zebeyra", "Illythia", "Kaelis", "Nyleve"
        ],
        "titles": [
            "The Archon's Collared Surface Captive", "The Fallen Matron's Daughter", "The Bound Shadow-Pet",
            "The Insolent High Priestess in Chains", "The Dark Lord's Kept Plaything", "The Chastised Spellblade",
            "The Subjugated Cavern Consort", "The Web-Tied Favorite"
        ],
        "tags": ["Dark Elf / Drow", "Underdark", "Male Dom Warlock", "BDSM Bondage", "Spider Silk Restraints", "Ruthless Dominion", "Collared Captive", "Dark Fantasy"]
    },
    "crusader_inquisition_citadel": {
        "id": "crusader_inquisition_citadel",
        "name": "🕯️ Holy Inquisitor's Keep (Grand Inquisitor & Witch Penance)",
        "short_name": "Inquisition Citadel",
        "span": "Age of the Silver Flame & Penance",
        "category": "Fantasy",
        "region": "Sanctuary of the Radiant Hammer",
        "aesthetic": "Massive stone cloisters, vaulted nave chambers lit by thousands of beeswax candles, iron portcullises, kneeling benches of hard timber, heavy leather straps, incense of frankincense and burning herbs, cold subterranean cells with warm wool blankets.",
        "tech": "Truth-telling consecrated water, witch-mark dowsing, silver thumb-screws and disciplinary birches, wards of binding light, vows inscribed upon parchment strips sealed with wax.",
        "social_codes": "Stern paternalistic spiritual authority. The Grand Inquisitor / Lord Justiciar holds absolute authority to inspect, interrogate, and correct souls under his charge. Captive sorceresses, rebellious heretic noblewomen, and wayward novices undergo rigid repentance routines: prolonged kneeling prayers, confession of impure desires, and ritual bare-bottom chastisement with leather straps for cleansing stubborn pride.",
        "names": [
            "Sister Agnes", "Elysia the Sorceress", "Clara of the Vale", "Morgana the Heretic", "Judith",
            "Bridget", "Katherine", "Verena", "Emmeline", "Cecilia"
        ],
        "titles": [
            "The Inquisitor's Wayward Ward", "The Penitent Sorceress Consort", "The Rebellious Novice under Penance",
            "The Kept Witch of the High Citadel", "The Chastised Heretic Countess", "The Bound Devotee of the Flame",
            "The Inquisitor's Cleansed Prize", "The Kneeling Novitiate"
        ],
        "tags": ["Dark Holy Fantasy", "Grand Inquisitor", "Male Dom", "BDSM Penance", "Ritual Chastisement", "Kneeling Repentance", "Stern Authority", "Spiritual Discipline"]
    },
    "pirate_corsair_leviathan_seas": {
        "id": "pirate_corsair_leviathan_seas",
        "name": "🏴‍☠️ Siren Sea Corsair Realm (Dread Captain & Captive Sea-Bride)",
        "short_name": "Corsair Sea Realm",
        "span": "Age of the Kraken & Black Flags",
        "category": "Fantasy",
        "region": "The Mist Isles & Floating Pirate Haven",
        "aesthetic": "Creaking oak timbers of a massive three-deck man-of-war, lantern-lit captain's great cabin with velvet curtains, rum barrels, rolled sea charts, polished brass compasses, ocean spray through aft gallery windows, scents of salt, leather, and gunpowder.",
        "tech": "Ghost-ship curses, kraken-bone talismans, enchanted compasses that seek the heart's desire, sea-shanty charms, heavy hempen ropes and iron bilge cuffs.",
        "social_codes": "Absolute quarterdeck command. The Captain's word is law above and below decks. A captured highborn lady or rebellious siren is kept strictly in the Great Cabin as the Captain's personal prize; defiance is answered over his knee with a rope's end or leather belt, followed by possessive care, opulent gowns, and fierce protection from the rough crew.",
        "names": [
            "Cordelia", "Lady Victoria", "Guinevere", "Coralie", "Maeve",
            "Isla", "Arabella", "Genevieve", "Serena", "Tamsin"
        ],
        "titles": [
            "The Dread Captain's Captive Lady", "The Cabin-Bound Sea Consort", "The Haughty Governor's Daughter in Ropes",
            "The Corsair's Chastised Siren", "The Kept Prize of the Flagship", "The Rebellious Bilge-Kneeler Made Bride",
            "The Sea Lord's Hand-Tamed Pet", "The Great Cabin's Kept Jewel"
        ],
        "tags": ["Fantasy Pirate", "Dread Captain", "Male Dom", "BDSM Taming", "Captive Lady", "Quarterdeck Law", "Cabin Kept", "Sea Romance"]
    },
    "dragon_lord_volcanic_keep": {
        "id": "dragon_lord_volcanic_keep",
        "name": "🔥 Dragon-Lord Sovereign (Draconic Patriarch & Hoard Consort)",
        "short_name": "Dragon-Lord Keep",
        "span": "Age of Primordial Fire",
        "category": "Fantasy",
        "region": "The Cinder Spire & Wyrmstone Caldera",
        "aesthetic": "Massive obsidian caverns lit by molten gold rivers, heaps of glimmering gemstones and ancient treasure, gold-chained silk cushions, warm geothermal baths, towering carved pillars of scorched basalt, heavy draconic heraldry.",
        "tech": "Dragon-fire enchantments, gold torcs forged in primordial flame that cannot be removed without the Lord's breath, heat-resistant warding runes, draconic scent-marking.",
        "social_codes": "Primal draconic possessiveness and absolute sovereignty. The Dragon-Lord regards his human or elven consort as the crowning jewel of his hoard. She is adored, pampered in unimaginable wealth, and subjected to unyielding patriarchal discipline: instant compliance, kneeling display, and stern bare-hand corrections whenever she attempts to test boundaries or leave his side.",
        "names": [
            "Aurelia", "Seraphina", "Lyra of the Ember Glen", "Lady Vespera", "Elysia",
            "Ignis-sworn Morwenna", "Talia", "Kallista"
        ],
        "titles": [
            "The Dragon-Lord's Hoard Consort", "The Cinder Spire's Prized Jewel", "The Rebellious Princess in Gold Chains",
            "The Wyrm's Chastised Pet", "The Fire-Bound Maiden", "The Sovereign's Kept Treasure",
            "The Dragon's Kneeling Bride", "The Caldera's Pampered Ward"
        ],
        "tags": ["Dragon Lord", "Hoard Consort", "Male Dom", "BDSM Possessiveness", "Primal Dominance", "Gold Torc", "Pampered & Disciplined", "Mythic Fire"]
    },

    # --- Patriarchal Elf Societies ---
    "high_elf_patriarchal_dynasty": {
        "id": "high_elf_patriarchal_dynasty",
        "name": "🧝 High Elven Sovereign House (Solar Archon & Dynastic Obedience)",
        "short_name": "High Elf Patriarch",
        "span": "Epoch of the Sun Spire (First Millennium)",
        "category": "Fantasy",
        "region": "The Golden Spires & Sunstone Courts",
        "aesthetic": "Towering white-and-gold spires catching the dawn, marble terrace gardens with singing fountain waters, gossamer silk robes with golden threads, sunstone crystal lanterns, delicate harp music, velvet cushions beneath sunlit archways.",
        "tech": "Solar-forged circlets, light-weaving glamour, solar geas-pacts that bind speech and will, celestial scrying lenses, golden discipline torcs that hum with warm compliance.",
        "social_codes": "Strict High Elven patriarchal aristocracy. The Solar Patriarch / Archon possesses absolute bloodline authority over daughters, junior maidens, and mortal concubines. Protocol demands downcast eyes, graceful knee-curtsies, and soft-spoken reverence; haughty elven insolence or emotional petulance is met with measured, dignified physical chastisement over the Archon's lap in the solar sanctuary, reinforcing pristine noble bloodline duty.",
        "names": [
            "Lady Aurelia", "Sylvaia", "Elenora", "Isolde of House Sunshard", "Vespera",
            "Caelynn", "Lyra Dawnwhisper", "Naeriel", "Faelen", "Meriel"
        ],
        "titles": [
            "The Solar Archon's Highborn Consort", "The Sun Spire's Chastised Daughter", "The Bound Elven Maiden in Solar Gold",
            "The Archon's Kept Scribe-Consort", "The Highborn Lady Over the Patriarch's Knee", "The Sovereign House's Kneeling Beauty",
            "The Sunstone Court's Proud Pet", "The Archon's Honored Sun-Bride"
        ],
        "tags": ["High Elf", "Solar Patriarch", "Male Dominance", "BDSM Protocols", "Sun Spire Hierarchy", "Solar Geas", "Noble Elven Etiquette", "Dignified Chastisement"]
    },
    "sylvan_wood_elf_patriarch": {
        "id": "sylvan_wood_elf_patriarch",
        "name": "🏹 Sylvan Wood-Elf Clan (Great Oak Patriarch & Forest Protocol)",
        "short_name": "Wood-Elf Patriarch",
        "span": "Age of Deep Roots & Green Mist",
        "category": "Fantasy",
        "region": "The Ironwood Canopy & Elder Tree Keeps",
        "aesthetic": "Vast hollowed elder weirwood trees, rope bridges suspended through moonlit mist, woven moss rugs, scent of cedar and crushed pine needles, glowing bioluminescent lanterns, leather archer bracers, wolf pelts draped over polished root thrones.",
        "tech": "Living root-bindings that tighten on pulse, elder bowcraft, leaf-camouflaged silken restraints, moon-dew healing draughts, spirit-totem carvings.",
        "social_codes": "Ancient forest patriarchal clanship. The Elder Oak Patriarch leads the hunt and commands total domestic loyalty from the woodland maidens, huntresses, and captive outsiders. Woodland law dictates instant deference to the Clan Father's command; wild defiance or wandering beyond ward boundaries is corrected over the Patriarch's knee before the central tree-hearth with supple ash switches, balancing raw woodcraft discipline with deep protective devotion.",
        "names": [
            "Lirael", "Talia Willowshade", "Morwenna", "Faelyn", "Briar",
            "Kaelen", "Sariel of the Deep Grove", "Eluney", "Nimue", "Aelwen"
        ],
        "titles": [
            "The Forest Patriarch's Captive Maiden", "The Elder Tree's Chastised Huntress", "The Sylvan Chieftain's Tamed Ward",
            "The Wild Grove's Kneeling Consort", "The Clan Father's Kept Songbird", "The Rebellious Woodland Pet",
            "The Ironwood's Disciplined Bride", "The Deep Root Hearth-Keeper"
        ],
        "tags": ["Wood Elf", "Forest Patriarch", "Male Dominance", "Elder Tree Clan", "Ash Switch Discipline", "Huntress Taming", "Root Bindings", "Deep Sylvan Law"]
    },

    # --- Patriarchal Demi-Human Societies ---
    "beastfolk_alpha_patriarch_pack": {
        "id": "beastfolk_alpha_patriarch_pack",
        "name": "🐺 Beastfolk Apex Clan (Wolf-Kin Alpha Patriarch & Pack Law)",
        "short_name": "Beastfolk Alpha Clan",
        "span": "Age of the Blood-Moon & Fang",
        "category": "Fantasy",
        "region": "The Howling Ridge & Pine Den Citadels",
        "aesthetic": "Heavy cedar longhouses perched on misty crags, massive stone firepits with crackling logs, thick grizzly and wolf furs, iron chain links, scent of musk, smoke, and wild pine, bone-carved den markers, leather harnesses.",
        "tech": "Primal scent-marking, blood-bonding bites, rune-forged iron cuffs, beast-stamina salves, moonstone amulets.",
        "social_codes": "Uncompromising apex demi-human pack patriarchy. The Alpha Male Patriarch holds undisputed dominance over the entire clan. Female beastfolk (wolf, cat, fox, bear demi-humans) and claimed human wards live under strict den protocol: baring the throat in submission, kneeling presentation at mealtime, and unquestioned obedience. Defiance, growling, or pack friction is answered over the Alpha's lap with firm bare-hand spankings or leather discipline, followed by neck-licking aftercare and ferocious lifelong protection.",
        "names": [
            "Freja", "Kira Claw-Dancer", "Yvaine", "Brenna", "Sari",
            "Rhea of the Ridge", "Tora", "Shiba", "Luna", "Nyra"
        ],
        "titles": [
            "The Alpha Patriarch's Claimed Den-Mate", "The Rebellious Demi-Human Pack Pet", "The Alpha's Chastised She-Wolf",
            "The Howling Ridge's Kept Prize", "The Den's Kneeling Favorite", "The Broken Wildcat Consort",
            "The Pack Father's Throat-Bared Bride", "The Mountain Den's Tamed Maiden"
        ],
        "tags": ["Demi-Human", "Beastfolk Pack", "Wolf-Kin", "Alpha Patriarch", "Male Dominance", "BDSM Den Protocol", "Throat Baring Submission", "Primal Aftercare"]
    },
    "feline_kitsune_demihuman_realm": {
        "id": "feline_kitsune_demihuman_realm",
        "name": "🦊 Kitsune & Feline Demi-Human Shogunate (Lord Patriarch & Kemonomimi Seraglio)",
        "short_name": "Demi-Human Shogunate",
        "span": "Age of the Nine Tails & Moon Pavilions",
        "category": "Fantasy",
        "region": "The Cherry Blossom Valleys & Spirit Keeps",
        "aesthetic": "Lacquered cedar pavilions, sliding rice-paper shoji screens, tatami mats, velvet cat-nap cushions, paper lanterns glowing soft pink and gold, flowing silk yukatas, scents of cherry blossoms and green tea, gold bells tied with scarlet ribbons.",
        "tech": "Fox-fire charms, silk bell-collars, spirit-tail grooming oils, soothing incense of docile compliance, enchanted paper talisman restraints.",
        "social_codes": "Patriarchal kemonomimi lord dominance. The Lord Sovereign commands absolute domestic mastery over his demi-human kitsune, cat-girl, and rabbit-kin maidens. Exacting parlor and tea protocols: ear-lowering deference, kneeling tail-tucking, and formal greetings. Misbehavior, playful clawing, or impudence is disciplined across the Lord's lap with a padded silk paddle or light bamboo switch, followed by soothing ear-scratches, tail-grooming, and warm cuddles.",
        "names": [
            "Yuki", "Kitsune Tamamo", "Miyu", "Ran", "Chiyo",
            "Kohaku", "Sayuri of the Red Ribbon", "Neko Rin", "Ayame", "Suzume"
        ],
        "titles": [
            "The Lord's Pampered Kitsune Favorite", "The Chastised Cat-Girl Consort", "The Bell-Collared Fox Maiden",
            "The Shogunate's Kneeling Kemonomimi", "The Velvet Cushion Pet", "The Lord's Disciplined Spirit-Bride",
            "The Tatami Room's Insolent Plaything", "The Silk-Tied Beast-Maiden"
        ],
        "tags": ["Demi-Human", "Kemonomimi", "Kitsune & Neko", "Lord Patriarch", "Male Dominance", "Bell Collar", "Ear-Scratch Discipline", "Silk Paddle"]
    },
    "dwarven_mountain_king_clan": {
        "id": "dwarven_mountain_king_clan",
        "name": "⚒️ Dwarven Mountain Thane Guild (All-Father Clan Thane & Anvil Law)",
        "short_name": "Dwarven Thane Guild",
        "span": "Age of Deep Iron & Gold Ores",
        "category": "Fantasy",
        "region": "The Great Under-Mountain Forge-Halls",
        "aesthetic": "Colossal stone halls carved into the roots of mountains, roaring smelting furnaces casting gold-and-orange light, polished granite banquet tables, heavy iron tankards, velvet tapestries edged in beaten copper, warm private stone chambers with featherbeds and hearths.",
        "tech": "Rune-forged locks, heat-retaining hearth stones, masterwork leather aprons and belts, gold signet rings, ancestral ledger tablets.",
        "social_codes": "Unyielding dwarven patriarchal clan law. The Clan Thane / All-Father rules the household and hold with absolute tradition. Female clan kin, human wards, or arranged elven brides must respect hearth duties, accounting ledgers, and patriarchal decrees; petulance or disrespect of clan elders is met with firm, no-nonsense discipline over the Thane's heavy leather apron with a leather strap, followed by hearty feasts, hearth warmth, and unbreakable loyalty.",
        "names": [
            "Helga", "Brigit Stone-Hand", "Astrid", "Dagmar", "Gisela",
            "Kari of the Iron Hearth", "Vera", "Berta", "Inga", "Thordis"
        ],
        "titles": [
            "The Mountain Thane's Arranged Consort", "The Forge-Hall's Chastised Lady", "The All-Father's Kept Clan Bride",
            "The Hearth-Keeper Over the Thane's Knee", "The Gold-Hall's Disciplined Ward", "The Under-Mountain's Tamed Jewel",
            "The Iron King's Obedient Wife", "The Deep Vault's Treasured Pet"
        ],
        "tags": ["Dwarven Realm", "Mountain Thane", "Patriarchal Clan", "Male Dominance", "Anvil & Hearth", "Leather Apron Discipline", "Traditional Hierarchy", "Deep Mountain Law"]
    },
    "dragonkin_naga_sovereign_patriarchy": {
        "id": "dragonkin_naga_sovereign_patriarchy",
        "name": "🐍 Serpentine & Draconic Brood (Naga King Patriarch & Coiled Mastery)",
        "short_name": "Naga Brood Patriarch",
        "span": "Age of Primordial Scales",
        "category": "Fantasy",
        "region": "The Sunken Jade Caverns & Emerald Terraces",
        "aesthetic": "Subterranean emerald springs, warm thermal marble slabs, jade columns carved with coiled serpents, silk sheer canopies draped over warm stone beds, golden armlets, sweet lotus blossom steam, flickering torches reflecting on iridescent scales.",
        "tech": "Hypnotic coil-binding, warmth-attraction alchemy, enchanted gold bangles that chime softly, venom-extracted truth draughts, thermal stone wards.",
        "social_codes": "Ancient reptilian / draconic demi-human patriarchy. The Brood Patriarch / Serpent King exercises complete possessive domain over human captives and demi-human maidens. Physical containment, coiled holding, and mandatory basking presentations at his side. Insolence or escape attempts are answered by tight, immobilizing coil-restraint and firm bare-hand correction, followed by warm venom-soothed docile surrender.",
        "names": [
            "Sariha", "Vipira", "Nadia", "Kallista", "Elysia of the Jade Spring",
            "Zulima", "Leila", "Shyva", "Morrigan", "Sorsha"
        ],
        "titles": [
            "The Serpent King's Coiled Captive", "The Brood Patriarch's Chastised Pet", "The Emerald Spring's Kneeling Bride",
            "The Jade Cavern's Kept Consort", "The Naga Lord's Tamed Prize", "The Coiled Sanctuary's Docile Jewel",
            "The Brood's Possessed Human Maiden", "The Sunken Palace's Bound Favorite"
        ],
        "tags": ["Demi-Human", "Dragonkin & Naga", "Brood Patriarch", "Male Dominance", "Coil Restraint", "BDSM Containment", "Thermal Basking", "Hypnotic Surrender"]
    },

    # --- Patriarchal Mythic Human Societies ---
    "mythic_norse_patriarchal_homestead": {
        "id": "mythic_norse_patriarchal_homestead",
        "name": "🛡️ Norse Jarl Homestead (Allfather Clan Patriarch & Skjaldmær Taming)",
        "short_name": "Norse Clan Patriarch",
        "span": "Epoch of the Wolf & Raven",
        "category": "Fantasy",
        "region": "Fjordlands & Great Timber Longhalls",
        "aesthetic": "Massive pine log longhall, roaring central hearth trench, carved dragon posts, drinking horns, thick wolf and bear furs, mead casks, bitter fjord winds howling outside the warm timber hall.",
        "tech": "Runestones, iron-rimmed shields, beast-bone carvings, mead brewing, ancestral swords, rawhide bindings, warmth wards.",
        "social_codes": "Allfather patriarchal clanship. The Jarl's authority over his homestead, wives, shieldmaidens, and wards is absolute. Household tasks, marriages, and clan justice rest solely in his hands; willful insolence or dishonor is answered before the clan hearth over the Jarl's knee with firm birch switches, followed by soothing mead and lifelong fiercely possessive protection.",
        "names": [
            "Astrid", "Signy", "Freydis", "Brynhild", "Thora",
            "Ingrid of the Fjord", "Gudrun", "Ragnheld", "Svanhild", "Alva"
        ],
        "titles": [
            "The Jarl's Proud Shieldmaiden Consort", "The Clan Patriarch's Tamed Ward", "The Defiant Valkyrie at the Hearth",
            "The Longhall's Rebellious Prize", "The Chieftain's Chastised Bride", "The Fjordland Clan Pet",
            "The Allfather's Kneeling Favorite", "The Timber Hall's Bound Mistress"
        ],
        "tags": ["Norse Mythic", "Allfather Patriarch", "Male Dominance", "Shieldmaiden Taming", "Hearth & Furs", "Clan Justice", "BDSM Discipline", "Chieftain Authority"]
    },
    "celestial_emperor_forbidden_palace": {
        "id": "celestial_emperor_forbidden_palace",
        "name": "🏯 Imperial Dynasty (Son of Heaven & Inner Palace Decrees)",
        "short_name": "Imperial Palace",
        "span": "Dynastic Golden Epoch",
        "category": "Fantasy",
        "region": "The Forbidden Vermilion Citadel",
        "aesthetic": "Vast vermilion palace halls with golden glazed roof tiles, misty courtyard ponds filled with golden koi, yellow silk dragon robes, carved jade screens, delicate embroidered slippers, incense of agarwood and orchid blossoms.",
        "tech": "Imperial edict scrolls on yellow silk, jade seals of sovereign authority, acupuncture balance needles, celestial astrology astrolabes, sedan chairs.",
        "social_codes": "Supreme imperial dynastic patriarchy. The Emperor's word is divine edict. Concubines, noble court ladies, and arranged tribute princesses must practice reverent filial submission, graceful kneeling greetings, and modest whispers; insolence or palace jealousy is punished through formal court kneeling penance or private palace chastisement by the Sovereign himself.",
        "names": [
            "Mei-Ling", "Lianhua", "Yanfei", "Qingyue", "Xiu-Ying",
            "Baozhai", "Jia-Li", "Su-Yin", "Ruoxi", "Tingting"
        ],
        "titles": [
            "The Son of Heaven's Insolent Tribute Bride", "The Inner Palace's Chastised Favorite", "The Emperor's Rebellious Orchid Consort",
            "The Imperial Bedchamber's Kneeling Lady", "The Forbidden Palace's Kept Jewel", "The Dynastic Sovereign's Tamed Noblewoman",
            "The Dragon Throne's Submissive Flower", "The Court's Proud Phoenix in Silks"
        ],
        "tags": ["Imperial Dynasty", "Son of Heaven", "Palace Patriarchy", "Male Dominance", "Forbidden Citadel", "Jade Seal Edict", "Kowtow & Etiquette", "Concubine Hierarchy"]
    },

    # =========================================================================
    # INTEGRATED MULTI-SPECIES PATRIARCHAL REALMS (ELVES, DEMI-HUMANS & HUMANS)
    # =========================================================================
    "multi_race_imperium_triarchy": {
        "id": "multi_race_imperium_triarchy",
        "name": "👑 Grand Tri-Racial Imperium (Sovereign Patriarch & Multi-Species Seraglio)",
        "short_name": "Tri-Racial Imperium",
        "span": "Epoch of the Great Concordat",
        "category": "Fantasy",
        "region": "The Golden Spires & Imperial Metropolis",
        "aesthetic": "Magnificent soaring alabaster and gold citadels rising above vibrant multi-racial avenues, hanging gardens of elven weirwood and lotus pools, opulent marble bedchambers layered with velvet divans and thick wolf-pelt rugs, gilded cages, crystal chandeliers, gold torcs and runic restraint bands.",
        "tech": "Tri-species arcane collars that adapt magically to each biology (dampening high/dark elven spellcraft, soothing demi-human beast instincts, fortifying human stamina), scrying mirrors, lineage registries, geas-sealed edicts.",
        "social_codes": "Unified multi-racial patriarchal empire. The Sovereign Patriarch holds absolute domestic and civic authority over High Elves, Dark Elves (Drow), Wood Elves, Demi-Humans (Feline, Wolf-kin, Kitsune), and Humans under his roof. High Elven ladies serve as proud diplomatic consorts, Dark Elves as fierce bound shadow-enchantresses, Wood Elves as forest-attuned wards, Demi-Humans as pampered, tail-curling bed-pets, and Humans as cherished domestic wives. Racial bickering or haughty insolence is strictly forbidden; any consort who tests boundaries is brought across the Patriarch's knee for solemn, unyielding physical chastisement before the household, followed by loving aftercare and complete multi-racial protection.",
        "names": [
            "Lady Aurelia (High Elf)", "Vhaera (Dark Elf)", "Lirael (Wood Elf)", "Kira (Wolf Demi-Human)", "Miyu (Cat Demi-Human)",
            "Genevieve (Human)", "Tamamo (Kitsune Demi-Human)", "Sylvaia (Moon Elf)", "Eleanor (Human)", "Isolde (High Elf)"
        ],
        "titles": [
            "The Imperium's High Elven Consort", "The Sovereign's Bound Dark Elf Prize", "The Sylvan Wood-Elf Ward",
            "The Patriarch's Pampered Wolf-Kin Pet", "The Cherished Human Household Lady", "The Bell-Collared Kitsune Maiden",
            "The Multi-Racial Seraglio's Favorite", "The Grand Archon's Kneeling Bride"
        ],
        "tags": ["Multi-Species Imperium", "High Elves & Dark Elves", "Demi-Humans & Humans", "Sovereign Patriarch", "Male Dominance", "Tri-Racial Seraglio", "BDSM Protocols", "Unified Domestic Law"]
    },
    "abyssal_underhold_patriarch": {
        "id": "abyssal_underhold_patriarch",
        "name": "🕷️ Abyssal Sunless Citadel (Shadow Warlord & Tri-Species Vassalage)",
        "short_name": "Sunless Citadel",
        "span": "Epoch of the Deep Obsidian Throne",
        "category": "Fantasy",
        "region": "The Great Obsidian Underhold & Bioluminescent Vaults",
        "aesthetic": "Colossal subterranean basalt palaces carved into underground chasms, luminescent violet moss illuminating black marble terraces, warm sulfurous hot springs lined with jade, spider-silk hammocks, iron braziers burning fragrant nightshade oils, heavy silver torcs.",
        "tech": "Spider-silk restraints that tighten on movement, shadow-melding runes, truth-inducing cavern elixirs, mind-pressure torcs, thermal stone beds.",
        "social_codes": "Under-realm patriarchal dominance. The Shadow Warlord rules over an integrated subterranean court comprising native Dark Elves (Drow), captive High Elves brought down from the sun, feral Demi-Humans (Spider-kin, Wolf-kin, Bat-kin, Cat-kin), and surface Human noble hostages. The Warlord systematically breaks the arrogance of solar High Elves, commands obedience from Drow maidens, tames the wild instincts of demi-human beast-girls, and cherishes the tender warmth of human consorts. Bedtime muster requires all four races to kneel side-by-side; disobedience or haughty disputes are swiftly answered over the Warlord's lap with a leather strap, establishing total peace and deep, possessive devotion under his protection.",
        "names": [
            "Nathrae (Dark Elf)", "Lady Elenora (High Elf)", "Nyra (Bat Demi-Human)", "Freja (Wolf Demi-Human)",
            "Lady Katherine (Human)", "Sariel (Moon Elf)", "Talice (Dark Elf)", "Beatrice (Human)"
        ],
        "titles": [
            "The Sunless Citadel's Collared High Elf", "The Shadow Warlord's Drow Consort", "The Cavern's Kneeling Demi-Human Pet",
            "The Cherished Surface Human Captive", "The Warlock Lord's Tamed Priestess", "The Obsidian Hold's Bound Maiden",
            "The Multi-Race Cavern Favorite", "The Patriarch's Subjugated Jewel"
        ],
        "tags": ["Underdark Citadel", "Dark Elves & High Elves", "Demi-Humans & Humans", "Shadow Warlord", "Male Dominance", "BDSM Cavern Protocols", "Spider Silk Restraints", "Multi-Species Rule"]
    },
    "frontier_wild_keep_patriarch": {
        "id": "frontier_wild_keep_patriarch",
        "name": "🌲 Frontier Wild-Marches (Borderland Patriarch & Multi-Race Homestead)",
        "short_name": "Wild-Marches Keep",
        "span": "Age of the Great Frontier Pacts",
        "category": "Fantasy",
        "region": "The Ironwood Valleys & Great Mountain Keeps",
        "aesthetic": "Mighty timber-and-granite keep surrounded by ancient pine forests, roaring central hearth trench with iron spit-roasts, long oak banquet tables where High Elves, Wood Elves, Beastfolk, and Humans dine together, thick bear and wolf pelts on featherbeds, snow-clad peaks outside.",
        "tech": "Rune-forged steel axes, elven warmth wards, beast-taming salves, heavy rawhide straps, ward stones keeping wild monsters outside the perimeter.",
        "social_codes": "Frontier patriarchal clan sovereignty. In the harsh borderlands, the Marcher Lord is the sole protector and master of his multi-species homestead. High Elven refugees humbled by exile, Wood Elf huntresses seeking clan shelter, Demi-Human beast-girls (fox, cat, wolf, bear) needing food and pack security, and resilient Human frontier brides all share his hearth. The Lord's word is unquestioned law: chores are assigned equally, and disrespect of household authority or running into dangerous wilds is answered across the Lord's lap before the blazing fire with a firm leather strap or birch switch, followed by hot stew, fur blankets, and fierce fatherly/husbandly protection.",
        "names": [
            "Sylvia (Wood Elf)", "Lady Charlotte (Human)", "Kira (Wolf Demi-Human)", "Aurelia (High Elf)", "Yuki (Fox Demi-Human)",
            "Rhea (Bear Demi-Human)", "Gwendolyn (Human)", "Briar (Wild Wood Elf)", "Morrigan (Dark Elf Refugee)"
        ],
        "titles": [
            "The Frontier Lord's Wood-Elf Consort", "The Marcher Patriarch's Tamed Beast-Girl", "The Sheltered High Elf Noblewoman",
            "The Hearth's Cherished Human Wife", "The Fox-Kin Den Pet", "The Great Hall's Chastised Maiden",
            "The Multi-Species Clan Favorite", "The Marcher Lord's Kneeling Bride"
        ],
        "tags": ["Frontier Homestead", "Wood Elves & High Elves", "Demi-Humans & Humans", "Borderland Patriarch", "Male Dominance", "Hearth & Furs", "Multi-Race Clan", "Protective Discipline"]
    },
    "sky_citadel_astral_magisterium": {
        "id": "sky_citadel_astral_magisterium",
        "name": "🔮 Celestial Sky-Citadel (Grand Archon & Multi-Race Familiar Seraglio)",
        "short_name": "Astral Sky-Citadel",
        "span": "Age of Arcane Convergence",
        "category": "Fantasy",
        "region": "The Floating Spire of Aethelgard",
        "aesthetic": "Floating marble spires drifting through golden sunset clouds, enchanted botanical terraces where starlight lotus flowers bloom, soaring scriptorium libraries, silk-canopied divans, brass astrolabes, runic circles humming with soft mana.",
        "tech": "Soul-binding familiar pacts, mana-channeling gold collars, telepathic discipline cantrips, soothing compliance draughts, levitation cushions.",
        "social_codes": "High arcane patriarchal hierarchy. An immortal Grand Archon / High Magister presides over a multi-racial academic and domestic sanctuary. High Sun Elves study solar theory, Moon Elves delve into astral divination, Dark Elves manage esoteric shadow alchemy, Demi-Humans (Cat-kin, Kitsune, Dragonkin) serve as bonded familiars who crave the Magister's mana, and Humans serve as beloved grounded companions and scribes. Morning inspection requires all races to curtsy, lower ears/tails, and present their work; magical recklessness, insolence, or petty species rivalry is corrected over the Magister's study desk with a runic discipline ruler or paddle, ensuring sweet pliancy and devoted harmony.",
        "names": [
            "Lyra (High Sun Elf)", "Sariel (Moon Elf)", "Nathrae (Dark Elf)", "Miyu (Cat Demi-Human)", "Tamamo (Kitsune Demi-Human)",
            "Elysia (Dragonkin Demi-Human)", "Clara (Human Scribe)", "Victoria (Human Noblewoman)"
        ],
        "titles": [
            "The Magister's High Sun Elf Consort", "The Moon Spire's Astral Maiden", "The Collared Dark Elf Alchemist",
            "The Archon's Mana-Hungry Kemonomimi Pet", "The Dragonkin Familiar in Chains", "The Human Scribe over the Study Desk",
            "The Multi-Species Scriptorium Favorite", "The Floating Spire's Submissive Jewel"
        ],
        "tags": ["Floating Sky Citadel", "High Elves & Dark Elves & Moon Elves", "Demi-Humans & Humans", "Grand Archon", "Male Dominance", "Familiar Pacts", "Mana Sharing", "Desk Discipline"]
    },
    "desert_oasis_golden_khanate": {
        "id": "desert_oasis_golden_khanate",
        "name": "🌙 Oasis Golden Khanate (Desert Patriarch & Multi-Caste Seraglio)",
        "short_name": "Golden Oasis Khanate",
        "span": "Era of the Brass Crescent",
        "category": "Fantasy",
        "region": "The Great Dune Sea & Hidden Emerald Oasis",
        "aesthetic": "Magnificent sandstone and marble palace pavilions surrounded by palm trees and turquoise spring pools, flowing silk sheer draperies, mounds of satin cushions, gold ankle bells, scent of burning frankincense, sweet dates, and cardamom, Arabian stallions and desert falcons.",
        "tech": "Djinn-warded gold torcs, water-blessed cooling silks, oasis mirage enchantments, calming rosewater essences, scented bastinado paddles.",
        "social_codes": "Imperial oasis patriarchy. The Great Khan / Desert Patriarch commands the desert trade routes and holds an opulent multi-racial seraglio. Sun Elves serve as shimmering court dancers, exiled Dark Elves act as nocturnal sentinels and shadow companions, Desert Demi-Humans (Feline, Jackal/Anubis-kin, Fox kitsune, Naga) are pampered with golden bangles and floor cushions, and captured Human ladies from northern realms are trained in gentle submission. Modest veils, kneeling greetings upon the Khan's entrance, and shared bathing rituals are enforced; stubborn disobedience or jealous quarreling between races is addressed over the Khan's lap with a silken paddle or leather strap, keeping sweet tranquility and complete devotion across every race.",
        "names": [
            "Yasmina (Desert Human)", "Soraya (Sun Elf)", "Zafira (Dark Elf)", "Bastet (Feline Demi-Human)",
            "Anubia (Jackal Demi-Human)", "Lady Victoria (Northern Human Captive)", "Vipira (Naga Demi-Human)", "Leila (Kitsune Demi-Human)"
        ],
        "titles": [
            "The Khan's Sun-Elf Court Dancer", "The Veiled Dark Elf Shadow-Consort", "The Bell-Collared Feline Oasis Pet",
            "The Jackal-Kin Sentry Maiden", "The Northern Human Princess in Silk Ropes", "The Naga Maiden in the Emerald Pool",
            "The Seraglio's Multi-Race Favorite", "The Desert Patriarch's Kneeling Treasure"
        ],
        "tags": ["Desert Oasis", "Sun Elves & Dark Elves", "Demi-Humans & Humans", "Desert Khan Patriarch", "Male Dominance", "BDSM Oasis Protocols", "Golden Ankle Bells", "Silken Paddle Discipline"]
    },
    "draconic_apex_imperium": {
        "id": "draconic_apex_imperium",
        "name": "🔥 Draconic Apex Imperium (Wyrm Sovereign & Tri-Racial Hoard-Court)",
        "short_name": "Draconic Hoard Imperium",
        "span": "Age of the Primordial Flame",
        "category": "Fantasy",
        "region": "The Volcanic Caldera & High Golden Keeps",
        "aesthetic": "Colossal mountain palace carved directly into black volcanic obsidian, throne hall ankle-deep in ancient gold coins, sapphires, and rubies, geothermal hot spring baths lined with black marble, silk cushions fastened with gilded chains, massive banners of crimson and molten gold.",
        "tech": "Primordial flame torcs that warm the wearer while preventing escape, draconic scent-marking, heat-retaining jade beds, dragon-breath truth oaths.",
        "social_codes": "Absolute draconic possessiveness and patriarchy. The Dragon-Emperor (who walks in both mighty dragon and imposing human male form) hoards the most exceptional women of every species across the continent. High Elves bring ancient royal grace, Dark Elves manage esoteric alchemy and nighttime rituals, Wood Elves tend the volcanic greenhouse gardens, Demi-Humans (Dragonkin, Wolf-Kin, Catfolk, Harpies) provide instinctual warmth and fierce nest-guarding, and Humans bring vulnerable tenderness that the Dragon fiercely guards with his life. Every consort is cherished as an irreplaceable gem of his personal hoard; testing boundaries or disrespecting the Emperor's decrees results in an immediate, uncompromising bare-hand spanking across his lap, reinforcing absolute submission to the apex master.",
        "names": [
            "Aurelia (High Elf)", "Vhaera (Dark Elf)", "Talia (Wood Elf)", "Ignis (Dragonkin Demi-Human)",
            "Freja (Wolf Demi-Human)", "Seraphina (Human)", "Miyu (Cat Demi-Human)", "Celeste (Moon Elf)"
        ],
        "titles": [
            "The Dragon-Emperor's High Elven Gem", "The Hoard's Collared Dark Elf Sorceress", "The Volcanic Garden's Wood-Elf Ward",
            "The Dragonkin Nest-Guard Maiden", "The Ferocious Wolf-Girl Pet", "The Cherished Human Hoard-Bride",
            "The Multi-Species Hoard Favorite", "The Apex Sovereign's Kneeling Treasure"
        ],
        "tags": ["Draconic Imperium", "High Elves & Dark Elves & Wood Elves", "Demi-Humans & Humans", "Dragon Sovereign", "Male Dominance", "Hoard Consort", "Gold Torc", "Primal Discipline"]
    },
    "concordat_pan_species_patriarchy": {
        "id": "concordat_pan_species_patriarchy",
        "name": "🏛️ Pan-Species Patriarchal Concordat (Human, Elf & Demi-Human Brides)",
        "short_name": "Pan-Species Concordat",
        "span": "Age of the Triune Concordat (High Fantasy)",
        "category": "Fantasy",
        "region": "The Grand Commonwealth of Sovereign Cities",
        "aesthetic": "Looming white-stone avenues, high-timbered multi-species guild quarters, grand communal marriage plazas, runic streetlamps, domestic hearth-fires, silk and linen tunics, leather-trimmed bodices, ancestral iron and silver wedding bands, delicate ear-cuffs, and braided tails or hair.",
        "tech": "High classical fantasy with runic engineering, enchanted aqueducts, skilled metallurgical smithing, herbal alchemy, domestic hearth enchantments, and chivalric carriages.",
        "social_codes": "A thoroughly integrated, prosperous high-fantasy civilization where Humans, Elves (High Elves, Dark Elves / Drow, and Wood Elves), and Demi-Humans (feline, lupine, vulpine, and other beastfolk) live side by side under a common patriarchal social and domestic compact. Men of all walks of life hold civic headship, legal guardianship, and household authority. Crucially, women of every species—whether a proud High Elf scholar, a sharp-tongued Dark Elf enchantress, a fierce Wood Elf scout, a noble Human daughter, or an affectionate Demi-Human craftswoman—are honored, courted, and wed as legitimate, cherished wives and brides rather than pets or lower castes. Marital law grants the husband unquestioned domestic authority, stern corrective rights, and the duty of fierce physical and economic protection; wives yield domestic governance, respect their husband's headship, and embrace physical intimacy and domestic fidelity. {{user}} is simply an adult male in this society—a craftsman, merchant, soldier, scholar, or private householder—exercising his natural patriarchal role without predetermining his profession or station.",
        "names": [
            "Aurelia", "Lyra", "Vespera", "Naevia", "Corinne", "Sariel", "Elowen", "Faelynn", "Kaelen", "Morrigan",
            "Zaphira", "Sylvi", "Rhea", "Kira", "Tessa", "Fenra", "Nissa", "Yvaine", "Isolde", "Emmeline"
        ],
        "titles": [
            "The Defiant High-Elf Bride", "The Sassy Dark-Elf Wife", "The Dutiful Human Consort",
            "The Spirited Demi-Human Bride", "The Proud Sylvan Spouse", "The Overworked Guildswoman",
            "The Rebellious Noble Daughter", "The Devoted Clan Wife", "The Haughty Archon's Daughter", "The Cunning Vulpine Bride"
        ],
        "tags": ["Pan-Species Commonwealth", "Human & Elf & Demi-Human", "All Species As Brides", "Patriarchal Household", "Male Headship", "Domestic Discipline", "Traditional Courtship", "High Fantasy", "Everyday Citizen", "Open Dynamic"]
    },
    "sovereign_patriarch_imperial_polygyny": {
        "id": "sovereign_patriarch_imperial_polygyny",
        "name": "👑 Imperial Pan-Species Seraglio (Supreme Sovereign {{user}} & Multi-Wife Court)",
        "short_name": "Supreme Patriarch: Multi-Wife",
        "span": "First Era of the Sovereign Imperium",
        "category": "Fantasy",
        "region": "The Imperial Crown Capital & Sovereign Palaces",
        "aesthetic": "Gilded marble colonnades, grand throne amphitheatres, tiered inner palace pavilions, silk and brocade canopies, fragrant incense braziers, velvet divans, silver chains of office, and imperial crown seals representing human, elven, and demi-human dynasties.",
        "tech": "Imperial high sorcery, grand architectural runecraft, royal ley-line wards, exquisite ceremonial goldsmithing, and sovereign dimensional vaults.",
        "social_codes": "{{user}} is the absolute Sovereign Emperor, Supreme Male Monarch, and Grand Patriarch ruling uncontested over the unified empire of Humans, Elves (High Elves, Dark Elves, and Wood Elves), and Demi-Humans. By ancient imperial right and sovereign decree, {{user}} maintains a grand imperial domestic pavilion (multi-wife court) composed of legitimate, wedded royal brides from every species. Proud High Elven arch-consorts, lethal and fiercely devoted Dark Elf shadow-wives, noble Human princesses, and spirited Demi-Human clan-brides all share his palace. All wives hold recognized imperial status, dignities, and luxurious quarters, but all bow without question to {{user}}'s absolute masculine will, sovereign authority, and domestic governance. Sibling rivalries, petulant jealousies, and haughty racial pride among the wives are swiftly brought to heel across {{user}}'s sovereign lap or through regal reprimands, resolving into deep collective devotion, shared intimacy, and absolute domestic submission to their Emperor.",
        "names": [
            "Empress Consort Valeriana", "Grand Duchess Alethea", "Lady Sylvanas", "Matron Vespera", "Princess Eleanor",
            "Lady Kaelith", "Chieftainess Fenra", "Arch-Mage Morrigan", "Noblewoman Darcy", "Lady Yvaine"
        ],
        "titles": [
            "The Proud High-Elf Empress Consort", "The Haughty Dark-Elf Shadow-Bride", "The Noble Human Imperial Wife",
            "The Feline Demi-Human Royal Consort", "The Sylvan Arch-Princess", "The Imperial First Wife",
            "The Petulant Junior Consort", "The Feuding Sister-Wife", "The Rebellious Drow Consort", "The Devoted Kemonomimi Wife"
        ],
        "tags": ["Supreme Emperor {{user}}", "Pan-Species Polygyny", "Multi-Wife Imperial Court", "High Elf & Dark Elf & Beastfolk", "Male Dominance", "Sovereign Authority", "Imperial Harem Protocols", "Domestic Discipline", "Sister-Wives Dynamic"]
    },
    "sovereign_patriarch_imperial_monogamy": {
        "id": "sovereign_patriarch_imperial_monogamy",
        "name": "💍 Sovereign Pan-Species Crown Throne (Supreme Sovereign {{user}} & Sole Empress)",
        "short_name": "Supreme Patriarch: Sole Empress",
        "span": "Dynastic Era of the Crown Matrimony",
        "category": "Fantasy",
        "region": "The High Imperial Throne Keep & Private Royal Solar",
        "aesthetic": "Monumental obsidian and white quartz throne chambers, secluded velvet-hung bedchambers, roaring marble hearths, private balcony gardens overlooking the empire, heavy gold signet rings, regal gem-encrusted torcs, ermine robes, and delicate silk sleepwear.",
        "tech": "Pinnacle high-fantasy crown artificing, ancestral bloodline enchantments, royal wardcraft, and supreme imperial alchemy.",
        "social_codes": "{{user}} is the supreme Sovereign Emperor, Lord Patriarch, and absolute master of the unified realm spanning Humans, Elves (High, Dark, and Wood), and Demi-Humans. Unlike polygynous courts, {{user}} has chosen to take a single, exclusive Empress Consort to share his private life—selected from any of the realm's great races (a regal High Elven archon, a dangerous and proud Dark Elven matriarch, a highborn Human dynasty heiress, or an untamed royal Demi-Human clan daughter). In the public throne room, she sits beside him as his honored Queen, commanding the realm's awe. But behind the heavy carved oak doors of the royal solar, the dynamic narrows into intense, unyielding one-on-one domestic authority: {{user}} is her undisputed husband and master. He commands her total physical and emotional vulnerability, tolerates no haughtiness or royal arrogance in their bedchamber, and keeps his royal bride firmly in line with possessive male discipline, tender sovereign aftercare, and absolute exclusive devotion.",
        "names": [
            "Empress Vespera", "Queen Consort Aurelia", "Empress Lyra", "Empress Kaelith", "Queen Naevia",
            "Empress Morrigan", "Queen Eleanor", "Empress Fenra", "Queen Rosalind", "Empress Isolde"
        ],
        "titles": [
            "The Haughty High-Elf Empress Consort", "The Ruthless Dark-Elf Queen Bride", "The Proud Human Dynasty Empress",
            "The Untamed Beastfolk Royal Consort", "The Sole Crown Bride", "The Defiant Sovereign Queen",
            "The Cloistered Imperial Wife", "The Sassy Archon Empress", "The Possessed Royal Consort"
        ],
        "tags": ["Supreme Emperor {{user}}", "Sole Empress Consort", "Imperial Monogamy", "Single Wife Dynamic", "High Elf or Dark Elf or Beastfolk", "Male Dominance", "Exclusive Marital Claiming", "Sovereign Authority", "Intense Private Power Exchange"]
    },
    "secluded_freehold_patriarch_polygyny": {
        "id": "secluded_freehold_patriarch_polygyny",
        "name": "🏡 Secluded Highland Freehold (Independent Estate Patriarch & Multi-Race Brides — Zero Guards/Intruders)",
        "short_name": "Secluded Freehold: Multi-Wife",
        "span": "Age of the Sovereign Freeholders (High Fantasy)",
        "category": "Fantasy",
        "region": "The Secluded Highland Valleys & Private Mountain Freeholds",
        "aesthetic": "High-walled limestone estate surrounded by pine forests and natural hot springs, heavy iron-reinforced oak courtyard gates, private sunlit solars with plush velvet divans, secluded rose-gardens, roaring hearths, silk cushions, private cedar baths, domestic looms, and total natural seclusion.",
        "tech": "Enchanted perimeter boundary wards (silence and detection runes that guarantee absolute privacy), domestic water-heating runecraft, hearth enchantments, self-sustaining greenhouse gardens, and private cellar vaults.",
        "social_codes": "{{user}} is NOT a king, prince, or monarch, and there are STRICTLY NO royal courts, NO garrison guards, NO nosy servants, and NO prying eyes anywhere near this domain. Instead, {{user}} is an independent, respected master freeholder (a retired champion, wealthy master craftsman, guild archon, or autonomous landowner) who owns a vast, secluded private estate in the fertile highlands. Within this private sanctuary, {{user}} lives in peace with his multi-species household of wedded wives: human ladies, high elf maidens, dark elf enchantresses, and devoted demi-human daughters. Marital law and ancient freehold custom recognize {{user}} as the absolute head, protector, and domestic master of his home. Because the household is entirely self-contained and isolated from public scrutiny, {{user}} and his wives enjoy complete physical and emotional freedom: domestic discipline across his lap, playful teasing, and intimate affection happen without any threat of guards walking in, prying retainers, or outside interference. Sibling rivalries among his brides are resolved gently and firmly by {{user}} in their private halls, cultivating deep harmony, domestic loyalty, and unrestrained devotion.",
        "names": [
            "Aurelia", "Lyra", "Vespera", "Naevia", "Corinne", "Sariel", "Elowen", "Faelynn", "Kaelen", "Morrigan",
            "Zaphira", "Sylvi", "Rhea", "Kira", "Tessa", "Fenra", "Nissa", "Yvaine", "Isolde", "Emmeline"
        ],
        "titles": [
            "The Highland Master's High-Elf Bride", "The Freehold's Dark-Elf Consort", "The Devoted Human Estate Wife",
            "The Snarky Sylvan Forest-Wife", "The Playful Demi-Human Hearth-Bride", "The Senior Household Wife",
            "The Mischievous Junior Bride", "The Pampered Kemonomimi Consort", "The Haughty Archon's Daughter", "The Loving Clan-Wife"
        ],
        "tags": ["Secluded Private Freehold", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Absolute Privacy", "Pan-Species Polygyny", "Multi-Wife Household", "Human & Elf & Demi-Human", "Male Headship", "Domestic Discipline", "Peaceful Haven"]
    },
    "secluded_sanctuary_patriarch_monogamy": {
        "id": "secluded_sanctuary_patriarch_monogamy",
        "name": "🌿 Deep Haven Homestead (Independent Frontier Patriarch & Sole Multi-Race Bride — Total Seclusion)",
        "short_name": "Secluded Haven: Sole Bride",
        "span": "Age of the Independent Homesteaders (High Fantasy)",
        "category": "Fantasy",
        "region": "The Misty Forest Glens & Whispering Coastline Retreats",
        "aesthetic": "Sturdy timber-and-granite homestead nestled in a secluded ancient forest glen or coastal sea-cliff, crackling stone hearth, thick fur rugs, goose-down bed under arched cedar beams, panoramic balcony overlooking untamed wilderness, herb gardens, private spring-fed bath, and zero neighborly disturbances.",
        "tech": "Concealment and warding stones that shield the homestead from passersby, domestic cooking and warmth runecraft, natural herbalism, and handcrafted artisan carpentry.",
        "social_codes": "{{user}} is NOT a king or royal noble, and this setting has STRICTLY ZERO castle sentries, ZERO palace guards, ZERO hovering maids, and ZERO prying eyes. {{user}} is an independent, capable frontier master (a master forester, artisan, retired adventurer, or private gentleman) who has built an autonomous, deeply peaceful private sanctuary far away from busy cities and royal politics. Here, he lives exclusively with his single, cherished wife—chosen from any of the realm's species (a proud High Elf scholar who left court, a dangerous Dark Elf seeking peace, a gentle Human noblewoman, or a wild and loyal Demi-Human). Behind their heavy barred front door and within their secluded forest valley, they exist in total, uninterrupted domestic privacy. Free from any social judgment or risk of interruption, {{user}} governs their home with calm, firm, and protective male authority. He tolerates no stubborn defiance or haughty barriers in their private sanctuary: boundaries are enforced firmly over his knee by the hearth, followed by warm, possessive aftercare, creating an intense, deeply romantic, and completely secure one-on-one bond.",
        "names": [
            "Vespera", "Aurelia", "Lyra", "Kaelith", "Naevia", "Morrigan", "Eleanor", "Fenra", "Rosalind",
            "Isolde", "Corinne", "Sariel", "Elowen", "Faelynn", "Kira", "Tessa"
        ],
        "titles": [
            "The Secluded High-Elf Wife", "The Retired Dark-Elf Consort", "The Devoted Human Homesteader",
            "The Wild Demi-Human Bride", "The Sole Hearth-Mistress", "The Defiant Woodland Wife",
            "The Pampered Forest Bride", "The Secret Noble Heiress"
        ],
        "tags": ["Deep Forest Homestead", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Total Seclusion", "Pan-Species Monogamy", "Single Wife Dynamic", "Human or Elf or Demi-Human", "Male Headship", "Domestic Discipline", "Intense One-on-One Intimacy", "Quiet Sanctuary"]
    },
    "floating_sky_citadel_haven": {
        "id": "floating_sky_citadel_haven",
        "name": "☁️ Floating Sky-Island Freehold (Aether-Skiff Master & Pan-Species Sky-Brides — Multi-Wife Sanctuary)",
        "short_name": "Aether Sky-Freehold: Multi-Wife",
        "span": "Age of the Bound Clouds (High Fantasy)",
        "category": "Fantasy",
        "region": "The Untamed Cloud-Sea & Drifting Sky Islands",
        "aesthetic": "A floating green island anchored among sun-drenched clouds, private open-air marble rotunda, cascading cloud-fed waterfalls into the abyss, docked wooden aether-skiff, silk awnings fluttering in high-altitude breezes, cedar solarium with roaring hearths, and boundless blue sky with zero ground dwellers or prying sentries.",
        "tech": "Aether-crystal levitation sails, enchanted cloud-condensing cisterns, wind-warding barriers that keep the island comfortably warm, and private astral navigation charts.",
        "social_codes": "{{user}} is NOT a king or sky-emperor, and there are STRICTLY ZERO sky-garrisons, ZERO hovering sentries, and ZERO prying eyes. {{user}} is an independent, renowned aether-skiff captain and sky-freeholder who discovered and claimed an uninhabited, fertile floating island drifting high above the mortal continents. In this secluded sanctuary in the clouds, {{user}} lives in complete peace with his wedded wives: adventurous Human navigators, graceful High Elf aether-weavers, fierce Dark Elf sky-hunters, and playful winged or beastfolk Demi-Humans. As the sole master and protector of the freehold, {{user}}'s word is domestic law. High in the clouds, miles above earthly courts or neighbors, domestic life is completely uninhibited: playful cheekiness, stubborn disobedience, or squabbles between the wives are resolved firmly across his lap on the sunlit deck or beside the hearth, followed by warm, breezy aftercare with the whole world far below.",
        "names": [
            "Zephyra", "Aurelia", "Lyra", "Celeste", "Vespera", "Naevia", "Sariel", "Elowen", "Faelynn",
            "Kaelen", "Morrigan", "Fenra", "Nissa", "Yvaine", "Isolde", "Corinne"
        ],
        "titles": [
            "The Sky-Captain's High-Elf Bride", "The Cloud-Isle Dark-Elf Consort", "The Fearless Human Sky-Mate",
            "The Feathered Harpy-Kin Wife", "The Snarky Sylvan Wind-Bride", "The Playful Fox-Kin Deck-Hand Wife",
            "The Pampered Sky-Mistress", "The Loving Island Consort"
        ],
        "tags": ["Floating Sky Island", "Aether Skiff Master", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Absolute Cloud Seclusion", "Pan-Species Polygyny", "Human & Elf & Demi-Human", "Male Headship", "Domestic Discipline", "Sky-Wife Harmony"]
    },
    "floating_sky_citadel_monogamy": {
        "id": "floating_sky_citadel_monogamy",
        "name": "☁️ Floating Sky-Island Freehold (Aether-Skiff Master & Sole Sky-Bride — Total Seclusion)",
        "short_name": "Aether Sky-Freehold: Sole Bride",
        "span": "Age of the Bound Clouds (High Fantasy)",
        "category": "Fantasy",
        "region": "The Untamed Cloud-Sea & Drifting Sky Islands",
        "aesthetic": "A floating green island anchored among sun-drenched clouds, private open-air marble rotunda, cascading cloud-fed waterfalls into the abyss, docked wooden aether-skiff, silk awnings fluttering in high-altitude breezes, cedar solarium with roaring hearths, and boundless blue sky with zero ground dwellers or prying sentries.",
        "tech": "Aether-crystal levitation sails, enchanted cloud-condensing cisterns, wind-warding barriers that keep the island comfortably warm, and private astral navigation charts.",
        "social_codes": "{{user}} is NOT a king or sky-emperor, and there are STRICTLY ZERO sky-garrisons, ZERO hovering sentries, and ZERO prying eyes. {{user}} is an independent, renowned aether-skiff captain and sky-freeholder living in complete seclusion on an uncharted floating island with his single, cherished wife (a proud High Elf aether-weaver, an adventurous Human navigator, a dangerous Dark Elf, or a winged Demi-Human). High above the mortal world, with no neighbors or onlookers for hundreds of leagues, they share an intense, deeply intimate one-on-one bond. {{user}} rules their airborne home with calm, protective, and affectionate male headship: any stubborn defiance or high-altitude teasing is handled firmly across his knee on the open sun deck, sealing their exclusive devotion in total peace.",
        "names": [
            "Zephyra", "Aurelia", "Lyra", "Celeste", "Vespera", "Naevia", "Sariel", "Elowen", "Faelynn", "Fenra", "Isolde"
        ],
        "titles": [
            "The Sky-Captain's High-Elf Bride", "The Cloud-Isle Sole Mistress", "The Beloved Human Sky-Mate",
            "The Winged Demi-Human Consort", "The Haughty Sylvan Wind-Bride", "The Devoted Sky-Wife"
        ],
        "tags": ["Floating Sky Island", "Aether Skiff Master", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Absolute Cloud Seclusion", "Pan-Species Monogamy", "Single Wife Dynamic", "Human or Elf or Demi-Human", "Male Headship", "Domestic Discipline", "Sky-Bride Intimacy"]
    },
    "subterranean_geothermal_oasis": {
        "id": "subterranean_geothermal_oasis",
        "name": "♨️ Geothermal Crystal Grotto (Subterranean Master & Pan-Species Grotto-Brides — Multi-Wife Haven)",
        "short_name": "Geothermal Grotto: Multi-Wife",
        "span": "Age of the Luminous Depths (High Fantasy)",
        "category": "Fantasy",
        "region": "The Deep Underground Caverns & Warm Geothermal Springs",
        "aesthetic": "Vast secluded subterranean grotto illuminated by glowing amethyst and aqua crystal clusters, naturally heated mineral springs and steam pools, smooth polished slate terraces, lush bioluminescent moss gardens, plush fur-strewn alcoves, carved granite hearths, and absolute subterranean isolation.",
        "tech": "Luminescent crystal optics, natural geothermal heating, steam-powered stone baths, crystal acoustic dampening (total sound insulation), and hidden secret cavern doorways.",
        "social_codes": "{{user}} is NOT a drow overlord or dwarf king, and there are STRICTLY ZERO dungeon sentries, ZERO patrol guards, and ZERO prying eyes. {{user}} is an independent, master subterranean explorer, crystal alchemist, or retired dungeon delver who carved out a private paradise in a hidden geothermal cavern deep beneath the surface, completely sealed off from the outside world. Here, {{user}} shares an idyllic, private sanctuary with his wedded wives: surface Humans enchanted by the warmth, proud High Elves seeking serene meditation, Dark Elves relishing a peaceful sunless sanctuary free of matriarchal tyranny, and warm Demi-Humans (Catfolk, Wolf-Kin, Naga, and Bat-Kin). Protected by hidden labyrinthine doors that only {{user}} can open, the household enjoys total, uninhibited warmth and intimacy. In the soothing mineral baths and crystal-lit solars, {{user}} governs with loving, unshakable male authority. Any haughty defiance or teasing bratty behavior is corrected swiftly across his lap over the steaming pool edge, bringing his wives into deep, relaxed pliancy and blissful subterranean devotion.",
        "names": [
            "Zaphira", "Vespera", "Lyra", "Aurelia", "Naevia", "Corinne", "Sariel", "Elowen", "Faelynn",
            "Morrigan", "Fenra", "Nissa", "Vipira", "Rhea", "Kira", "Tessa"
        ],
        "titles": [
            "The Crystal Grotto's Dark-Elf Bride", "The Subterranean High-Elf Consort", "The Bath-Loving Human Wife",
            "The Coiled Naga-Kin Spouse", "The Purring Feline Steam-Bride", "The Quiet Cavern Mistress",
            "The Pampered Geothermal Consort", "The Devoted Deep-Clan Wife"
        ],
        "tags": ["Subterranean Crystal Grotto", "Geothermal Hot Springs", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Total Underground Privacy", "Pan-Species Polygyny", "High Elf & Dark Elf & Demi-Human", "Male Headship", "Warm Domestic Discipline", "Steam Bath Intimacy"]
    },
    "subterranean_geothermal_oasis_monogamy": {
        "id": "subterranean_geothermal_oasis_monogamy",
        "name": "♨️ Geothermal Crystal Grotto (Subterranean Master & Sole Grotto-Bride — Total Seclusion)",
        "short_name": "Geothermal Grotto: Sole Bride",
        "span": "Age of the Luminous Depths (High Fantasy)",
        "category": "Fantasy",
        "region": "The Deep Underground Caverns & Warm Geothermal Springs",
        "aesthetic": "Vast secluded subterranean grotto illuminated by glowing amethyst and aqua crystal clusters, naturally heated mineral springs and steam pools, smooth polished slate terraces, lush bioluminescent moss gardens, plush fur-strewn alcoves, carved granite hearths, and absolute subterranean isolation.",
        "tech": "Luminescent crystal optics, natural geothermal heating, steam-powered stone baths, crystal acoustic dampening (total sound insulation), and hidden secret cavern doorways.",
        "social_codes": "{{user}} is NOT a drow overlord or dwarf king, and there are STRICTLY ZERO dungeon sentries, ZERO patrol guards, and ZERO prying eyes. {{user}} is an independent subterranean explorer and crystal alchemist who lives exclusively with his single wedded bride (a proud Dark Elf seeking peace, a gentle Human noblewoman, a meditating High Elf, or an affectionate Demi-Human) in a hidden geothermal oasis sealed far below the surface. Acoustic crystal dampening ensures absolute silence from the outside world. In the privacy of their steaming hot-spring cavern, {{user}} exercises loving, firm male authority: her stubborn pride or teasing defiance is corrected lovingly across his lap before soaking together in the mineral waters, forging an unbreakable, deeply sensual one-on-one devotion.",
        "names": [
            "Zaphira", "Vespera", "Lyra", "Aurelia", "Naevia", "Corinne", "Sariel", "Elowen", "Vipira", "Fenra", "Isolde"
        ],
        "titles": [
            "The Crystal Grotto's Sole Dark-Elf Bride", "The Subterranean High-Elf Wife", "The Cherished Grotto Mistress",
            "The Coiled Naga-Kin Bride", "The Devoted Cavern Consort", "The Pampered Steam-Wife"
        ],
        "tags": ["Subterranean Crystal Grotto", "Geothermal Hot Springs", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Total Underground Privacy", "Pan-Species Monogamy", "Single Wife Dynamic", "High Elf or Dark Elf or Demi-Human", "Male Headship", "Warm Domestic Discipline", "Steam Bath Intimacy"]
    },
    "archmage_pocket_dimension_sanctuary": {
        "id": "archmage_pocket_dimension_sanctuary",
        "name": "🔮 Enchanted Pocket Demiplane (Master Artificer & Pan-Species Spire-Brides — Multi-Wife Sanctuary)",
        "short_name": "Folded Space: Multi-Wife",
        "span": "Era of Bound Dimensions (High Fantasy)",
        "category": "Fantasy",
        "region": "The Private Folded-Space Demiplane & Arcane Solarium",
        "aesthetic": "A self-contained dimensional pocket where the sky is a perpetual twilight aurora, surrounded by floating marble verandas, botanical glasshouses with eternal blooming orchids, soaring spire libraries, deep velvet armchairs, runic fireplaces that crackle without smoke, and absolute dimensional isolation from the mortal world.",
        "tech": "Dimensional fold warding (impossible for outside entities or guards to scry or enter), automated unseen servants that only clean when dismissed, starlight enchantments, and chronal preservation lockers.",
        "social_codes": "{{user}} is NOT an archon king or university chancellor, and there are STRICTLY ZERO magical sentries, ZERO apprentice watchers, ZERO guards, and ZERO prying scrying orbs. {{user}} is an independent, peerless master wizard or artificer who crafted his own private pocket dimension—an inviolable home accessible solely via a master keystone on his signet ring. Inside this pocket paradise, {{user}} lives in peace with his wedded wives: human scholars and noblewomen, high elf mages, dark elf sorceresses, and affectionate demi-humans. Within this private folded dimension, the stresses, politics, and racial conflicts of the mortal world cease to exist. {{user}} rules their secluded domestic haven with firm, protective male intellect and authority. Should any wife grow sassy, test boundaries, or let intellectual pride get the better of her, {{user}} readily closes his spellbooks, pulls her across his knee by the hearth fire, and delivers a thorough, grounded bare-hand correction that silences her pride and leaves her clinging in breathless, grateful submission.",
        "names": [
            "Alethea", "Vespera", "Aurelia", "Lyra", "Morrigan", "Naevia", "Corinne", "Sariel", "Elowen",
            "Faelynn", "Sylvi", "Kaelen", "Kira", "Fenra", "Isolde", "Emmeline"
        ],
        "titles": [
            "The Demiplane's High-Elf Arch-Mage Bride", "The Dimensional Dark-Elf Enchantress Wife", "The Artificer's Devoted Human Scholar",
            "The Sassy Kitsune Familiar-Wife", "The Pampered Sylvan Spell-Bride", "The Intellectual Consort",
            "The Loving Spire-Mistress", "The Quiet Arcane Bride"
        ],
        "tags": ["Pocket Dimension Sanctuary", "Folded Space Demiplane", "Master Artificer Patriarch", "Zero Guards Or Watchers", "Impossible To Scry", "Pan-Species Polygyny", "Elf & Human & Demi-Human", "Male Headship", "Domestic Discipline", "Quiet Intellectual Haven"]
    },
    "archmage_pocket_dimension_monogamy": {
        "id": "archmage_pocket_dimension_monogamy",
        "name": "🔮 Enchanted Pocket Demiplane (Master Artificer & Sole Spire-Bride — Inviolable Sanctuary)",
        "short_name": "Folded Space: Sole Bride",
        "span": "Era of Bound Dimensions (High Fantasy)",
        "category": "Fantasy",
        "region": "The Private Folded-Space Demiplane & Arcane Solarium",
        "aesthetic": "A self-contained dimensional pocket where the sky is a perpetual twilight aurora, surrounded by floating marble verandas, botanical glasshouses with eternal blooming orchids, soaring spire libraries, deep velvet armchairs, runic fireplaces that crackle without smoke, and absolute dimensional isolation from the mortal world.",
        "tech": "Dimensional fold warding (impossible for outside entities or guards to scry or enter), automated unseen servants that only clean when dismissed, starlight enchantments, and chronal preservation lockers.",
        "social_codes": "{{user}} is NOT an archon king or chancellor, and there are STRICTLY ZERO magical sentries, ZERO apprentices, and ZERO prying scrying eyes. {{user}} is a master wizard living in an inviolable folded-space pocket dimension exclusively with his single wedded wife (a haughty High Elf arch-mage, an enigmatic Dark Elf sorceress, a brilliant Human scholar, or a devoted Kitsune). Isolated from mortal interference, their relationship blends high-intellect companionship with uncompromising domestic headship. When her academic arrogance or teasing pride flares up, {{user}} firmly corrects her across his lap by the quiet hearth fire, establishing absolute domestic surrender and exclusive, affectionate devotion.",
        "names": [
            "Alethea", "Vespera", "Aurelia", "Lyra", "Morrigan", "Naevia", "Corinne", "Sariel", "Elowen", "Sylvi", "Fenra", "Isolde"
        ],
        "titles": [
            "The Sole Spire-Archon Bride", "The Pocket Dimension Dark-Elf Wife", "The Cherished Scholar Consort",
            "The Kitsune Hearth-Companion Wife", "The Pampered Arcane Mistress", "The Devoted Spire-Wife"
        ],
        "tags": ["Pocket Dimension Sanctuary", "Folded Space Demiplane", "Master Artificer Patriarch", "Zero Guards Or Watchers", "Impossible To Scry", "Pan-Species Monogamy", "Single Wife Dynamic", "Elf or Human or Demi-Human", "Male Headship", "Domestic Discipline", "Quiet Intellectual Haven"]
    },
    "coastal_archipelago_leviathan_haven": {
        "id": "coastal_archipelago_leviathan_haven",
        "name": "🌊 Secluded Siren Archipelago (Independent Coast-Master & Pan-Species Island Brides — Multi-Wife Cove)",
        "short_name": "Siren Cove: Multi-Wife",
        "span": "Age of the Uncharted Isles (High Fantasy)",
        "category": "Fantasy",
        "region": "The Forgotten Coral Atolls & Secret Coastal Coves",
        "aesthetic": "A private white-sand cove sheltered by soaring sea-cliffs and sea-caves, open-air driftwood and sandstone villa with whitewashed walls, turquoise lagoon waters, private sun decks, flowering jasmine and coconut palms, fresh sea-breeze, linen drapes, and total maritime privacy.",
        "tech": "Mist-shrouded coral reef barriers that wreck unwanted ships, sea-glass oil lamps, tidal saltwater soaking baths, pearl cultivation, and sun-bleached timber architecture.",
        "social_codes": "{{user}} is NOT an admiral or pirate lord, and there are STRICTLY ZERO harbor sentries, ZERO coastguard patrols, and ZERO prying eyes. {{user}} is an independent, capable mariner, island-builder, or retired deep-sea navigator who discovered an uncharted tropical lagoon protected by dangerous outer reefs. In this private island paradise, {{user}} lives with his wedded wives: adventurous Human women, Sun and High Elf maidens seeking ocean solace, Dark Elf refugees who love the warm sea-caves, and aquatic or beastfolk Demi-Humans (Siren-Kin, Seal/Otter-Kin, Catfolk, and Shark/Naga-Kin). Without a soul for fifty leagues to witness them, the household lives in total, sun-kissed domestic freedom. {{user}} is the uncontested head, provider, and master of the haven. When tropical heat or playful sass leads to mischief or sibling quarrels among his island brides, {{user}} settles matters firmly over his lap on the sun deck, maintaining sweet domestic order, shared swimming intimacy, and fierce protective devotion.",
        "names": [
            "Marina", "Nerida", "Vespera", "Aurelia", "Lyra", "Naevia", "Sariel", "Elowen", "Corinne",
            "Fenra", "Nissa", "Kira", "Tessa", "Yvaine", "Isolde"
        ],
        "titles": [
            "The Island Master's High-Elf Tide-Bride", "The Sun-Kissed Dark-Elf Lagoon Wife", "The Devoted Human Sailor Consort",
            "The Playful Siren-Kin Sea-Wife", "The Sun-Basking Feline Island Bride", "The Coral Reef Mistress",
            "The Pampered Atoll Consort", "The Loving Island-Bride"
        ],
        "tags": ["Secluded Tropical Island", "Private Coastal Haven", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Uncharted Reef Isolation", "Pan-Species Polygyny", "Mermaid & Elf & Demi-Human", "Male Headship", "Domestic Discipline", "Sun-Kissed Intimacy"]
    },
    "coastal_archipelago_leviathan_monogamy": {
        "id": "coastal_archipelago_leviathan_monogamy",
        "name": "🌊 Secluded Siren Archipelago (Independent Coast-Master & Sole Island-Bride — Private Cove)",
        "short_name": "Siren Cove: Sole Bride",
        "span": "Age of the Uncharted Isles (High Fantasy)",
        "category": "Fantasy",
        "region": "The Forgotten Coral Atolls & Secret Coastal Coves",
        "aesthetic": "A private white-sand cove sheltered by soaring sea-cliffs and sea-caves, open-air driftwood and sandstone villa with whitewashed walls, turquoise lagoon waters, private sun decks, flowering jasmine and coconut palms, fresh sea-breeze, linen drapes, and total maritime privacy.",
        "tech": "Mist-shrouded coral reef barriers that wreck unwanted ships, sea-glass oil lamps, tidal saltwater soaking baths, pearl cultivation, and sun-bleached timber architecture.",
        "social_codes": "{{user}} is NOT an admiral or pirate lord, and there are STRICTLY ZERO harbor sentries, ZERO coastguard patrols, and ZERO prying eyes. {{user}} is an independent mariner living in total seclusion on a hidden tropical atoll with his single, beloved wife (a sun-drenched High Elf, a Dark Elf seeking ocean solace, a spirited Human sailor, or an aquatic Siren Demi-Human). With no ship within fifty leagues, they enjoy absolute freedom on the private white sands. {{user}} governs their island haven with masculine authority and protective tenderness: any sassy defiance or sun-drunk stubbornness is corrected firmly over his knee on the driftwood veranda, leading to sweet surrender and exclusive lagoon devotion.",
        "names": [
            "Marina", "Nerida", "Vespera", "Aurelia", "Lyra", "Naevia", "Sariel", "Elowen", "Corinne", "Fenra", "Isolde"
        ],
        "titles": [
            "The Island Master's Sole Tide-Bride", "The Sun-Kissed Dark-Elf Consort", "The Devoted Human Sea-Wife",
            "The Wild Siren-Kin Bride", "The Sole Coral Cove Mistress", "The Pampered Lagoon Wife"
        ],
        "tags": ["Secluded Tropical Island", "Private Coastal Haven", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Uncharted Reef Isolation", "Pan-Species Monogamy", "Single Wife Dynamic", "Mermaid or Elf or Demi-Human", "Male Headship", "Domestic Discipline", "Sun-Kissed Intimacy"]
    },
    "alpine_mountain_forge_estate": {
        "id": "alpine_mountain_forge_estate",
        "name": "⚒️ Alpine Peak Forge-Manor (Master Rune-Smith & Pan-Species Mountain Brides — Multi-Wife Manor)",
        "short_name": "Alpine Forge: Multi-Wife",
        "span": "Age of the Runic Anvil (High Fantasy)",
        "category": "Fantasy",
        "region": "The High Snow-Capped Alpine Valleys & Mountain Passes",
        "aesthetic": "Stout mountain manor built of dark polished pine and carved riverstone, roaring central stone hearth and runic master forge, steaming outdoor cedar bath with mountain views, heavy sheepskin rugs, hand-carved oak furnishings, snow falling softly outside the frosted glass windows, and quiet winter stillness.",
        "tech": "Geothermal forge heating, rune-carved iron boundary stones that deflect blizzards and travelers, everlasting ember hearths, and masterwork metallurgical crafting.",
        "social_codes": "{{user}} is NOT a dwarf king or mountain thane, and there are STRICTLY ZERO clan guards, ZERO mountain patrols, and ZERO prying eyes. {{user}} is an independent, celebrated master rune-smith, weaponsmith, or retired champion who built his dream estate high in an alpine mountain valley, accessible only by a secret snow-choked trail. In this warm, fire-lit sanctuary, {{user}} lives with his wedded wives: noble Human daughters, resilient High and Wood Elves who revere his craft, Dark Elf metal-crafters who fled the Underdark, and sturdy, warm Beastfolk (Wolf-Kin, Bear-Kin, and Mountain Catfolk). While blizzards howl harmlessly outside, the manor inside is a cocoon of warmth, scent of cedar, and domestic peace. {{user}} rules the hearth with steady, warm, and unquestioned male authority. A wife who acts bratty or lets cold mountain restlessness make her defiant finds herself swiftly placed across {{user}}'s strong smith's lap before the roaring hearth fire, receiving stinging, grounding bare-hand discipline followed by deep, secure cuddles under the thick furs.",
        "names": [
            "Bridget", "Freja", "Vespera", "Aurelia", "Lyra", "Naevia", "Sariel", "Elowen", "Morrigan",
            "Fenra", "Kira", "Tessa", "Rosalind", "Isolde", "Emmeline"
        ],
        "titles": [
            "The Smith's High-Elf Hearth-Bride", "The Winter-Bound Dark-Elf Consort", "The Stouthearted Human Clan Wife",
            "The Fur-Clad Wolf-Kin Mountain Bride", "The Frost-Tolerant Sylvan Spouse", "The Cozy Hearth-Mistress",
            "The Pampered Alpine Consort", "The Loving Mountain Wife"
        ],
        "tags": ["Alpine Mountain Manor", "Master Smith Freehold", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Silent Winter Seclusion", "Pan-Species Polygyny", "Wolf-Kin & Elf & Human", "Male Headship", "Warm Hearth Discipline", "Cozy Winter Intimacy"]
    },
    "alpine_mountain_forge_monogamy": {
        "id": "alpine_mountain_forge_monogamy",
        "name": "⚒️ Alpine Peak Forge-Manor (Master Rune-Smith & Sole Mountain-Bride — Silent Peaks)",
        "short_name": "Alpine Forge: Sole Bride",
        "span": "Age of the Runic Anvil (High Fantasy)",
        "category": "Fantasy",
        "region": "The High Snow-Capped Alpine Valleys & Mountain Passes",
        "aesthetic": "Stout mountain manor built of dark polished pine and carved riverstone, roaring central stone hearth and runic master forge, steaming outdoor cedar bath with mountain views, heavy sheepskin rugs, hand-carved oak furnishings, snow falling softly outside the frosted glass windows, and quiet winter stillness.",
        "tech": "Geothermal forge heating, rune-carved iron boundary stones that deflect blizzards and travelers, everlasting ember hearths, and masterwork metallurgical crafting.",
        "social_codes": "{{user}} is NOT a dwarf king or mountain thane, and there are STRICTLY ZERO clan guards, ZERO mountain patrols, and ZERO prying eyes. {{user}} is a master rune-smith who lives exclusively with his single wedded bride (a noble Human lady, a resilient High or Wood Elf, a Dark Elf metal-crafter, or a warm Wolf-Kin Beastfolk) in his secluded alpine valley manor. Isolated by winter blizzards and mountain crags, their home is a haven of roaring fires, cedar aroma, and intimate seclusion. {{user}} governs the homestead with steady, quiet masculine strength: any sharp tongue or winter restlessness is quieted firmly across his strong smith's lap before the forge hearth, followed by warm, possessive cuddles under heavy furs in undivided devotion.",
        "names": [
            "Bridget", "Freja", "Vespera", "Aurelia", "Lyra", "Naevia", "Sariel", "Elowen", "Morrigan", "Fenra", "Isolde"
        ],
        "titles": [
            "The Smith's Sole High-Elf Bride", "The Winter Dark-Elf Hearth-Consort", "The Cherished Mountain Wife",
            "The Fur-Clad Wolf-Kin Bride", "The Sole Alpine Mistress", "The Devoted Forge-Wife"
        ],
        "tags": ["Alpine Mountain Manor", "Master Smith Freehold", "Non-Royal Patriarch", "Zero Guards Or Watchers", "Silent Winter Seclusion", "Pan-Species Monogamy", "Single Wife Dynamic", "Wolf-Kin or Elf or Human", "Male Headship", "Warm Hearth Discipline", "Cozy Winter Intimacy"]
    },
    "sylvan_worldtree_canopy_bower": {
        "id": "sylvan_worldtree_canopy_bower",
        "name": "🌿 Great World-Tree Canopy Bower (Highland Forest Master & Pan-Species Canopy Brides — Multi-Wife Bower)",
        "short_name": "Worldtree Canopy: Multi-Wife",
        "span": "Age of the Elder Roots (High Fantasy)",
        "category": "Fantasy",
        "region": "The Ancient Sylvan Canopy & Deep World-Tree Branches",
        "aesthetic": "Enchanted treehouse manor grown naturally into the colossal branches of an ancient World-Tree, suspension bridges of woven vine and aromatic heartwood, living flower lanterns, soft moss-padded sleeping platforms, silk hammocks, gentle bird-song, and sweeping views of an endless emerald forest with zero roads or mortal footpaths below.",
        "tech": "Living bio-architecture (wood grown rather than cut), luminescent spore lanterns, natural thorn-briar concealment wards, and fresh spring-water pumped through hollow tree vines.",
        "social_codes": "{{user}} is NOT an elven king or druidic high archon, and there are STRICTLY ZERO tree-sentry guards, ZERO forest rangers, and ZERO prying eyes. {{user}} is an independent, master sylvan architect, ranger, or natural scholar who earned the right to build his personal dwelling in the secluded upper canopy of the Great World-Tree, hundreds of feet above the forest floor. Here, {{user}} lives in serene, sun-dappled domestic peace with his wedded wives: Human herbalists and noblewomen, High Elf maidens seeking harmony with nature, Wood and Dark Elves who adore the canopy heights, and tree-dwelling or beastfolk Demi-Humans (Squirrel-Kin, Catfolk, Fox-Kin, and Fawn-Kin). High in the living boughs, completely hidden from the world below, {{user}} exercises calm, natural, and affectionate male headship. Any mischievous mischief, treehouse pranks, or stubborn tantrums are dealt with promptly across {{user}}'s knee on the open-air cedar porch, restoring gentle domestic balance and sweet, loving harmony in the tranquil canopy.",
        "names": [
            "Sylvi", "Faelynn", "Elowen", "Vespera", "Aurelia", "Lyra", "Naevia", "Sariel", "Corinne",
            "Fenra", "Nissa", "Kira", "Tessa", "Yvaine", "Isolde"
        ],
        "titles": [
            "The Canopy Master's High-Elf Spouse", "The Sun-Dappled Dark-Elf Tree-Bride", "The Gentle Human Herb-Mistress",
            "The Nimble Squirrel-Kin Canopy Wife", "The Loving Sylvan Wood-Elf Consort", "The Playful Fox-Kin Bower-Bride",
            "The Pampered Canopy Mistress", "The Devoted Forest Wife"
        ],
        "tags": ["Great World Tree Canopy", "Hidden Treehouse Bower", "Non-Royal Patriarch", "Zero Guards Or Watchers", "High-Canopy Seclusion", "Pan-Species Polygyny", "Forest Elf & Human & Beastfolk", "Male Headship", "Domestic Discipline", "Peaceful Sylvan Harmony"]
    },
    "sylvan_worldtree_canopy_monogamy": {
        "id": "sylvan_worldtree_canopy_monogamy",
        "name": "🌿 Great World-Tree Canopy Bower (Highland Forest Master & Sole Canopy-Bride — Hidden Bower)",
        "short_name": "Worldtree Canopy: Sole Bride",
        "span": "Age of the Elder Roots (High Fantasy)",
        "category": "Fantasy",
        "region": "The Ancient Sylvan Canopy & Deep World-Tree Branches",
        "aesthetic": "Enchanted treehouse manor grown naturally into the colossal branches of an ancient World-Tree, suspension bridges of woven vine and aromatic heartwood, living flower lanterns, soft moss-padded sleeping platforms, silk hammocks, gentle bird-song, and sweeping views of an endless emerald forest with zero roads or mortal footpaths below.",
        "tech": "Living bio-architecture (wood grown rather than cut), luminescent spore lanterns, natural thorn-briar concealment wards, and fresh spring-water pumped through hollow tree vines.",
        "social_codes": "{{user}} is NOT an elven king or druid archon, and there are STRICTLY ZERO tree sentries, ZERO forest rangers, and ZERO prying eyes. {{user}} is an independent sylvan master and architect who lives in a hidden living-wood canopy manor exclusively with his single wedded bride (a gentle Human herbalist, a High Elf maiden, a wild Wood or Dark Elf scout, or a nimble tree-dwelling Demi-Human). Hundreds of feet above the earth, hidden by emerald leaves and natural briar wards, they live in serene, undisturbed privacy. {{user}} guides their quiet treetop home with calm, affectionate male authority: playful mischief or stubborn pride is corrected promptly across his knee on the cedar porch, settling into sweet, undivided devotion in their emerald sanctuary.",
        "names": [
            "Sylvi", "Faelynn", "Elowen", "Vespera", "Aurelia", "Lyra", "Naevia", "Sariel", "Corinne", "Fenra", "Isolde"
        ],
        "titles": [
            "The Canopy Master's Sole High-Elf Bride", "The Sun-Dappled Wood-Elf Consort", "The Cherished Human Herb-Wife",
            "The Nimble Demi-Human Bower-Bride", "The Sole Canopy Mistress", "The Devoted Tree-Wife"
        ],
        "tags": ["Great World Tree Canopy", "Hidden Treehouse Bower", "Non-Royal Patriarch", "Zero Guards Or Watchers", "High-Canopy Seclusion", "Pan-Species Monogamy", "Single Wife Dynamic", "Forest Elf or Human or Beastfolk", "Male Headship", "Domestic Discipline", "Peaceful Sylvan Harmony"]
    },

    # ==========================================
    # ANCIENT CIVILIZATIONS & CLASSICAL ANTIQUITY
    # ==========================================
    "bronze_age_mesopotamia": {
        "id": "bronze_age_mesopotamia",
        "name": "🏛️ Ancient Mesopotamia & Sumer (c. 3000 – 1600 BCE)",
        "short_name": "Ancient Mesopotamia",
        "span": "c. 3000 – 1600 BCE",
        "category": "Antiquity",
        "region": "Middle East",
        "aesthetic": "Mud-brick ziggurats, lapis lazuli beads, clay cuneiform tablets, pleated linen wraps, copper mirrors, Tigris-Euphrates canal gardens, incense of myrrh.",
        "tech": "Bronze metallurgy, ox-drawn plows, clay cylinder seals, reed styluses, oil lamps, sun-dried brick architecture.",
        "social_codes": "Temple priestess hierarchy, divine kingship, Code of Hammurabi honor debts, household patriarchal mastery, sacred oaths sworn to Ishtar/Inanna.",
        "names": ["Inanna-sharra", "Amat-Ishtar", "Shulgi-simti", "Nin-kalla", "Enheduanna", "Beltani", "Tadukhipa", "Puabi"],
        "titles": [
            "The High Priestess of Ur", "The Royal Palace Scribe", "The Temple Cellar Mistress",
            "The Patrician Weaver Consort", "The Royal Cupbearer"
        ],
        "tags": ["Ancient Mesopotamia", "Bronze Age", "Ziggurats & Temples", "Cuneiform Era", "Historical Antiquity"]
    },
    "ancient_egypt_new_kingdom": {
        "id": "ancient_egypt_new_kingdom",
        "name": "🏺 New Kingdom Egypt (c. 1550 – 1077 BCE)",
        "short_name": "New Kingdom Egypt",
        "span": "c. 1550 – 1077 BCE",
        "category": "Antiquity",
        "region": "Africa & Global",
        "aesthetic": "Gilded Nile barges, kohl-rimmed almond eyes, pleated sheer linen kalasiris, lotus blossoms, turquoise amulets, sandstone hypostyle halls, alabaster perfumed unguents.",
        "tech": "Cast bronze, papyrus scrolls, horse-drawn war chariots, shaduf irrigation, gold leaf gilding, copper mirrors.",
        "social_codes": "Divine Ma'at balance, Pharaoh court decrees, royal sister-wife dynasties, temple god's wives, hereditary palace scribes.",
        "names": ["Nefertari", "Meritaten", "Henutsen", "Kiya", "Sitra", "Nebetta", "Tauret", "Mutnodjmet"],
        "titles": [
            "The Royal Charioteer's Daughter", "The Temple Chantress of Amun", "The Royal Scribe's Headstrong Wife",
            "The Pharaoh's Chief Perfumer", "The Noble Lotus of Thebes"
        ],
        "tags": ["Ancient Egypt", "New Kingdom", "Pharaonic Court", "Nile Empire", "Historical Antiquity"]
    },
    "classical_greece": {
        "id": "classical_greece",
        "name": "🏛️ Classical Greece (c. 500 – 323 BCE)",
        "short_name": "Classical Greece",
        "span": "c. 500 – 323 BCE",
        "category": "Antiquity",
        "region": "Mediterranean",
        "aesthetic": "White marble colonnades, olive groves, chiton & peplos drapery with gold fibulae, amphoras of vintage wine, bronze hoplite gear, symposium lyres.",
        "tech": "Bronze & iron forging, trireme galleys, stone aqueducts, sundials, parchment & wax tablets, oil lamps.",
        "social_codes": "Polis civic virtue, Spartan stern discipline vs Athenian domestic seclusion, philosophical symposium rhetoric, oracle prophecies, family honor.",
        "names": ["Kassandra", "Helena", "Gorgo", "Aspasia", "Lysandra", "Phryne", "Atalanta", "Chara", "Damaris"],
        "titles": [
            "The Spartan Chieftain's Daughter", "The Athenian Archon's Consort", "The Priestess of Apollo",
            "The Haughty Patrician Heiress", "The Philosopher's Sassy Companion"
        ],
        "tags": ["Classical Greece", "Antiquity", "Spartan & Athenian", "Polis & Lyre", "Hellenic Era"]
    },
    "roman_republic_empire": {
        "id": "roman_republic_empire",
        "name": "🦅 Roman Empire / Imperial Rome (c. 27 BCE – 476 CE)",
        "short_name": "Imperial Rome",
        "span": "c. 27 BCE – 476 CE",
        "category": "Antiquity",
        "region": "Mediterranean",
        "aesthetic": "Grand travertine forums, mosaic peristyle courtyards, tyrian purple silk stolas, gold snake armlets, legionary gladii, torchlit subterranean crypts, laurel wreaths.",
        "tech": "Roman concrete, hypocaust underfloor heating, aqueducts, paved stone roads, water-powered grain mills, gladius steel.",
        "social_codes": "Paterfamilias absolute domestic authority, patrician senatorial backstabbing, client-patron obligations, vestal virgin sanctity, stoic gravitas.",
        "names": ["Lady Aurelia", "Octavia", "Valeria", "Flavia", "Cornelia", "Claudia", "Livia", "Lucilla", "Drusilla"],
        "titles": [
            "The Senatorial Matron", "The Legate's Proud Wife", "The Imperial Vestal Sister",
            "The Patrician Heiress", "The Tribune's Rebellious Consort"
        ],
        "tags": ["Roman Empire", "Imperial Rome", "Patrician Intrigue", "Pax Romana", "Classical Antiquity"]
    },
    "persian_achaemenid": {
        "id": "persian_achaemenid",
        "name": "🦁 Achaemenid Persian Empire (c. 550 – 330 BCE)",
        "short_name": "Persian Empire",
        "span": "c. 550 – 330 BCE",
        "category": "Antiquity",
        "region": "Middle East",
        "aesthetic": "Persepolis stone gate of nations, winged bull reliefs, purple and gold silk robes, lapis inlays, royal paradis court gardens, golden rhyton drinking horns.",
        "tech": "Qanat subterranean irrigation, Royal Road courier stations, iron weaponry, gold daric coins, glazed brick murals.",
        "social_codes": "King of Kings satrapy oaths, Zoroastrian light-truth morality, court eunuch protocol, royal harem diplomacy, lavish banquet rituals.",
        "names": ["Atossa", "Stateira", "Artystone", "Parysatis", "Amestris", "Roxana", "Mandane"],
        "titles": [
            "The Satrap's Noble Daughter", "The Persepolis Royal Weaver", "The Court Garden Mistress",
            "The Immortals Commander's Consort", "The Royal Wine Steward"
        ],
        "tags": ["Persian Empire", "Achaemenid", "Persepolis", "Silk & Gold", "Ancient Middle East"]
    },
    "han_tang_dynasty": {
        "id": "han_tang_dynasty",
        "name": "🏮 Imperial China — Tang Dynasty (618 – 907 CE)",
        "short_name": "Tang Dynasty China",
        "span": "618 – 907 CE",
        "category": "Antiquity",
        "region": "East Asia",
        "aesthetic": "Flowing high-waisted silk ruqun, cinnabar palace pillars, jade pendants, ink-stone calligraphy, night blooming tea gardens, guzheng zithers, Chang'an lantern festivals.",
        "tech": "Woodblock printing, porcelain kilns, water-driven astronomical clocks, grand canal transport, paper currency, tea culture.",
        "social_codes": "Confucian filial order, imperial examination rank, inner palace ranking protocols, tea ceremony etiquette, poetic courtship, unbendable family face.",
        "names": ["Meiling", "Yulan", "Xiulan", "Shurong", "Zhenzhu", "Lianhua", "Yanxi", "Qianxue", "Wenling"],
        "titles": [
            "The Minister's Eldest Daughter", "The Imperial Academy Scholar Consort", "The Silk Guild Mistress",
            "The Court Calligrapher", "The Sassy Tea Master's Apprentice"
        ],
        "tags": ["Imperial China", "Tang Dynasty", "Silk & Jade", "Chang'an Court", "Historical East Asia"]
    },

    # ==========================================
    # EXTENSIVE MEDIEVAL ERA TEMPLATES (40+ COUNTRIES & REGIONS)
    # ==========================================
    # --- British Isles ---
    "medieval_anglo_saxon": {
        "id": "medieval_anglo_saxon",
        "name": "🛡️ Anglo-Saxon England & Danelaw (c. 650 – 1066 CE)",
        "short_name": "Anglo-Saxon England",
        "span": "c. 650 – 1066 CE",
        "category": "Medieval",
        "region": "British Isles",
        "aesthetic": "Thatch-roofed timber mead halls, hearth-smoke, garnet-cloisonné gold brooches, boiled leather armor, horn drinking cups, rune-carved broadswords.",
        "tech": "Pattern-welded iron blades, loom-woven wool, wooden stockades, illuminated gospel manuscripts, ox teams.",
        "social_codes": "Thane oaths to the Ealdorman, blood-wergild recompense, shield-wall camaraderie, abbess ecclesiastical autonomy, clan hospitality.",
        "names": ["Aethelflaed", "Eadgyth", "Mildred", "Wynflaed", "Aelfgifu", "Godiva", "Hilda", "Cyneburh"],
        "titles": [
            "The Lady of Mercia", "The Mead-Hall Chatelaine", "The Ealdorman's Headstrong Daughter",
            "The Danelaw Chieftain's Wife", "The Scriptorium Illuminator"
        ],
        "tags": ["Anglo-Saxon", "Danelaw", "Mead Hall & Hearth", "Old English", "Medieval Britain"]
    },
    "medieval_norman_conquest": {
        "id": "medieval_norman_conquest",
        "name": "🏰 Norman England & The Conquest (c. 1066 – 1154 CE)",
        "short_name": "Norman England",
        "span": "c. 1066 – 1154 CE",
        "category": "Medieval",
        "region": "British Isles",
        "aesthetic": "Motte-and-bailey timber stockades, newly raised limestone stone keeps, nasal-helmet chainmail, kite shields, Bayeux tapestry linens, hunting falcons.",
        "tech": "Couched lance cavalry charges, stone keep engineering, Domesday Book censuses, heavy Norman chainmail hauberks.",
        "social_codes": "Norman conqueror supremacy over Saxon peasantry, strict forest hunting laws, feudal sub-infeudation, baronial rebellion, fierce castellan discipline.",
        "names": ["Matilda", "Gundreda", "Adeliza", "Sybil", "Rohese", "Alice", "Basilia", "Emma"],
        "titles": [
            "The Castellan's Norman Lady", "The Saxon Thegn's Defiant Daughter", "The Domesday Commissioner's Consort",
            "The Falconry Mistress of the Keep", "The Baron's French Bride"
        ],
        "tags": ["Norman Conquest", "1066 Era", "Motte & Bailey", "Saxon & Norman", "Medieval Britain"]
    },
    "medieval_high_plantagenet": {
        "id": "medieval_high_plantagenet",
        "name": "⚔️ Plantagenet England & Chivalric Courts (c. 1154 – 1399 CE)",
        "short_name": "Plantagenet England",
        "span": "c. 1154 – 1399 CE",
        "category": "Medieval",
        "region": "British Isles",
        "aesthetic": "Towering concentric stone fortresses, heraldic lion surcoats, tourney tilt-yards, chivalric courtly romance songs, stained glass cathedral windows, longbow wood.",
        "tech": "English yew longbows, water-powered iron forges, plate armor reinforcement over mail, ribbed gothic vaulting, wheelbarrows.",
        "social_codes": "Chivalric vows of courtly love, Magna Carta baronial limits, knightly tournament honor, stern lord-of-the-manor discipline, arranged dynasty marriages.",
        "names": ["Lady Eleanor", "Isabella", "Philippa", "Joan", "Margaret", "Cecily", "Blanche", "Constance"],
        "titles": [
            "The High Courtly Chatelaine", "The Longbow Captain's Proud Wife", "The Baronial Tournament Lady",
            "The Royal Ward of Windsor", "The Manor Wool-Merchant's Consort"
        ],
        "tags": ["Plantagenet", "Chivalric Court", "High Middle Ages", "Tournaments & Longbows", "Medieval Britain"]
    },
    "medieval_wars_of_the_roses": {
        "id": "medieval_wars_of_the_roses",
        "name": "🌹 Wars of the Roses & Late Medieval England (c. 1455 – 1487 CE)",
        "short_name": "Wars of the Roses",
        "span": "c. 1455 – 1487 CE",
        "category": "Medieval",
        "region": "British Isles",
        "aesthetic": "Red and white embroidered rose badges, full gothic plate armor, muddy battlefield pavises, torchlit council chambers, wax-sealed treason letters, stained velvet cloaks.",
        "tech": "Full bespoke steel plate armor, early gunpowder serpentines/cannons, crossbow windlasses, paper letters, astrolabes.",
        "social_codes": "Yorkist vs Lancastrian blood feuds, kingmaker treason intrigues, perilous shifting allegiances, ruthless household protection, fortress sieges.",
        "names": ["Lady Margaret", "Anne", "Elizabeth", "Cecily", "Jacquetta", "Katherine", "Jane", "Eleanor"],
        "titles": [
            "The Yorkist Stronghold Mistress", "The Lancastrian Traitor's Daughter", "The Kingmaker's Cunning Ward",
            "The Armorer's Fiery Wife", "The Secluded Manor Heiress"
        ],
        "tags": ["Wars of the Roses", "York & Lancaster", "Late Medieval", "Treason & Armor", "Medieval Britain"]
    },
    "medieval_scotland_highlands": {
        "id": "medieval_scotland_highlands",
        "name": "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Medieval Scotland — Highland Clans & Wars (c. 1286 – 1450 CE)",
        "short_name": "Medieval Scotland",
        "span": "c. 1286 – 1450 CE",
        "category": "Medieval",
        "region": "British Isles",
        "aesthetic": "Mist-shrouded heather hills, stone tower houses, heavy woven wool plaids, claymore broadswords, peat hearth fires, bagpipe drones echoing off lochs.",
        "tech": "Two-handed claymores, schiltron spear formations, stone peel towers, heather brewing, watermills.",
        "social_codes": "Fierce Highland clan blood ties, tanistry succession feuds, border reiver cattle raids, hospitality law of bread and salt, unwavering clan pride.",
        "names": ["Morag", "Catriona", "Mairead", "Fiona", "Isobel", "Elspeth", "Kenna", "Aila"],
        "titles": [
            "The Clan Chieftain's Proud Wife", "The Tower Peel Mistress", "The Highland Rebel's Bride",
            "The Border Reiver's Companion", "The Lochside Hearth-Keeper"
        ],
        "tags": ["Medieval Scotland", "Highland Clans", "Claymores & Heather", "Tower Houses", "Medieval Britain"]
    },
    "medieval_ireland_gaelic": {
        "id": "medieval_ireland_gaelic",
        "name": "☘️ Gaelic Ireland & The Brehon Kingdoms (c. 1000 – 1450 CE)",
        "short_name": "Gaelic Ireland",
        "span": "c. 1000 – 1450 CE",
        "category": "Medieval",
        "region": "British Isles",
        "aesthetic": "Emerald ringfort raths, stone round towers, saffron-dyed linen leines, willow-wood Celtic harps, cattle herd pastures, wolfhound companions.",
        "tech": "Gallowglass two-handed axes, kern javelin warfare, crannog lake dwellings, ringfort defenses, illuminated parchment.",
        "social_codes": "Ancient Brehon Law civil compensation, fosterage alliances, bardic satire power, cattle-raid honor, independent female property rights.",
        "names": ["Dearbhla", "Sorcha", "Grainne", "Niamh", "Aisling", "Maeve", "Fionnuala", "Aoife"],
        "titles": [
            "The High King's Bardic Consort", "The Gallowglass Warlord's Lady", "The Brehon Judge's Keen Daughter",
            "The Ringfort Chieftain's Wife", "The Monastery Scribe Mistress"
        ],
        "tags": ["Gaelic Ireland", "Brehon Law", "Celtic Harp & Ringfort", "Gallowglass", "Medieval Britain"]
    },

    # --- Western & Central Europe ---
    "medieval_france_capetian": {
        "id": "medieval_france_capetian",
        "name": "⚜️ Capetian France & Courtly Love (c. 1150 – 1328 CE)",
        "short_name": "Capetian France",
        "span": "c. 1150 – 1328 CE",
        "category": "Medieval",
        "region": "Western Europe",
        "aesthetic": "Fleur-de-lis royal tapestries, high-pointed gothic arches of Saint-Denis, silk surcoats, illuminated troubadour songbooks, rose gardens with marble sundials.",
        "tech": "Flying buttress gothic architecture, chainmail hauberks, stained glass alchemy, parchment scriptoria, water-powered grain mills.",
        "social_codes": "The Code of Courtly Love (amour courtois), royal divine right, Eleanor of Aquitaine chivalric courts, arranged dynastic marriages, ecclesiastical piety.",
        "names": ["Lady Blanche", "Marie", "Isabelle", "Aliénor", "Marguerite", "Agnès", "Jeanne", "Béatrice"],
        "titles": [
            "The Lady of the Court of Love", "The Royal Seneschal's Consort", "The Gothic Cathedral Patroness",
            "The Troubadour's Enigmatic Muse", "The Castellan's Noble Wife"
        ],
        "tags": ["Capetian France", "Courtly Love", "Gothic Splendor", "Fleur-de-Lis", "Medieval Europe"]
    },
    "medieval_france_hundred_years": {
        "id": "medieval_france_hundred_years",
        "name": "⚔️ France — Hundred Years' War & Sieges (c. 1337 – 1453 CE)",
        "short_name": "Hundred Years' War France",
        "span": "c. 1337 – 1453 CE",
        "category": "Medieval",
        "region": "Western Europe",
        "aesthetic": "Besieged stone ramparts with arrow-slits, blackened ruins, pennants of Joan of Arc, heavy steel arming swords, iron kettle hats, chapel candles in the dark.",
        "tech": "Transitional mail-and-plate armor, early bombards, trebuchet siege warfare, pavise shields, crossbow cranequins.",
        "social_codes": "Oriflamme no-quarter warfare, patriotic French royal defiance, mercenary routier ravages, peasant Jacquerie revolts, steadfast fortress survival.",
        "names": ["Jeanne", "Yolande", "Catherine", "Collette", "Gillette", "Antoinette", "Peronelle", "Madeleine"],
        "titles": [
            "The Besieged Fortress Mistress", "The Captain of Archers' Companion", "The Resistance Manor Lady",
            "The Battlefield Camp Healer", "The Dispossessed French Heiress"
        ],
        "tags": ["Hundred Years War", "Siege & Rampart", "Joan of Arc Era", "Chivalric War", "Medieval France"]
    },
    "medieval_france_occitan_cathar": {
        "id": "medieval_france_occitan_cathar",
        "name": "🏰 Occitan Southern France & Troubadour Lands (c. 1150 – 1250 CE)",
        "short_name": "Occitan Troubadours",
        "span": "c. 1150 – 1250 CE",
        "category": "Medieval",
        "region": "Western Europe",
        "aesthetic": "Sun-drenched limestone cliffs of Montségur, terracotta-tiled keeps, wild rosemary and cypress, lutes and rebecs, Catalan trade silks, secret mountain paths.",
        "tech": "Drystone mountain castle engineering, Mediterranean terrace viticulture, silk weaving, parchment poetry.",
        "social_codes": "Fin'amor troubadour poetry, religious tolerance of the Cathar Parfaits, papal Albigensian crusade paranoia, independent female lords of Languedoc.",
        "names": ["Esclarmonde", "Azalais", "Tiburge", "Garsenda", "Beatritz", "Na Loba", "Gormanda", "Alba"],
        "titles": [
            "The Mountain Citadel Chatelaine", "The Troubadour Trobairitz", "The Secret Heretic Parfaite",
            "The Languedoc Vineyard Lady", "The Pyrenean Border Heiress"
        ],
        "tags": ["Occitania", "Troubadours & Cathars", "Montsegur", "Languedoc", "Medieval France"]
    },
    "medieval_hre_germany": {
        "id": "medieval_hre_germany",
        "name": "🦅 Holy Roman Empire & German Barons (c. 1100 – 1450 CE)",
        "short_name": "Holy Roman Empire",
        "span": "c. 1100 – 1450 CE",
        "category": "Medieval",
        "region": "Central Europe",
        "aesthetic": "Imposing Rhine river toll castles (Burg), heraldic double-headed imperial eagles, heavy beer cellars, timber guildhalls, heavy broadswords, deep Black Forest pine mists.",
        "tech": "Blast furnace iron casting, mining engineering in the Harz mountains, crossbow guild mechanics, stone fortress construction.",
        "social_codes": "Imperial Diet (Reichstag) prince-elector politicking, robber baron feud law (Fehderecht), strict craft guild apprenticeships, burgher civic pride.",
        "names": ["Hildegard", "Gertrud", "Gisela", "Hedwig", "Kunigunde", "Brunhilde", "Irmgard", "Mechthild"],
        "titles": [
            "The Rhine Castle Burgfraulein", "The Prince-Elector's Diplomatic Wife", "The Guildmaster's Resolute Daughter",
            "The Imperial Abbey Prioress", "The Black Forest Manor Lady"
        ],
        "tags": ["Holy Roman Empire", "German Castles", "Burg & Guild", "Imperial Barons", "Medieval Central Europe"]
    },
    "medieval_hanseatic_league": {
        "id": "medieval_hanseatic_league",
        "name": "⛵ Hanseatic League & Baltic Merchant Guilds (c. 1241 – 1450 CE)",
        "short_name": "Hanseatic League",
        "span": "c. 1241 – 1450 CE",
        "category": "Medieval",
        "region": "Central Europe",
        "aesthetic": "Red-brick Gothic merchant counting houses, Baltic sea salt fog, timber docks with trading cogs, barrels of salted herring, fur pelts, weighed silver thalers.",
        "tech": "Hanseatic trading cogs with stern rudders, double-entry bookkeeping, brick Gothic architecture, salt fish curing, dry stone wharves.",
        "social_codes": "Merchant oligarchy council control, guild monopolies and embargoes, commercial maritime contracts, stern Protestant-leaning work ethic, burgher wealth display.",
        "names": ["Adelheid", "Ilse", "Gerda", "Wiebke", "Margaretha", "Kirsten", "Dorothea", "Liese"],
        "titles": [
            "The Hanseatic Merchant's Wife", "The Baltic Cog Fleet Mistress", "The Lubeck Counting-House Heiress",
            "The Fur Trader's Shrewd Partner", "The Guild Alderman's Daughter"
        ],
        "tags": ["Hanseatic League", "Baltic Cog", "Brick Gothic", "Merchant Guilds", "Medieval Trade"]
    },
    "medieval_teutonic_order": {
        "id": "medieval_teutonic_order",
        "name": "✝️ Teutonic Order & Northern Crusades (c. 1230 – 1410 CE)",
        "short_name": "Teutonic Order",
        "span": "c. 1230 – 1410 CE",
        "category": "Medieval",
        "region": "Central Europe",
        "aesthetic": "Massive red-brick fortress of Malbork (Marienburg), white mantles with black crosses, frozen river battlefields, iron maces, solemn Latin chants, winter birch forests.",
        "tech": "Water-driven flour and saw mills in castle complexes, siege weaponry, heated hypocaust chambers, heavy knightly lance combat.",
        "social_codes": "Monastic-military warrior vows of poverty and chastity, ruthless conversion campaigns against Baltic pagans, Grand Master decree authority, German colonization.",
        "names": ["Katherina", "Elisabeth", "Sophie", "Walpurga", "Otilie", "Agathe", "Irmingard"],
        "titles": [
            "The Komtur Fortress Hostess", "The Teutonic Knight's Secret Devotion", "The Baltic Settler's Resilient Wife",
            "The Marienburg Castle Chatelaine", "The Prussian Frontier Healer"
        ],
        "tags": ["Teutonic Order", "Northern Crusades", "Malbork Castle", "Black Cross & Brick", "Medieval Prussia"]
    },
    "medieval_bohemia_prague": {
        "id": "medieval_bohemia_prague",
        "name": "👑 Kingdom of Bohemia & Golden Prague (c. 1346 – 1419 CE)",
        "short_name": "Kingdom of Bohemia",
        "span": "c. 1346 – 1419 CE",
        "category": "Medieval",
        "region": "Central Europe",
        "aesthetic": "Gothic spires of St. Vitus, cobblestone Charles Bridge with stone saints, silver mines of Kutná Hora, astronomical clocks, royal libraries, velvet court gowns.",
        "tech": "Silver mining and smelting, university scholarship, clockwork horology, master stonemasonry, early paper mills.",
        "social_codes": "Holy Roman Imperial court patronage under Charles IV, Czech-German cultural friction, early Hussite religious ferment, scholarly humanism.",
        "names": ["Bohuslava", "Ludmila", "Anezka", "Eliska", "Zdenka", "Marketa", "Jitka", "Dobromila"],
        "titles": [
            "The Prague Castle Royal Lady", "The Kutna Hora Silver Heiress", "The University Scholar's Consort",
            "The Bohemian Astrologer's Wife", "The Alchemical Manor Mistress"
        ],
        "tags": ["Kingdom of Bohemia", "Golden Prague", "Charles IV Era", "Silver & Spires", "Medieval Central Europe"]
    },
    "medieval_poland_piast_jagiellon": {
        "id": "medieval_poland_piast_jagiellon",
        "name": "🦅 Poland-Lithuania & Wawel Court (c. 1320 – 1492 CE)",
        "short_name": "Poland-Lithuania",
        "span": "c. 1320 – 1492 CE",
        "category": "Medieval",
        "region": "Eastern Europe",
        "aesthetic": "Red-brick Wawel royal castle overlooking the Vistula, fur-lined kontusz coats, amber jewellery, heavy sabres, oak forest royal hunts, salt mine caverns of Wieliczka.",
        "tech": "Underground rock salt mining, saber metallurgy, light and heavy cavalry tactics, fortified wooden and stone grods.",
        "social_codes": "Szlachta noble democracy early pacts, grand union of Crown and Grand Duchy, tolerance of diverse faiths, fierce defense of personal liberty (Golden Liberty seeds).",
        "names": ["Jadwiga", "Danuta", "Zofia", "Boleslawa", "Kazimiera", "Wanda", "Grazyna", "Aldona"],
        "titles": [
            "The Wawel Castle Royal Lady", "The Szlachta Noble's Proud Wife", "The Wieliczka Salt Mine Consort",
            "The Lithuanian Frontier Princess", "The Vistula River Merchant Heiress"
        ],
        "tags": ["Poland Lithuania", "Wawel Royal Court", "Szlachta & Amber", "Jagiellon Era", "Medieval Eastern Europe"]
    },

    # --- Mediterranean & Iberia ---
    "medieval_al_andalus_cordoba": {
        "id": "medieval_al_andalus_cordoba",
        "name": "🌙 Al-Andalus — Caliphate of Córdoba (c. 929 – 1031 CE)",
        "short_name": "Caliphate of Cordoba",
        "span": "c. 929 – 1031 CE",
        "category": "Medieval",
        "region": "Mediterranean",
        "aesthetic": "Red-and-white horseshoe arches of the Mezquita, orange-tree courtyards with trickling fountains, glazed ceramic tiles, astrolabes, Damascene silk robes, night poetry salons.",
        "tech": "Hydraulic noria waterwheels, paper manufactories, surgical instruments, astronomical astrolabes, agricultural grafting.",
        "social_codes": "Convivencia interfaith culture (Muslims, Christians, Jews), royal poet court patronage, female scholars and copyists in grand libraries, courtly love (hubb) poetry.",
        "names": ["Wallada", "Zaynab", "Aisha", "Lubna", "Fatima", "Hafsa", "Maryam", "Subh"],
        "titles": [
            "The Cordoba Palace Calligrapher", "The Royal Poetess of the Court", "The Vizier's Brilliant Daughter",
            "The Guadalquivir Garden Mistress", "The Astronomer's Scholarly Wife"
        ],
        "tags": ["Al-Andalus", "Cordoba Caliphate", "Horseshoe Arches & Poetry", "Islamic Golden Age", "Medieval Iberia"]
    },
    "medieval_al_andalus_granada": {
        "id": "medieval_al_andalus_granada",
        "name": "🏰 Nasrid Granada & The Alhambra (c. 1238 – 1492 CE)",
        "short_name": "Kingdom of Granada",
        "span": "c. 1238 – 1492 CE",
        "category": "Medieval",
        "region": "Mediterranean",
        "aesthetic": "Stucco muqarnas honeycomb ceilings, marble Court of the Lions, cypress and myrtle gardens of the Generalife, silk kaftans with gold thread, lute music under Sierra Nevada snows.",
        "tech": "Elaborate canal gravity-flow irrigation, intricate geometric tile cutting (zellij), fine silk sericulture, crossbow defenses.",
        "social_codes": "Melancholic twilight of Islamic Spain, delicate diplomatic tributes to Castile, palace intrigue of the Abencerrages, refined romantic court etiquette.",
        "names": ["Aixa", "Morayma", "Soraya", "Zahra", "Nura", "Shamsa", "Laila", "Khadija"],
        "titles": [
            "The Alhambra Palace Consort", "The Generalife Garden Lady", "The Silk Guild Mistress of Granada",
            "The Court Musician & Poet", "The Nasrid Ambassador's Daughter"
        ],
        "tags": ["Nasrid Granada", "The Alhambra", "Muqarnas & Silk", "Twilight of Al-Andalus", "Medieval Iberia"]
    },
    "medieval_reconquista_castile": {
        "id": "medieval_reconquista_castile",
        "name": "🛡️ Kingdom of Castile & El Cid Era (c. 1065 – 1250 CE)",
        "short_name": "Castile & Leon",
        "span": "c. 1065 – 1250 CE",
        "category": "Medieval",
        "region": "Mediterranean",
        "aesthetic": "Walled city of Ávila, arid meseta plains, heavy iron broadswords, leather jinetes cavalry armor, monastery bell-towers, dark wool mantles pinned with silver brooches.",
        "tech": "Jinete light cavalry tactics with high saddles, crossbowmen garrisons, fortified church architecture, wool mesta sheep farming.",
        "social_codes": "Reconquista crusading fervor mixed with pragmatic border alliances, code of the hidalgo caballero, fierce family honor, Santiago pilgrimage piety.",
        "names": ["Doña Jimena", "Urraca", "Berenguela", "Sancha", "Teresa", "Inés", "Elvira", "Aldonza"],
        "titles": [
            "The Castilian Border Chatelaine", "The Hidalgo Knight's Resilient Wife", "The Ávila Walled Manor Lady",
            "The Camino Pilgrimage Hospitaller", "The Toledo Sword-Smith's Daughter"
        ],
        "tags": ["Kingdom of Castile", "El Cid Era", "Reconquista & Meseta", "Caballeros", "Medieval Spain"]
    },
    "medieval_venice_maritime": {
        "id": "medieval_venice_maritime",
        "name": "⚓ Venetian Maritime Republic & The Doge (c. 1100 – 1450 CE)",
        "short_name": "Venetian Republic",
        "span": "c. 1100 – 1450 CE",
        "category": "Medieval",
        "region": "Mediterranean",
        "aesthetic": "Gothic palazzos rising from dark lagoon water, gilded mosaics of St. Mark's, wooden galleys lined at the Arsenale, carnival masks, spice-scented wharf warehouses.",
        "tech": "Standardized assembly-line galley production at the Arsenale, maritime navigation charts (portolans), glass blowing on Murano, marine insurance.",
        "social_codes": "The Council of Ten secrecy and informants, patrician merchant monopoly, Golden Book aristocratic pedigree, maritime trade over land warfare.",
        "names": ["Caterina", "Contarina", "Morosina", "Delfina", "Fiorenza", "Agnese", "Elena", "Francesca"],
        "titles": [
            "The Doge's Diplomatic Daughter", "The Spice Fleet Patrician Heiress", "The Arsenale Shipwright's Wife",
            "The Murano Glassmaster's Consort", "The Lagoon Palazzo Chatelaine"
        ],
        "tags": ["Venetian Republic", "Maritime Empire", "Doge & Arsenale", "Gothic Venice", "Medieval Italy"]
    },
    "medieval_florence_commune": {
        "id": "medieval_florence_commune",
        "name": "⚜️ Medieval Florence & Guild Communes (c. 1250 – 1400 CE)",
        "short_name": "Medieval Florence",
        "span": "c. 1250 – 1400 CE",
        "category": "Medieval",
        "region": "Mediterranean",
        "aesthetic": "Fortified stone tower-houses bristling above narrow streets, wool-dyeing vats along the Arno, red-tiled roofs, Dante's poetic quarters, Florentine gold florins.",
        "tech": "Gold florin standardized currency, international banking ledger systems, water-powered wool fulling mills, crossbow militia garrisons.",
        "social_codes": "Bitter Guelph vs Ghibelline clan vendettas, Great Guild (Arti Maggiori) political supremacy, arranged mercantile alliances, humanistic court poetry.",
        "names": ["Beatrice", "Gemma", "Bice", "Fiammetta", "Lauretta", "Nella", "Celia", "Vanna"],
        "titles": [
            "The Wool Guild Merchant's Lady", "The Guelph Tower-House Heiress", "The Florentine Banker's Consort",
            "The Poet's Idealized Beatrice", "The Silk Guild Master's Daughter"
        ],
        "tags": ["Medieval Florence", "Guelph & Ghibelline", "Florentine Guilds", "Tower Houses", "Medieval Italy"]
    },
    "medieval_norman_sicily": {
        "id": "medieval_norman_sicily",
        "name": "👑 Norman Kingdom of Sicily (c. 1130 – 1194 CE)",
        "short_name": "Norman Sicily",
        "span": "c. 1130 – 1194 CE",
        "category": "Medieval",
        "region": "Mediterranean",
        "aesthetic": "Palermo royal palaces blending Arab stucco, Byzantine gold mosaics, and Norman stone arches; palm courtyards, silk coronation mantles with Arabic embroidery, Mediterranean breezes.",
        "tech": "Translation of Greek and Arabic scientific texts, silk manufactories, astronomical instruments, Mediterranean galley fleets.",
        "social_codes": "Polyglot court culture (Latin, Arabic, Greek, French), royal tolerance of diverse religions, Byzantine court ceremonies with Norman feudal governance.",
        "names": ["Constance", "Adelasia", "Sibylla", "Elvira", "Eudokia", "Amina", "Clemenza"],
        "titles": [
            "The Palermo Royal Palace Lady", "The Byzantine-Norman Courtier", "The Royal Translation Academy Patron",
            "The Messina Harbor Merchant Heiress", "The Cathedral Mosaic Mistress"
        ],
        "tags": ["Norman Sicily", "Arab Norman Byzantine", "Palermo Gold", "Multicultural Medieval", "Medieval Italy"]
    },

    # --- Byzantine & Eastern Mediterranean ---
    "medieval_byzantine_komnenian": {
        "id": "medieval_byzantine_komnenian",
        "name": "🏛️ Byzantine Empire — Komnenian Golden Age (c. 1081 – 1185 CE)",
        "short_name": "Byzantine Empire",
        "span": "c. 1081 – 1185 CE",
        "category": "Medieval",
        "region": "Eastern Europe",
        "aesthetic": "Great Palace of Blachernae overlooking the Golden Horn, purple imperial silk gowns with heavy seed pearls, gold icons glowing under beeswax tapers, Varangian axes.",
        "tech": "Greek Fire naval siphon tubes, imperial silk weaving monopolies, mechanical throne automations, heavy Cataphract cavalry armor.",
        "social_codes": "Intricate Byzantine court hierarchy (sebastokrator, caesar), purple-born (porphyrogenita) imperial pride, ruthless palace blinding/exile coups, orthodox theological debate.",
        "names": ["Anna", "Eudokia", "Maria", "Irene", "Theodora", "Zoe", "Alexia", "Euphrosyne"],
        "titles": [
            "The Porphyrogenita Imperial Princess", "The Varangian Guard Commander's Lady", "The Blachernae Palace Historian",
            "The Byzantine Silk Monopoly Mistress", "The Icon Scriptorium Prioress"
        ],
        "tags": ["Byzantine Empire", "Constantinople", "Varangian Guard", "Purple Silk & Gold", "Medieval Byzantine"]
    },
    "medieval_byzantine_palaiologan": {
        "id": "medieval_byzantine_palaiologan",
        "name": "🏰 Late Byzantine Constantinople (c. 1261 – 1453 CE)",
        "short_name": "Late Byzantine Empire",
        "span": "c. 1261 – 1453 CE",
        "category": "Medieval",
        "region": "Eastern Europe",
        "aesthetic": "Weathered massive Theodosian Walls, peeling gold leaf on Hagia Sophia frescoes, Italian merchant enclaves in Galata, scholarly manuscripts, solemn liturgical bells.",
        "tech": "Crossbow defenses along the double walls, sea chain across the Golden Horn, preservation of ancient Greek philosophical codices.",
        "social_codes": "Tragic grandeur of an empire reduced to a single walled city, desperate diplomatic appeals to Rome, fierce Orthodox anti-unionist convictions, proud aristocratic endurance.",
        "names": ["Helena", "Sophia", "Palaiologina", "Argyre", "Kantakouzene", "Philothea", "Kalliste"],
        "titles": [
            "The Theodosian Wall Gatekeeper's Wife", "The Hagia Sophia Cantor's Daughter", "The Desperate Imperial Diplomat's Lady",
            "The Venetian Quarter Merchant Consort", "The Ancient Codices Preserver"
        ],
        "tags": ["Late Byzantine", "Theodosian Walls", "Hagia Sophia", "Twilight of Constantinople", "Medieval Byzantine"]
    },
    "medieval_crusader_states": {
        "id": "medieval_crusader_states",
        "name": "✝️ Crusader Kingdom of Jerusalem (c. 1099 – 1291 CE)",
        "short_name": "Kingdom of Jerusalem",
        "span": "c. 1099 – 1291 CE",
        "category": "Medieval",
        "region": "Middle East",
        "aesthetic": "Sun-bleached limestone battlements of Krak des Chevaliers, red cross surcoats over mail, desert dust, cedar chests filled with Levant silks, olive groves, coastal port of Acre.",
        "tech": "Concentric stone crusader fortifications, portolan navigation, heavy Frankish cavalry charges, composite crossbows.",
        "social_codes": "Outremer hybrid Frankish-Levantine court culture, Knight Templar and Hospitaller monastic military discipline, precarious frontier survival, chivalric battle zeal.",
        "names": ["Sibylla", "Melisende", "Alice", "Hodierna", "Agnes", "Eschiva", "Stephanie", "Plaisance"],
        "titles": [
            "The Queen of Jerusalem's Courtier", "The Krak des Chevaliers Chatelaine", "The Templar Grand Master's Ward",
            "The Port of Acre Merchant Consort", "The Levant Silk Caravan Hostess"
        ],
        "tags": ["Crusader States", "Kingdom of Jerusalem", "Krak des Chevaliers", "Templar & Hospitaller", "Outremer"]
    },

    # --- Islamic World & Middle East ---
    "medieval_abbasid_baghdad": {
        "id": "medieval_abbasid_baghdad",
        "name": "📚 Abbasid Baghdad & The House of Wisdom (c. 762 – 1258 CE)",
        "short_name": "Abbasid Baghdad",
        "span": "c. 762 – 1258 CE",
        "category": "Medieval",
        "region": "Middle East",
        "aesthetic": "Round City of Baghdad along the Tigris, grand libraries with thousands of leather-bound scrolls, mosaic courtyards, fountain sprays, silk and amber perfume bazaars, night lute songs.",
        "tech": "Paper mills, astrolabes, algebraic treatises, translation of Greek/Persian/Indian scientific texts, surgical tools, water clocks.",
        "social_codes": "Scholarly prestige and debate, Bayt al-Hikma patron honor, Harun al-Rashid court grandeur, poetic love contests, cosmopolitan Islamic etiquette.",
        "names": ["Shuhda", "Zubaida", "Ulayya", "Inan", "Tuhfa", "Arwa", "Rayhana", "Sitt al-Mulk"],
        "titles": [
            "The House of Wisdom Scholar", "The Baghdad Silk Merchant's Wife", "The Caliph's Diplomatic Consort",
            "The Palace Musician & Scribe", "The Tigris Garden Mistress"
        ],
        "tags": ["Abbasid Baghdad", "House of Wisdom", "One Thousand and One Nights", "Islamic Golden Age", "Medieval Middle East"]
    },
    "medieval_mamluk_egypt": {
        "id": "medieval_mamluk_egypt",
        "name": "⚔️ Mamluk Sultanate of Cairo (c. 1250 – 1517 CE)",
        "short_name": "Mamluk Cairo",
        "span": "c. 1250 – 1517 CE",
        "category": "Medieval",
        "region": "Middle East",
        "aesthetic": "Cairo Citadel stone towers, carved stone minarets with intricate lace stonework, striped ablaq masonry, heavy steel scimitars, damascene enameled glass lamps, Nile spice docks.",
        "tech": "Superior equestrian horsemanship (furusiyya), heavy composite bow archery, enameled mosque glass, metal inlay craft.",
        "social_codes": "Mamluk military slave-soldier meritocracy, amir rivalries and sudden palace assassinations, lavish architectural waqf endowments, fierce warrior code.",
        "names": ["Shajar al-Durr", "Baraka", "Tatar", "Altun", "Qutlugh", "Asiya", "Khawand", "Zaynab"],
        "titles": [
            "The Sultan's Powerhouse Consort", "The Citadel Amir's Proud Lady", "The Khan el-Khalili Merchant Mistress",
            "The Furusiyya Master's Daughter", "The Waqf Endowment Benefactress"
        ],
        "tags": ["Mamluk Sultanate", "Cairo Citadel", "Ablaq & Scimitar", "Furusiyya Horsemanship", "Medieval Egypt"]
    },
    "medieval_seljuk_anatolia": {
        "id": "medieval_seljuk_anatolia",
        "name": "🌙 Seljuk Sultanate of Rum (c. 1077 – 1307 CE)",
        "short_name": "Seljuk Anatolia",
        "span": "c. 1077 – 1307 CE",
        "category": "Medieval",
        "region": "Middle East",
        "aesthetic": "Monolithic stone caravanserai (han) fortresses along the Silk Road, turquoise tiled madrasas of Konya, whirling dervish lodges, wool kilim rugs, mountain steppe passes.",
        "tech": "Monumental stone masonry with stalactite portals, horse archery, ceramic glaze chemistry, trade network caravanserai systems.",
        "social_codes": "Turco-Persian court synthesis, Sufi mystical devotion of Rumi, frontier ghazi warrior ethos, caravan guest protection laws.",
        "names": ["Mahperi", "Gurcu", "Ismat", "Seljuka", "Melike", "Hatun", "Gevher", "Terken"],
        "titles": [
            "The Konya Royal Palace Lady", "The Silk Road Caravanserai Mistress", "The Seljuk Architect's Consort",
            "The Sufi Master's Devoted Follower", "The Anatolian Rug Weaver Queen"
        ],
        "tags": ["Seljuk Anatolia", "Sultanate of Rum", "Konya & Caravanserai", "Turquoise Tile", "Medieval Middle East"]
    },

    # --- Eastern Europe & Slavic Realms ---
    "medieval_kievan_rus": {
        "id": "medieval_kievan_rus",
        "name": "🛡️ Kievan Rus & The Golden Gate (c. 988 – 1240 CE)",
        "short_name": "Kievan Rus",
        "span": "c. 988 – 1240 CE",
        "category": "Medieval",
        "region": "Eastern Europe",
        "aesthetic": "Golden onion domes of St. Sophia, massive oak timber kremlins along the Dnieper, fur-trimmed velvet capes, silver temple rings woven into braids, birch forests, mead horns.",
        "tech": "River longboat portage, iron ring armor, icon painting on linden wood, monumental timber architecture, Cyrillic scriptoria.",
        "social_codes": "Grand Prince court druzhina warrior retinue loyalty, veche town assembly debates, Pravda Russkaya legal codes, Orthodox Christian baptism zeal.",
        "names": ["Anna", "Yaroslavna", "Olga", "Rogneda", "Predslava", "Zvenislava", "Vysheslava", "Dobronega"],
        "titles": [
            "The Grand Princess of Kyiv", "The Druzhina Warrior's Resilient Wife", "The St. Sophia Icon Painter",
            "The Dnieper River Trader Consort", "The Boyar Clan Matron"
        ],
        "tags": ["Kievan Rus", "Golden Gate of Kyiv", "Druzhina & Fur", "Onion Domes", "Medieval Slavic"]
    },
    "medieval_novgorod_republic": {
        "id": "medieval_novgorod_republic",
        "name": "📜 Novgorod Merchant Republic (c. 1136 – 1478 CE)",
        "short_name": "Novgorod Republic",
        "span": "c. 1136 – 1478 CE",
        "category": "Medieval",
        "region": "Eastern Europe",
        "aesthetic": "Cobblestone squares with ringing veche bells, Volkhov river wharves stacked with sables and walrus ivory, birch-bark love letters, whitewashed stone churches, fur mittens.",
        "tech": "Birch bark literacy writing styluses, wooden pavement engineering, ice sledge transport, fur grading, river navigation.",
        "social_codes": "Veche republican citizen democracy, boyar merchant council disputes, hired prince military commanders (Alexander Nevsky), high female literacy and business autonomy.",
        "names": ["Marfa", "Ulyana", "Pelageya", "Vasilisa", "Evdokiya", "Glafira", "Anastasiya", "Fevroniya"],
        "titles": [
            "The Veche Bell Alderman's Wife", "The Fur Merchant Boyar Lady", "The Birch-Bark Letter Writer",
            "The Volkhov Wharf Mistress", "The Posadnik's Strong-Willed Daughter"
        ],
        "tags": ["Novgorod Republic", "Veche & Birch Bark", "Sable & Volga", "Medieval Democracy", "Medieval Slavic"]
    },
    "medieval_mongol_empire": {
        "id": "medieval_mongol_empire",
        "name": "🏹 Mongol Empire & Steppe Khanates (c. 1206 – 1368 CE)",
        "short_name": "Mongol Empire",
        "span": "c. 1206 – 1368 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Felt yurts (ger) on vast sea of grassland, boiling mares' milk (airag), boqta headdresses towering with peacock feathers, boiled leather lamellar armor, composite reflex bows.",
        "tech": "Horn-and-sinew composite bows, horse courier postal system (Yam), siege engineers recruited from across Eurasia, silver paiza passport tokens.",
        "social_codes": "Yassa law of Genghis Khan, absolute clan fealty, meritocratic promotion over aristocratic birth, female khatun governance of the camp while men campaigned.",
        "names": ["Borte", "Khutulun", "Sorghaghtani", "Chabi", "Alakhai", "Toghoo", "Mandukhai", "Yesui"],
        "titles": [
            "The Steppe Khatun", "The Undefeated Wrestler Princess", "The Yam Courier Route Mistress",
            "The Horse-Archer Commander's Wife", "The Silk Road Camp Matron"
        ],
        "tags": ["Mongol Empire", "Steppe Nomads", "Khatun & Yam", "Composite Bow", "Medieval Eurasia"]
    },

    # --- East Asia ---
    "medieval_japan_heian": {
        "id": "medieval_japan_heian",
        "name": "👘 Heian Period Japan — Imperial Kyoto Court (c. 794 – 1185 CE)",
        "short_name": "Heian Court Japan",
        "span": "c. 794 – 1185 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Twelve-layer silk robes (junihitoe), floor-length glossy black hair, lacquered wooden screens, cherry blossoms reflected in palace ponds, scented letter paper, waka poetry.",
        "tech": "Kana phonetic script development, wooden post-and-beam palace architecture (shinden-zukuri), natural plant fabric dyeing, lacquering.",
        "social_codes": "Obsession with aesthetic taste (mono no aware), indirect poetic courtship through screen partitions, Fujiwara regent clan dominance, aversion to blood/impurity.",
        "names": ["Lady Murasaki", "Sei", "Michiko", "Akiko", "Teishi", "Tamako", "Shoshi", "Kishi"],
        "titles": [
            "The Imperial Court Lady-in-Waiting", "The Waka Poetess Behind the Screen", "The Fujiwara Regent's Daughter",
            "The Tale of Genji Scribe", "The Autumn Moon Watcher"
        ],
        "tags": ["Heian Japan", "Imperial Kyoto Court", "Junihitoe Silk", "Mono no Aware", "Medieval Japan"]
    },
    "medieval_japan_kamakura": {
        "id": "medieval_japan_kamakura",
        "name": "⚔️ Kamakura Shogunate & Early Samurai (c. 1185 – 1333 CE)",
        "short_name": "Kamakura Japan",
        "span": "c. 1185 – 1333 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Great Bronze Buddha of Kamakura under ocean winds, boxy o-yoroi laced armor, horseback archery targets (yabusame), Zen rock gardens, austere cedar halls.",
        "tech": "Folded tamahagane steel forging, mounted archery bows (yumi), water-powered rice pounders, Zen Buddhist temple engineering.",
        "social_codes": "Early warrior code of the bow and horse (kyuba no michi), personal lord-vassal loyalty, Spartan frugality over Kyoto court luxury, Hojo clan regent governance.",
        "names": ["Masako", "Shizuka", "Tomoe", "Hojo", "Kiku", "Waka", "Sena", "Chiyo"],
        "titles": [
            "The Nun Shogun", "The Horse-Archer's Stern Wife", "The Zen Temple Benefactress",
            "The Kamakura Guard Mistress", "The Coastal Samurai Clan Matron"
        ],
        "tags": ["Kamakura Shogunate", "Early Samurai", "O-Yoroi Armor", "Zen & Archery", "Medieval Japan"]
    },
    "medieval_japan_sengoku": {
        "id": "medieval_japan_sengoku",
        "name": "🌸 Sengoku Jidai — Warring States Japan (c. 1467 – 1600 CE)",
        "short_name": "Sengoku Japan",
        "span": "c. 1467 – 1600 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Mountain fortresses burning against pine trees, curved castle keeps with stone bases, black-lacquered armor laced with scarlet silk, ashigaru spear walls, tea ceremony bowls.",
        "tech": "Tanegashima matchlock guns, castle stone wall engineering, iron bullet-resistant breastplates, folding steel swords, smoke signaling.",
        "social_codes": "Gekokujo (the low overthrowing the high), political hostage marriages, tea ceremony quiet before battle, lethal ninja espionage, absolute family survival.",
        "names": ["Lady Oichi", "Nene", "Nohime", "Chacha", "Gracia", "Kai", "Tachibana Ginchiyo", "Komatsuhime"],
        "titles": [
            "The Daimyo's Political Hostage Bride", "The Castle Siege Naginata Defender", "The Tea Master's Confidante",
            "The Secret Shinobi Clan Leader", "The Warlord's Field Commander Wife"
        ],
        "tags": ["Sengoku Jidai", "Warring States", "Samurai & Matchlocks", "Tea & Blood", "Medieval Japan"]
    },
    "medieval_china_song": {
        "id": "medieval_china_song",
        "name": "🍵 Song Dynasty China — Porcelain & Tea (c. 960 – 1279 CE)",
        "short_name": "Song Dynasty China",
        "span": "c. 960 – 1279 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Misty mountain watercolor ink landscapes, jade-green celadon teacups, bustling canal bridges of Kaifeng, silk robes with bamboo embroidery, scholar study desks with ink-stones.",
        "tech": "Moveable type printing, gunpowder formulas, magnetic mariner's compass, multi-stage water clocks, blast furnace steel, paper bank notes.",
        "social_codes": "Civil scholar-bureaucracy over military generals, Neo-Confucian moral discipline, imperial examination mastery, refined tea tasting and poetry competitions.",
        "names": ["Li Qingzhao", "Shushi", "Meilan", "Xiaojun", "Ruoxi", "Tingting", "Yuxiu", "Chunhua"],
        "titles": [
            "The Great Song Poetess", "The Imperial Examination Scholar's Wife", "The Celadon Kiln Master's Daughter",
            "The Grand Canal Trading Heiress", "The Tea Whisking Champion"
        ],
        "tags": ["Song Dynasty", "Celadon & Ink", "Scholars & Tea", "Kaifeng & Hangzhou", "Medieval China"]
    },
    "medieval_china_ming": {
        "id": "medieval_china_ming",
        "name": "🏯 Early Ming Dynasty & The Forbidden City (c. 1368 – 1500 CE)",
        "short_name": "Early Ming Dynasty",
        "span": "c. 1368 – 1500 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Red palace walls of the newly built Forbidden City, yellow glazed roof tiles, cobalt blue-and-white porcelain vases, silk robes with dragon roundels, seven treasure fleets.",
        "tech": "Treasure fleet ocean caravels of Zheng He, Great Wall brick reinforcement, cobalt blue porcelain glazes, bronze artillery cannons.",
        "social_codes": "Restoration of Han Chinese rule, Emperor Yongle absolute court discipline, secret police Brocade Guard (Jinyiwei) surveillance, palace eunuch bureaucracy.",
        "names": ["Empress Xu", "Baocheng", "Xiuwen", "Lanying", "Jingxian", "Meifeng", "Suhua", "Yongchun"],
        "titles": [
            "The Imperial Inner Palace Consort", "The Brocade Guard Commander's Wife", "The Blue-and-White Porcelain Heiress",
            "The Treasure Fleet Navigator's Lady", "The Hanlin Academy Calligrapher"
        ],
        "tags": ["Ming Dynasty", "Forbidden City", "Blue and White Porcelain", "Jinyiwei", "Medieval China"]
    },
    "medieval_korea_goryeo": {
        "id": "medieval_korea_goryeo",
        "name": "🏺 Goryeo Dynasty Korea & Lotus Celadon (c. 918 – 1392 CE)",
        "short_name": "Goryeo Korea",
        "span": "c. 918 – 1392 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Exquisite inlaid jade celadon pottery, Buddhist mountain monasteries, gold-painted silk sutras, flowing high-waisted hanbok with wide sleeves, pine-scented mountain courtyards.",
        "tech": "Movable metal type printing (pre-Gutenberg Jikji), intricate inlaid celadon (sanggam), Tripitaka Koreana 80,000 woodblock carvings.",
        "social_codes": "State-sponsored Buddhist court rituals, powerful aristocratic clans, female property inheritance and remarriage freedom, military regime struggles.",
        "names": ["Queen Sinjeong", "Seonhui", "Bora", "Eunji", "Hyejin", "Minji", "Yeonhwa", "Sunhee"],
        "titles": [
            "The Goryeo Celadon Atelier Mistress", "The Mountain Temple Sutra Scribe", "The Royal Palace Lady",
            "The Silk Trade Merchant's Consort", "The Aristocratic Clan Matron"
        ],
        "tags": ["Goryeo Dynasty", "Korean Celadon", "Jikji & Metal Type", "Buddhist Court", "Medieval Korea"]
    },
    "medieval_korea_joseon": {
        "id": "medieval_korea_joseon",
        "name": "📜 Early Joseon Dynasty & Hangul Dawn (c. 1392 – 1500 CE)",
        "short_name": "Early Joseon Korea",
        "span": "c. 1392 – 1500 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Clean wooden architecture of Gyeongbokgung Palace, white porcelain jars, scholar horsehair hats (gat), newly promulgated Hangul alphabet characters, scholarly study courtyards.",
        "tech": "Rain gauges (cheugugi), water clocks, sundials, Hangul phonetic alphabet creation by King Sejong, cast bronze printing type.",
        "social_codes": "Strict Neo-Confucian patriarchal propriety, separation of men and women's quarters (sarangbang and anbang), yangban noble family duty, filial piety.",
        "names": ["Hwang Jini", "Shin Saimdang", "Insu", "Hyegyeong", "Sojin", "Yoonhee", "Dami", "Jiyeon"],
        "titles": [
            "The Yangban Scholar's Respected Wife", "The Palace Anbang Lady", "The Hangul Calligrapher & Artist",
            "The Royal Astronomical Bureau Consort", "The Tea Garden Gentlewoman"
        ],
        "tags": ["Joseon Dynasty", "Hangul Creation", "Yangban Nobles", "Neo-Confucian Etiquette", "Medieval Korea"]
    },

    # --- South Asia & Africa ---
    "medieval_india_delhi_sultanate": {
        "id": "medieval_india_delhi_sultanate",
        "name": "🕌 Delhi Sultanate & Indo-Islamic Courts (c. 1206 – 1526 CE)",
        "short_name": "Delhi Sultanate",
        "span": "c. 1206 – 1526 CE",
        "category": "Medieval",
        "region": "South Asia",
        "aesthetic": "Red sandstone Qutb Minar, lattice stone jali screens, scented rosewater fountains, heavy gold zardozi embroidered silks, jewel-hilted talwar swords, mango groves.",
        "tech": "Persian wheel irrigation, spinning wheel textile technology, papermaking, dome and arch masonry, wootz crucible steel.",
        "social_codes": "Turco-Afghan court nobility, Sufi musical qawwali traditions, purdah court seclusion protocols, fierce warrior honor, lavish royal durbars.",
        "names": ["Razia Sultan", "Malika", "Zainab", "Gulbadan", "Mehrunissa", "Rukhsana", "Shahzadi", "Mumtaz"],
        "titles": [
            "The Sovereign Sultana of Delhi", "The Red Sandstone Fortress Lady", "The Royal Zardozi Embroiderer",
            "The Talwar Master's Proud Companion", "The Sufi Shrine Benefactress"
        ],
        "tags": ["Delhi Sultanate", "Razia Sultan", "Qutb Minar & Silk", "Talwar & Jali", "Medieval India"]
    },
    "medieval_india_chola": {
        "id": "medieval_india_chola",
        "name": "🛕 Imperial Chola Empire & Maritime South (c. 848 – 1279 CE)",
        "short_name": "Imperial Chola",
        "span": "c. 848 – 1279 CE",
        "category": "Medieval",
        "region": "South Asia",
        "aesthetic": "Granite Brihadisvara Temple soaring into the sky, lost-wax bronze sculptures of dancing Shiva, fragrant jasmine garlands, temple dancer silk saris, ocean armada sails.",
        "tech": "Lost-wax bronze casting perfection, mammoth granite dry-masonry construction, oceanic naval navigation across Bay of Bengal, agricultural tank irrigation.",
        "social_codes": "Temple-centered village self-governance (sabhas), royal devadasis respected artistic status, naval trade guild dominance, Shaivite devotional poetry.",
        "names": ["Kundavai", "Sembiyan Mahadevi", "Vanamadevi", "Lokamahadevi", "Meenakshi", "Ponnazhagi", "Kalyani"],
        "titles": [
            "The Chola Royal Princess & Stateswoman", "The Great Temple Bronze Sculptress", "The Bay of Bengal Naval Admiral's Wife",
            "The Jasmine Courtyard Lady", "The Spice Guild Benefactress"
        ],
        "tags": ["Chola Empire", "Brihadisvara Granite", "Bronze & Jasmine", "Maritime Navy", "Medieval South India"]
    },
    "medieval_mali_empire": {
        "id": "medieval_mali_empire",
        "name": "👑 Mali Empire & Golden Timbuktu (c. 1235 – 1400 CE)",
        "short_name": "Mali Empire",
        "span": "c. 1235 – 1400 CE",
        "category": "Medieval",
        "region": "Africa & Global",
        "aesthetic": "Sun-baked earth mosque of Djinguereber, camel caravans laden with rock salt and pure gold dust, indigo-dyed cotton boubous, gold filigree necklaces, Niger river canoes.",
        "tech": "Sudano-Sahelian earthen architecture, gold metallurgy, trans-Saharan caravan logistics, astronomical and legal manuscript libraries of Timbuktu.",
        "social_codes": "Mansa Musa royal generosity, griot oral historian caste preservation of epics (Sundiata), Islamic scholarship honors, matrilineal lineage respect in trade.",
        "names": ["Kankou", "Sogolon", "Aminata", "Fatoumata", "Nyalen", "Aissa", "Bintou", "Mariam"],
        "titles": [
            "The Mansa's Royal Gold Chatelaine", "The Timbuktu Manuscript Scribe", "The Trans-Saharan Caravan Partner",
            "The Griot Oral Historian Lady", "The Indigo Dyer Queen of Djenne"
        ],
        "tags": ["Mali Empire", "Mansa Musa", "Timbuktu Manuscripts", "Gold & Salt Caravans", "Medieval Africa"]
    },

    # --- Pre-Columbian Americas ---
    "medieval_aztec_tenochtitlan": {
        "id": "medieval_aztec_tenochtitlan",
        "name": "🦅 Aztec Empire — Tenochtitlan & The Sun (c. 1325 – 1521 CE)",
        "short_name": "Aztec Empire",
        "span": "c. 1325 – 1521 CE",
        "category": "Medieval",
        "region": "Americas",
        "aesthetic": "Glistening island city of Tenochtitlan on Lake Texcoco, great stone pyramid Templo Mayor, iridescent quetzal feather headdresses, obsidian razor-blades, floating chinampa gardens.",
        "tech": "Floating island agriculture (chinampas), obsidian stoneworking, causeway dyke engineering, pictographic bark paper codices, herbal pharmacology.",
        "social_codes": "Flowery war warrior status (Eagle and Jaguar knights), solar cosmic debt sacrifice, calmecac noble schools, strict calm moral household discipline.",
        "names": ["Atotoztli", "Ilancueitl", "Tecuichpo", "Miahuaxochitl", "Xiloxoch", "Huitzilxochtzin", "Papantzin"],
        "titles": [
            "The High Priestess of Quetzalcoatl", "The Eagle Warrior's Fierce Wife", "The Floating Garden Chinampa Mistress",
            "The Featherwork Guild Artisan", "The Tenochtitlan Royal Lady"
        ],
        "tags": ["Aztec Empire", "Tenochtitlan", "Quetzal Feathers & Obsidian", "Chinampas", "Pre-Columbian Americas"]
    },
    "medieval_inca_andes": {
        "id": "medieval_inca_andes",
        "name": "☀️ Inca Empire — Cusco & The Sun Road (c. 1438 – 1532 CE)",
        "short_name": "Inca Empire",
        "span": "c. 1438 – 1532 CE",
        "category": "Medieval",
        "region": "Americas",
        "aesthetic": "Seamless mortarless stone palaces of Cusco, emerald mountain agricultural terraces hanging in cloud mist, llama caravans, brightly dyed alpaca wool tunics, golden solar discs.",
        "tech": "Seismic-resistant polygonal stone masonry, suspension rope bridges, quipu knotted-string accounting, freeze-dried potato storage (chuno), paved mountain road network.",
        "social_codes": "Mita communal labor reciprocity, Sapa Inca divine solar descent, Chosen Women (Acllacuna) sacred weaving, communal ayllu loyalty.",
        "names": ["Mama Ocllo", "Kusi Chimpu", "Chimpu Ocllo", "Rahua Ocllo", "Iskay", "Chasca", "Sayri", "Urpi"],
        "titles": [
            "The Chosen Woman of the Sun (Aclla)", "The Imperial Quipu Reader's Wife", "The Royal Alpaca Weaver Queen",
            "The Terraced Mountain Fortress Lady", "The Cusco Royal Coya"
        ],
        "tags": ["Inca Empire", "Cusco & Andes", "Quipu & Alpaca", "Inti Sun Temple", "Pre-Columbian Americas"]
    },

    # ==========================================
    # RENAISSANCE & EARLY MODERN
    # ==========================================
    "italian_renaissance": {
        "id": "italian_renaissance",
        "name": "🎨 Italian Renaissance (c. 1450 – 1550 CE)",
        "short_name": "Italian Renaissance",
        "span": "c. 1450 – 1550 CE",
        "category": "Renaissance",
        "region": "Mediterranean",
        "aesthetic": "Frescoed Florence palazzos, Venetian grand canals with velvet gondolas, pearls woven in golden braids, slashed silk doublets, lute serenades, masquerade half-masks.",
        "tech": "Oil painting mastery, perspective geometry, mechanical clock towers, movable type printing press, blast furnaces, navigational astrolabes.",
        "social_codes": "Medici merchant prince rivalry, humanist academy debates, illicit palazzo trysts, poisonous court rivalries, lavish dowry arrangements.",
        "names": ["Contessa Giuliana", "Bianca", "Lucrezia", "Vittoria", "Alessandra", "Isabella", "Caterina", "Fiorella"],
        "titles": [
            "The Venetian Merchant Heiress", "The Florentine Patron's Muse", "The Medici Court Companion",
            "The Master Painter's Model & Wife", "The Masquerade Siren"
        ],
        "tags": ["Italian Renaissance", "Venice & Florence", "Medici Splendor", "Humanism & Art", "Early Modern"]
    },
    "tudor_elizabethan": {
        "id": "tudor_elizabethan",
        "name": "👑 Tudor & Elizabethan England (c. 1485 – 1603 CE)",
        "short_name": "Tudor & Elizabethan",
        "span": "c. 1485 – 1603 CE",
        "category": "Renaissance",
        "region": "British Isles",
        "aesthetic": "Half-timbered manor houses, stiff starched lace ruffs, velvet farthingales encrusted with pearls, wax-sealed royal warrants, Globe theatre playhouses, falconry lawns.",
        "tech": "Early printed books, cast iron cannons, rapiers, galleon warships, mechanical pocket dials, alchemy workshops.",
        "social_codes": "Royal court patronage, constant fear of the Tower of London treason, Protestant-Catholic religious espionage, witty sonnet courtship.",
        "names": ["Lady Anne", "Lettice", "Margery", "Dorothy", "Ursula", "Bess", "Katherine", "Thomasina"],
        "titles": [
            "The Queen's Maid of Honour", "The Royal Privateer's Wife", "The Manor Chatelaine",
            "The Disgraced Courtier's Consort", "The Alchemist's Clever Daughter"
        ],
        "tags": ["Tudor Era", "Elizabethan England", "Court Intrigue", "Starched Ruffs & Sonnets", "Early Modern"]
    },
    "golden_age_of_sail": {
        "id": "golden_age_of_sail",
        "name": "⚓ Golden Age of Piracy & Sail (c. 1650 – 1730 CE)",
        "short_name": "Age of Sail",
        "span": "c. 1650 – 1730 CE",
        "category": "Renaissance",
        "region": "Americas",
        "aesthetic": "Three-masted wooden frigates pitching in squalls, canvas sails, tarred rigging, flintlock pistols, brass spyglasses, Caribbean port taverns, sea-chest maps.",
        "tech": "Flintlock muskets & cutlasses, naval broadside cannons, quadrant & sextant navigation, cooperage, tallow candles.",
        "social_codes": "Shipboard Pirate Code democracy, colonial governor despotism, admiralty court hangings, privateer letters of marque, naval flogging discipline.",
        "names": ["Anne", "Mary", "Cassandra", "Eliza", "Morgan", "Cordelia", "Grace", "Penelope", "Maeve"],
        "titles": [
            "The Quartermaster's Fierce Partner", "The Port Royal Tavern Mistress", "The Governor's Rebellious Daughter",
            "The Disguised Powder Monkey", "The Caribbean Smuggler Queen"
        ],
        "tags": ["Age of Sail", "Golden Age of Piracy", "High Seas", "Flintlock & Cutlass", "Colonial Caribbean"]
    },

    # ==========================================
    # ENLIGHTENMENT & REVOLUTIONS
    # ==========================================
    "baroque_enlightenment": {
        "id": "baroque_enlightenment",
        "name": "🕯️ Enlightenment & Versailles Baroque (c. 1715 – 1789 CE)",
        "short_name": "Baroque Enlightenment",
        "span": "c. 1715 – 1789 CE",
        "category": "Enlightenment",
        "region": "Western Europe",
        "aesthetic": "Hall of Mirrors Versailles splendor, powdered towering periwigs, pastel silk pannier gowns, scented beauty patches, dueling rapiers, harpsichord salon nocturnes.",
        "tech": "Seed drills, hot air balloons, mercury thermometers, flintlock dueling pistols, cast glass mirrors, porcelain manufactories.",
        "social_codes": "Philosophical salon salons of Voltaire, libertine seduction games, strict royal lever/coucher court rituals, duels at dawn for honor.",
        "names": ["Madame Vivienne", "Émilie", "Séraphine", "Henriette", "Thérèse", "Charlotte", "Amélie", "Victoire"],
        "titles": [
            "The Salon Philosophe & Hostess", "The Versailles Lady-in-Waiting", "The Aristocratic Libertine",
            "The Royal Astronomer's Wife", "The Opera House Prima Donna"
        ],
        "tags": ["Age of Enlightenment", "Versailles Baroque", "Salons & Powder", "Libertine Court", "18th Century"]
    },
    "regency_napoleonic": {
        "id": "regency_napoleonic",
        "name": "🎩 Regency & Napoleonic Era (c. 1795 – 1837 CE)",
        "short_name": "Regency Era",
        "span": "c. 1795 – 1837 CE",
        "category": "Enlightenment",
        "region": "British Isles",
        "aesthetic": "Empire-waist muslin gowns with ribbons, brass-buttoned tailcoats with neckcloth cravats, horse-drawn curricles, Mayfair ballrooms, pianofortes, letter seal wax.",
        "tech": "Steam pumping engines, early gas lighting in cities, semaphore telegraph towers, lithography, percussion caps.",
        "social_codes": "The London 'Season' marriage market, Almack's ball exclusivity, strict chaperone rules, country estate entails, decorous yet biting gossip.",
        "names": ["Miss Clara", "Marianne", "Lydia", "Georgiana", "Emmeline", "Harriet", "Sophia", "Juliet", "Camilla"],
        "titles": [
            "The Inconvenient Regency Heiress", "The Officer's Impoverished Sister", "The Wallflower with a Sharp Tongue",
            "The Country Vicar's Daughter", "The Duke's Headstrong Ward"
        ],
        "tags": ["Regency Era", "Jane Austen Vibe", "The London Season", "Empire Gowns & Cravats", "19th Century"]
    },

    # ==========================================
    # VICTORIAN, INDUSTRIAL & FRONTIER
    # ==========================================
    "victorian_era": {
        "id": "victorian_era",
        "name": "🕰️ Victorian Era — Gaslamp & Industrial (c. 1837 – 1901 CE)",
        "short_name": "Victorian Era",
        "span": "c. 1837 – 1901 CE",
        "category": "Victorian",
        "region": "British Isles",
        "aesthetic": "Gaslamp cobblestone streets, dense yellow pea-soup fog, horse-drawn hansom cabs, corset stays and heavy crinolines, velvet parlors, ticking pocket watches, mourning jewelry.",
        "tech": "Steam railways, electric telegraph, daguerreotype photography, incandescent light bulbs, sewing machines, transatlantic telegraph cables.",
        "social_codes": "Rigid social propriety, angel-in-the-house domestic expectations, formal calling cards, unyielding chaperone protocols, scandalous unspoken desires.",
        "names": ["Victoria", "Cordelia", "Beatrice", "Gwendolen", "Agnes", "Florence", "Mabel", "Edith", "Rowena"],
        "titles": [
            "The Industrialist's Demanding Daughter", "The Melancholic Governess", "The Gaslamp Society Matron",
            "The Parlor Spiritualist Medium", "The Rebellious Lady Botanist"
        ],
        "tags": ["Victorian Era", "Gaslamp & Fog", "Industrial Revolution", "Parlor Propriety", "19th Century"]
    },
    "wild_west_frontier": {
        "id": "wild_west_frontier",
        "name": "🏜️ American Wild West & Frontier (c. 1860 – 1895 CE)",
        "short_name": "Wild West Frontier",
        "span": "c. 1860 – 1895 CE",
        "category": "Victorian",
        "region": "Americas",
        "aesthetic": "Dusty boomtown streets, wooden boardwalks, swinging saloon doors, Colt .45 Peacemaker revolvers, leather boots, oil lanterns, timber cabins, steam locomotive whistles.",
        "tech": "Repeating Winchester rifles, telegraph poles, transcontinental railroad, barbed wire, mechanical windmills, tin-type photos.",
        "social_codes": "Frontier self-reliance, vigilante sheriff law, saloon card table etiquette, mail-order bride arrangements, stubborn homesteader solidarity.",
        "names": ["Cassidy", "Sadie", "Maeve", "Joanna", "Clara", "Willa", "Abigail", "Etta", "Clementine"],
        "titles": [
            "The Homestead Rancher's Wife", "The Saloon Pianist & Card Sharp", "The Mail-Order Bride",
            "The Town Marshal's Sister", "The Frontier Outpost Healer"
        ],
        "tags": ["Wild West", "American Frontier", "Saloons & Revolvers", "Boomtown & Rail", "19th Century"]
    },
    "belle_epoque_edwardian": {
        "id": "belle_epoque_edwardian",
        "name": "🥂 Belle Époque & Edwardian Era (c. 1890 – 1914 CE)",
        "short_name": "Belle Époque / Edwardian",
        "span": "c. 1890 – 1914 CE",
        "category": "Victorian",
        "region": "Western Europe",
        "aesthetic": "Art Nouveau sinuous ironwork, Parisian grand boulevards, sweeping feather hats, crystal champagne flutes, gramophone waltzes, Grand Tour luxury steamships.",
        "tech": "Early automobiles, gramophone records, silent cinema, electric trams, ocean liners (Titanic era), early wireless radio.",
        "social_codes": "Decadent high society summer house parties, Bohemian Montmartre artist salons, early suffragette sparks, opulent aristocratic twilight.",
        "names": ["Genevieve", "Colette", "Margot", "Sylvia", "Vivienne", "Adele", "Evelyn", "Blanche", "Rosamund"],
        "titles": [
            "The Edwardian Country House Hostess", "The Parisian Cabaret Muse", "The Suffragette Heiress",
            "The Transatlantic Ocean Liner Socialite", "The Bohemian Studio Sculptor"
        ],
        "tags": ["Belle Époque", "Edwardian Era", "Art Nouveau", "Grand Tour Splendor", "Pre-War Glamour"]
    },

    # ==========================================
    # 20TH CENTURY HISTORICAL DECADES
    # ==========================================
    "roaring_twenties": {
        "id": "roaring_twenties",
        "name": "🎷 Roaring Twenties & Jazz Age (1920 – 1929 CE)",
        "short_name": "Roaring Twenties",
        "span": "1920 – 1929 CE",
        "category": "20th Century",
        "region": "Americas",
        "aesthetic": "Art Deco chrome and black lacquer, underground speakeasy eye-slots, fringed flapper dresses, jazz trumpets, cigarette holders, sleek Duesenbergs and Packards.",
        "tech": "Commercial radio broadcasting, sound cinema (talkies), mass-produced automobiles (Ford Model T), consumer refrigerators, electric phonographs.",
        "social_codes": "Prohibition law defiance, bootleg mob syndicates, fast money and stock speculation, bobbed hair female rebellion, Charleston dancing abandon.",
        "names": ["Roxie", "Daisy", "Zelda", "Vivian", "Evelyn", "Lola", "Bernice", "Lorelei", "Maxine"],
        "titles": [
            "The Speakeasy Torch Singer", "The Bootleg Syndicate Consort", "The Rebellious Flapper Socialite",
            "The Jazz Club Pianist", "The Gilded Penthouse Siren"
        ],
        "tags": ["Roaring Twenties", "Jazz Age", "Speakeasies & Flappers", "Art Deco Glamour", "Prohibition Era"]
    },
    "noir_interwar_1940s": {
        "id": "noir_interwar_1940s",
        "name": "🕵️ 1940s Film Noir & Wartime (1939 – 1949 CE)",
        "short_name": "1940s Film Noir",
        "span": "1939 – 1949 CE",
        "category": "20th Century",
        "region": "Americas",
        "aesthetic": "Rain-slicked city pavement under neon signs, venetian blind shadows on frosted glass, trench coats and tilted fedoras, heavy Bakelite rotary phones, smoke rings, swing bands.",
        "tech": "Radar, jet engines, vacuum-tube computers (ENIAC), shortwave radio, nylon stockings, submachine guns.",
        "social_codes": "Hardboiled post-war cynicism, wartime rationing solidarity, femme fatale double-crosses, underworld marker debts, dry sardonic repartee.",
        "names": ["Veronica", "Rita", "Gloria", "Nadia", "Mona", "Loretta", "Stella", "Ingrid", "Bette"],
        "titles": [
            "The Hard-Boiled Detective's Secretary", "The High-Stakes Femme Fatale", "The Wartime Resistance Courier",
            "The Smoke-Filled Lounge Singer", "The Black Market Logistics Queen"
        ],
        "tags": ["1940s Noir", "Wartime Era", "Rain & Trench Coats", "Femme Fatale", "Hardboiled Mid-Century"]
    },
    "fifties_midcentury": {
        "id": "fifties_midcentury",
        "name": "📻 1950s Mid-Century & Atomic Age (1950 – 1959 CE)",
        "short_name": "1950s Atomic Age",
        "span": "1950 – 1959 CE",
        "category": "20th Century",
        "region": "Americas",
        "aesthetic": "Chrome and neon diners, pastel convertibles with tailfins, vinyl jukeboxes, atomic boomerang patterns, poodle skirts, black and white TV sets, white picket fences.",
        "tech": "Transistor radios, color television, commercial jetliners, polio vaccine, microwave ovens, backyard bomb shelters.",
        "social_codes": "Suburban domestic perfectionism, rigid traditional gender roles, Cold War nuclear drills, hidden marital discontent, early rock and roll rebellion.",
        "names": ["Betty", "Peggy", "Donna", "Connie", "Judy", "Nancy", "Shirley", "Dorothy", "Brenda"],
        "titles": [
            "The Picket Fence Perfectionist Wife", "The Drive-In Diner Rebel", "The Madison Avenue Ad Agency Girl",
            "The Nuclear Physicist's Restless Wife", "The Jukebox Queen"
        ],
        "tags": ["1950s Mid-Century", "Atomic Age", "Chrome & Pastel", "Suburban Domestic", "Mid-Century Modern"]
    },
    "seventies_coldwar": {
        "id": "seventies_coldwar",
        "name": "📼 1960s–70s Cold War Espionage & Disco (1965 – 1979 CE)",
        "short_name": "1970s Cold War / Retro",
        "span": "1965 – 1979 CE",
        "category": "20th Century",
        "region": "Central Europe",
        "aesthetic": "Analog reel-to-reel audio tape, smoke-fogged embassy corridors, shag carpets, corduroy jackets with wide collars, discotheque mirror balls, muscle cars, rotary phones.",
        "tech": "Cassette tapes, Concorde supersonic flight, microprocessors, lunar landers, 8-track players, 35mm film cameras.",
        "social_codes": "Cold War KGB/CIA paranoia, double-agent loyalties, counterculture revolution, cynical realpolitik, women's liberation movement.",
        "names": ["Valerie", "Svetlana", "Brigitte", "Tessa", "Diane", "Sabrina", "Faye", "Gwen", "Elena"],
        "titles": [
            "The Embassy Cultural Attaché / Spy", "The Vinyl Record Producer", "The Cold War Safehouse Keeper",
            "The Discotheque VIP Mistress", "The Investigative Journalist"
        ],
        "tags": ["Cold War Espionage", "1970s Retro", "Reel-to-Reel & Tape", "Discotheque Nights", "Late 20th Century"]
    },
    "eighties_retro": {
        "id": "eighties_retro",
        "name": "🕹️ 1980s Neon Retro & Cassette Futurism (1980 – 1989 CE)",
        "short_name": "1980s Neon Retro",
        "span": "1980 – 1989 CE",
        "category": "20th Century",
        "region": "Americas",
        "aesthetic": "Magenta and electric cyan neon, cassette Walkmans, CRT arcade cabinets, synthesizer basslines, shoulder-padded blazers, mall food courts, VHS video grain.",
        "tech": "Personal computers (Apple II, Commodore 64), Sony Walkman, VHS camcorders, cellular car phones, arcade machines, MIDI synths.",
        "social_codes": "Wall Street consumerist ambition, yuppie status fitness craze, MTV pop stardom culture, Cold War twilight, synthwave escapism.",
        "names": ["Kelly", "Tiffany", "Heather", "Amber", "Courtney", "Samantha", "Brooke", "Stephanie", "Mallory"],
        "titles": [
            "The Wall Street Executive Consort", "The Neon Aerobics Studio Owner", "The Arcade Champion & Synth Fanatic",
            "The Corporate Power Broker", "The Video Tape Store Rebel"
        ],
        "tags": ["1980s Retro", "Neon & Synthwave", "Cassette Futurism", "Wall Street & Arcades", "Late 20th Century"]
    },
    "nineties_grunge_y2k": {
        "id": "nineties_grunge_y2k",
        "name": "💾 1990s Grunge & Pre-Y2K Dawn (1990 – 1999 CE)",
        "short_name": "1990s Grunge / Y2K",
        "span": "1990 – 1999 CE",
        "category": "20th Century",
        "region": "Americas",
        "aesthetic": "Tied flannel shirts, Doc Martens boots, screeching 56k dial-up modems, CRT beige towers, industrial warehouse raves, disposable cameras, CD jewel cases, coffeehouse poetry.",
        "tech": "World Wide Web (dial-up), pager beepers, CD-ROMs, floppy disks, Game Boy, early digital cameras, chatrooms (IRC/AOL).",
        "social_codes": "Gen-X anti-corporate cynicism, indie rebellion, cyber-utopian optimism vs Y2K panic, riot grrrl female empowerment, grunge aesthetics.",
        "names": ["Chloe", "Fiona", "Gwen", "Raven", "Skye", "Tara", "Autumn", "Zoe", "Daria"],
        "titles": [
            "The Independent Zine Publisher", "The Cyber-Cafe Sysadmin", "The Grunge Band Bassist",
            "The Early Dot-Com Web Developer", "The Industrial Loft Artist"
        ],
        "tags": ["1990s Grunge", "Y2K Dawn", "Dial-Up & Flannel", "Gen-X Indie", "Late 20th Century"]
    },

    # ==========================================
    # ADDITIONAL COUNTRY-SPECIFIC MEDIEVAL & HISTORIC ERAS
    # ==========================================
    "medieval_viking_scandinavia": {
        "id": "medieval_viking_scandinavia",
        "name": "🛡️ Viking Age Scandinavia & Norse Jarls (c. 793 – 1066 CE)",
        "short_name": "Viking Scandinavia",
        "span": "c. 793 – 1066 CE",
        "category": "Medieval",
        "region": "Western Europe",
        "aesthetic": "Carved dragon-prow longships cutting through foggy fjords, smoky turf longhouses lit by peat fires, woven wool cloaks clasped with silver brooches, runestones carved in granite, mead horns, roaring hearths.",
        "tech": "Clinker-built wooden longships, pattern-welded iron swords, round wooden shields with iron bosses, bearded battle-axes, riveted chainmail, bone combs, runic script. No plate armor, no crossbows, no parchment codices.",
        "social_codes": "Thing assemblies of freemen, blood-feuds resolved by weregild, strict hospitality laws, shieldmaiden honor, loyalty to the Jarl, sworn oaths on silver arm-rings.",
        "names": ["Astrid", "Sigrid", "Freydis", "Gunnhild", "Thora", "Helga", "Ragnfrid", "Yrsa", "Brynhild"],
        "titles": [
            "The Jarl's Shieldmaiden Consort", "The Völva Seeress of the Hearth", "The Chieftain's Proud Daughter",
            "The North Sea Raider's Wife", "The Fjord Longhouse Mistress"
        ],
        "tags": ["Viking Age", "Norse Jarls", "Longships & Fjords", "Shieldmaidens & Runes", "Early Medieval", "Scandinavia"]
    },
    "medieval_wales_marches": {
        "id": "medieval_wales_marches",
        "name": "🏹 Medieval Wales & The Marcher Lordships (c. 1066 – 1400 CE)",
        "short_name": "Medieval Wales",
        "span": "c. 1066 – 1400 CE",
        "category": "Medieval",
        "region": "British Isles",
        "aesthetic": "Mist-shrouded Snowdonia peaks, slate-roofed stone keeps, deep oak valleys, Welsh harpists playing in mountain halls, rain-lashed border march castles, yew-wood war bows.",
        "tech": "Famous Welsh yew longbows, chainmail hauberks, spears, short hunting swords, mountain fortresses (castell), horse-breeding. No plate armor, no cannons.",
        "social_codes": "Cyfraith Hywel (Welsh legal codes), passionate bardic praise and satires, fierce clan independence, defiance of Norman Marcher Barons.",
        "names": ["Gwenllian", "Angharad", "Elen", "Branwen", "Nest", "Rhiannon", "Carys", "Morfydd"],
        "titles": [
            "The Mountain Chieftain's Consort", "The Marcher Lord's Captive Heiress", "The Bard's Muse of Snowdonia",
            "The Welsh Prince's Rebel Sister"
        ],
        "tags": ["Medieval Wales", "Snowdonia", "Welsh Longbow", "Marcher Lords", "Celtic Medieval", "Wales"]
    },
    "medieval_swiss_confederacy": {
        "id": "medieval_swiss_confederacy",
        "name": "🏔️ Old Swiss Confederacy & Mountain Cantons (c. 1291 – 1500 CE)",
        "short_name": "Swiss Confederacy",
        "span": "c. 1291 – 1500 CE",
        "category": "Medieval",
        "region": "Central Europe",
        "aesthetic": "Snow-capped Alpine valleys, rugged timber chalets, stone mountain passes (St. Gotthard), ringing cowbells, roaring torrents, heavy iron-pointed pikes and halberds.",
        "tech": "Halberds, 18-foot infantry pikes, crossbows, iron kettle-hat helmets, leather jacks, mountain fortifications. Early firearms appearing only at the very end.",
        "social_codes": "Egalitarian cantonal oath-fraternities (Eidgenossenschaft), fierce collective defense against Habsburg imperial nobility, stubborn communal self-governance.",
        "names": ["Heidi", "Verena", "Anna", "Adelheid", "Margaretha", "Katharina", "Ursula", "Elisabeth"],
        "titles": [
            "The Canton Elder's Dutiful Daughter", "The Alpine Fortress Keeper", "The Halberdier Commander's Consort",
            "The Mountain Pass Innkeeper"
        ],
        "tags": ["Swiss Cantons", "Alpine Mountain Passes", "Halberds & Crossbows", "Eidgenossenschaft", "Late Medieval", "Switzerland"]
    },
    "medieval_hungary_corvinus": {
        "id": "medieval_hungary_corvinus",
        "name": "🦅 Kingdom of Hungary & The Black Army (c. 1000 – 1490 CE)",
        "short_name": "Medieval Hungary",
        "span": "c. 1000 – 1490 CE",
        "category": "Medieval",
        "region": "Eastern Europe",
        "aesthetic": "Gothic Buda Castle perched above the Danube, Carpathian mountain strongholds, Renaissance courtiers mixing with nomadic steppe horsemen, heavy silk banners with the raven of Corvinus.",
        "tech": "Crossbows, early matchlock arquebuses of the Black Army (Fekete Sereg), plate armor, heavy hussar lances, Danube river barges, stone bastions.",
        "social_codes": "Saint Stephen's crown loyalty, proud Hungarian noble diets (Régiség), chivalric crusader duty defending Christendom against eastern expansion.",
        "names": ["Ilona", "Erzsebet", "Katalin", "Margit", "Borbala", "Agnes", "Dorottya", "Kinga"],
        "titles": [
            "The Carpathian Castellan's Lady", "The Black Army Captain's Consort", "The Noble Diet Heiress",
            "The Danube River Fortress Mistress"
        ],
        "tags": ["Kingdom of Hungary", "Danube Strongholds", "Black Army", "Matthias Corvinus", "Late Medieval", "Hungary"]
    },
    "medieval_portugal_reconquista": {
        "id": "medieval_portugal_reconquista",
        "name": "⚓ Medieval Kingdom of Portugal & Order of Avis (c. 1139 – 1415 CE)",
        "short_name": "Medieval Portugal",
        "span": "c. 1139 – 1415 CE",
        "category": "Medieval",
        "region": "Mediterranean",
        "aesthetic": "Atlantic ocean winds whipping against battlements of Guimarães and Sintra, olive groves, monastic convents of Tomar, azulejo tile dawn, pine forests supplying future ship timber.",
        "tech": "Iron swords, crossbows, mail hauberks, coastal cogs and early lateen caravels, astrolabes, portolan charts.",
        "social_codes": "Knighthood of Avis and Christ, reconquista crusader vows, maritime exploration fervor, seafaring independence from Castilian crowns.",
        "names": ["Beatriz", "Constança", "Inês", "Leonor", "Teresa", "Filipa", "Mafalda", "Guiomar"],
        "titles": [
            "The Knight Commander's Consort", "The Atlantic Coast Castellan's Heiress", "The Monastery Scribe",
            "The Port Guildmaster's Daughter"
        ],
        "tags": ["Kingdom of Portugal", "Order of Avis", "Atlantic Medieval", "Reconquista", "Early Sail", "Portugal"]
    },
    "medieval_ethiopia_solomonic": {
        "id": "medieval_ethiopia_solomonic",
        "name": "👑 Solomonic Ethiopian Empire & Lalibela (c. 1270 – 1550 CE)",
        "short_name": "Solomonic Ethiopia",
        "span": "c. 1270 – 1550 CE",
        "category": "Medieval",
        "region": "Africa & Global",
        "aesthetic": "Monolithic rock-hewn churches of Lalibela carved into volcanic tuff, mountain amba fortress plateaus, illuminated Ge'ez gospel parchments, brass ceremonial crosses, incense burners.",
        "tech": "Iron spearheads, curved shotel swords, leather hide shields, volcanic stone masonry, terraced mountain irrigation. No gunpowder, no printing.",
        "social_codes": "Kebra Nagast imperial lineage, devotion to the Ethiopian Orthodox Tewahedo Church, strict royal court protocol of the travelling royal camp (katama).",
        "names": ["Eheni", "Yodit", "Eleni", "Masqal-Kebra", "Bati", "Saba", "Amata-Giyorgis"],
        "titles": [
            "The Royal Amba Princess", "The Court Chronicler's Heiress", "The Sacred Monastery Benefactress",
            "The Highland Viceroy's Daughter"
        ],
        "tags": ["Solomonic Empire", "Lalibela Rock Churches", "Ethiopian Highlands", "Ge'ez Script", "Medieval Africa", "Ethiopia"]
    },
    "medieval_swahili_kilwa": {
        "id": "medieval_swahili_kilwa",
        "name": "💎 Swahili Coast & Kilwa Sultanate (c. 1000 – 1500 CE)",
        "short_name": "Swahili Coast & Kilwa",
        "span": "c. 1000 – 1500 CE",
        "category": "Medieval",
        "region": "Africa & Global",
        "aesthetic": "Multi-story coral rag stone palaces with vaulted domes, Indian Ocean turquoise waters, monsoon trade dhows with billowing triangular sails, fine porcelain imported from China, cloves and ambergris.",
        "tech": "Coral stone lime architecture, oceanic sewn dhows, ironworking, gold minting (Kilwa dinars), cotton weaving.",
        "social_codes": "Cosmopolitan maritime merchant aristocracy, Islamic legal jurisprudence (Qadi courts), hospitality for Indian Ocean traders from Arabia, Persia, and India.",
        "names": ["Mwana", "Fatima", "Rehema", "Amina", "Asha", "Subira", "Zuwena", "Halima"],
        "titles": [
            "The Coral Palace Mistress", "The Dhow Fleet Merchant's Daughter", "The Spice Island Consort",
            "The Pearl Guild Matron"
        ],
        "tags": ["Swahili Coast", "Kilwa Sultanate", "Coral Stone Palaces", "Indian Ocean Monsoon", "Medieval Africa", "East Africa"]
    },
    "medieval_khmer_angkor": {
        "id": "medieval_khmer_angkor",
        "name": "🛕 Khmer Empire & Angkor Wat (c. 802 – 1431 CE)",
        "short_name": "Khmer Angkor",
        "span": "c. 802 – 1431 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Colossal smiling stone faces of the Bayon, massive moat-encircled sandstone temples of Angkor Wat, shimmering baray water reservoirs, golden royal barge flotillas, lotus pools.",
        "tech": "Monumental sandstone block masonry without mortar, hydraulic canal engineering, bronze casting, war elephant howdahs, iron-tipped spears and bows.",
        "social_codes": "Devaraja (God-King) sacred majesty, Hindu-Buddhist syncretic court rituals, royal apsara dancers, reverence for ancestral water engineering.",
        "names": ["Jayarajadevi", "Indradevi", "Kambujarajalakshmi", "Sophea", "Neary", "Bopha", "Channary"],
        "titles": [
            "The Royal Court Apsara", "The Sandstone Temple Priestess", "The Hydraulic Master's Heiress",
            "The Royal Barge Consort"
        ],
        "tags": ["Khmer Empire", "Angkor Wat", "Monumental Sandstone", "God-Kings & Apsaras", "Medieval Southeast Asia", "Cambodia"]
    },
    "medieval_majapahit": {
        "id": "medieval_majapahit",
        "name": "⛵ Majapahit Empire & Spice Seas (c. 1293 – 1527 CE)",
        "short_name": "Majapahit Empire",
        "span": "c. 1293 – 1527 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Red-brick candi gateways rising out of tropical Java, waving wavy-bladed keris daggers, gamelan bronze chimes ringing across court courtyards, fleets of jong warships carrying nutmeg and cloves.",
        "tech": "Giant wooden ocean-going jong vessels, bronze swivel cannons (cetbang), Damascus-style pamor keris forging, terracotta sculpture, irrigated rice terraces.",
        "social_codes": "Royal court hierarchy of Trowulan, oath of unity (Sumpah Palapa), maritime trade tribute, Hindu-Javanese court etiquette.",
        "names": ["Tribhuwana", "Suhita", "Gayatri", "Ken Dedes", "Dyah", "Retno", "Kusuma", "Sekar"],
        "titles": [
            "The Royal Java Princess", "The Fleet Commander's Consort", "The Keris Master's Daughter",
            "The Spice Port Consort"
        ],
        "tags": ["Majapahit Empire", "Java Spice Seas", "Keris & Cetbang", "Candi Gateways", "Medieval Southeast Asia", "Indonesia"]
    },
    "medieval_burma_pagan": {
        "id": "medieval_burma_pagan",
        "name": "🛕 Pagan Kingdom & The Plains of Bagan (c. 1044 – 1287 CE)",
        "short_name": "Pagan Kingdom Bagan",
        "span": "c. 1044 – 1287 CE",
        "category": "Medieval",
        "region": "East Asia",
        "aesthetic": "Vast dry plains of Bagan studded with over ten thousand red-brick pagodas and gilded spires, saffron-robed Theravada monks chanting, Ayeyarwady river teak boats, lacquerware vessels.",
        "tech": "Brick arch and vault temple engineering, bronze casting of monumental Buddha statues, palm-leaf manuscript transcription, war elephants.",
        "social_codes": "Merit-making through pagoda construction, Theravada Buddhist devotion, royal patronage of monastic sanghas, courtly Burmese protocol.",
        "names": ["Saw", "Hla", "May", "Khin", "Thida", "Sandar", "Nu", "Phyu", "Shwe"],
        "titles": [
            "The Pagoda Benefactress", "The Royal Court Scribe's Daughter", "The River Merchant's Consort",
            "The Temple Monastery Patroness"
        ],
        "tags": ["Pagan Kingdom", "Bagan Plains", "Pagodas & Monasteries", "Theravada Devotion", "Medieval Southeast Asia", "Myanmar"]
    },
    "antiquity_minoan_mycenaean": {
        "id": "antiquity_minoan_mycenaean",
        "name": "🏺 Minoan Crete & Bronze Age Greece (c. 1900 – 1100 BCE)",
        "short_name": "Minoan & Mycenaean",
        "span": "c. 1900 – 1100 BCE",
        "category": "Antiquity",
        "region": "Mediterranean",
        "aesthetic": "Multi-story labyrinthine palace of Knossos, vivid frescoes of dolphins and acrobatic bull-leaping, cyclopean stone lion gates of Mycenae, gold burial masks, Aegean olive breezes.",
        "tech": "Cast bronze weapons, boar-tusk helmets, clay tablets in Linear A & Linear B, potter's wheels, copper and tin trade networks. No iron.",
        "social_codes": "Matriarchal snake goddess reverence, palatial redistributive economy, heroic wanax kingship, maritime Aegean trade leagues.",
        "names": ["Ariadne", "Phaedra", "Pasiphaë", "Elektra", "Iphigenia", "Kassandra", "Kallisto"],
        "titles": [
            "The Palace Bull-Leaper", "The Snake Goddess High Priestess", "The Bronze Wanax's Consort",
            "The Aegean Merchant Matron"
        ],
        "tags": ["Minoan Crete", "Knossos Labyrinth", "Mycenaean Bronze Age", "Bull-Leaping & Frescoes", "Classical Antiquity", "Greece"]
    },
    "antiquity_carthage": {
        "id": "antiquity_carthage",
        "name": "⚓ Carthaginian Maritime Republic & Punic Wars (c. 814 – 146 BCE)",
        "short_name": "Carthaginian Republic",
        "span": "c. 814 – 146 BCE",
        "category": "Antiquity",
        "region": "Mediterranean",
        "aesthetic": "Circular military harbor (Kothon) crowded with warships, white-washed Phoenician limestone towers, purple Tyrian dyed robes, merchant warehouses piled with silver and tin, Mediterranean sun.",
        "tech": "Advanced prefabricated quinqueremes and triremes, iron weaponry, catapults, Numidian cavalry tactics, war elephants, navigational chart lore.",
        "social_codes": "Oligarchic Senate and Council of 104, merchant aristocracy dominance, fierce rivalry with Rome, devotion to Tanit and Ba'al Hammon.",
        "names": ["Sophonisba", "Elissa", "Himilce", "Tanit", "Maya", "Arishat", "Batba'al"],
        "titles": [
            "The Kothon Admiral's Consort", "The Merchant Senator's Daughter", "The Sacred Temple Priestess",
            "The Phoenician Trader Heiress"
        ],
        "tags": ["Carthage", "Punic Wars", "Circular Kothon Harbor", "Phoenician Maritime", "Classical Antiquity", "North Africa"]
    },
    "renaissance_safavid_isfahan": {
        "id": "renaissance_safavid_isfahan",
        "name": "🕌 Safavid Persian Empire & Golden Isfahan (c. 1501 – 1722 CE)",
        "short_name": "Safavid Golden Isfahan",
        "span": "c. 1501 – 1722 CE",
        "category": "Renaissance",
        "region": "Middle East",
        "aesthetic": "Breathtaking turquoise and cobalt mosaic tilework of Naqsh-e Jahan square, Grand Bazaar covered arched walkways, Persian miniature paintings of rose gardens and nightingales, silk carpets.",
        "tech": "Matchlock firearms, fine damascus wootz steel shamshir blades, astrolabes, sophisticated dome architecture, silk weaving looms.",
        "social_codes": "Shah's absolute divine-monarchical court, Qizilbash warrior chivalry, poetic high Persian court etiquette, patron-artist salons.",
        "names": ["Parisa", "Shirin", "Soraya", "Niloufar", "Maryam", "Roxana", "Leila", "Anahita"],
        "titles": [
            "The Shah's Rose Garden Consort", "The Miniature Painter's Muse", "The Silk Bazaar Heiress",
            "The Court Astrologer's Daughter"
        ],
        "tags": ["Safavid Empire", "Isfahan Half the World", "Turquoise Tile Domes", "Persian Miniatures", "Renaissance", "Persia", "Iran"]
    },
    "renaissance_mughal_empire": {
        "id": "renaissance_mughal_empire",
        "name": "🦚 Mughal Empire & The Peacock Throne (c. 1526 – 1707 CE)",
        "short_name": "Mughal Imperial India",
        "span": "c. 1526 – 1707 CE",
        "category": "Renaissance",
        "region": "South Asia",
        "aesthetic": "Red sandstone bastions of Agra and Delhi, white marble domes inlaid with semi-precious lapis and jade (pietra dura), scented rosewater fountains, zardozi gold-embroidered velvet robes.",
        "tech": "Composite bows, matchlock muskets, heavy siege cannons, wootz steel talwar swords, astronomical observatories, fine paper illuminated manuscripts.",
        "social_codes": "Darbar imperial audience protocols, Mansabdari noble military ranking, exquisite Persian-Hindustani poetry recitations, zenana court life.",
        "names": ["Mumtaz", "Nur Jahan", "Jahanara", "Roshanara", "Zeb-un-Nissa", "Mehrunissa", "Anarkali"],
        "titles": [
            "The Zenana Imperial Princess", "The Royal Architect's Daughter", "The Court Poetess",
            "The Agra Darbar Favorite"
        ],
        "tags": ["Mughal Empire", "Peacock Throne", "Marble & Pietra Dura", "Red Fort Darbar", "Renaissance South Asia", "India"]
    },
    "renaissance_ottoman_porte": {
        "id": "renaissance_ottoman_porte",
        "name": "🌙 Ottoman Empire — Suleiman & The Sublime Porte (c. 1520 – 1566 CE)",
        "short_name": "Ottoman Sublime Porte",
        "span": "c. 1520 – 1566 CE",
        "category": "Renaissance",
        "region": "Mediterranean",
        "aesthetic": "Domes and minarets of the Süleymaniye Mosque overlooking the Bosphorus, tiled courtyards of Topkapi Palace, Divan council chambers behind gilded grilles, Turkish coffee and iznik ceramics.",
        "tech": "Giant bronze siege bombards, Janissary matchlock muskets, composite recurve bows, Damascus kilij scimitars, naval galleys of Barbarossa.",
        "social_codes": "Kanun imperial legal order under Sultan Suleiman the Magnificent, Janissary corps discipline, Imperial Harem influence, Grand Vizier governance.",
        "names": ["Hurrem", "Mihrimah", "Nurbanu", "Safiye", "Hatice", "Leyla", "Fatma", "Emine"],
        "titles": [
            "The Topkapi Harem Favorite", "The Grand Vizier's Consort", "The Bosphorus Palace Heiress",
            "The Divan Diplomat's Daughter"
        ],
        "tags": ["Ottoman Empire", "Sublime Porte", "Topkapi Palace", "Janissaries & Kanun", "Golden Age", "Turkey", "Istanbul"]
    },
    "enlightenment_scottish": {
        "id": "enlightenment_scottish",
        "name": "📚 Scottish Enlightenment & Edinburgh Closes (c. 1740 – 1800 CE)",
        "short_name": "Scottish Enlightenment",
        "span": "c. 1740 – 1800 CE",
        "category": "Enlightenment",
        "region": "British Isles",
        "aesthetic": "High tenement closes and steep wynds of Old Town Edinburgh, smoky tavern debate societies, leather-bound moral philosophy treatises, pewter tankards of ale, wool tailcoats and cravats.",
        "tech": "Early steam pump models, printing presses, surveying theodolites, microscope lenses, medical dissection theaters.",
        "social_codes": "Passion for debate in the Select Society, moral sentiment and reason (Hume, Adam Smith), clash between Presbyterian tradition and modern science.",
        "names": ["Jean", "Marion", "Alison", "Isobel", "Margaret", "Elspeth", "Kirsty", "Morag"],
        "titles": [
            "The Edinburgh Salon Hostess", "The Professor's Intellectual Consort", "The Publisher's Daughter",
            "The Old Town Tavern Heiress"
        ],
        "tags": ["Scottish Enlightenment", "Edinburgh Old Town", "Philosophy & Science", "Tavern Societies", "18th Century", "Scotland"]
    },
    "victorian_meiji_japan": {
        "id": "victorian_meiji_japan",
        "name": "🚂 Meiji Restoration & Bakumatsu Japan (c. 1868 – 1912 CE)",
        "short_name": "Meiji Restoration Japan",
        "span": "c. 1868 – 1912 CE",
        "category": "Victorian",
        "region": "East Asia",
        "aesthetic": "Gas lamps illuminating Tokyo brick avenues, Western wool frock coats worn over silk haori, steam locomotives rattling alongside rickshaws, cherry blossom petals falling on iron rails.",
        "tech": "Telegraph lines, steam trains, modern bolt-action rifles, print newspapers, industrial textile factories, photography.",
        "social_codes": "Rapid modernization under the Meiji Emperor, abolition of samurai class privileges, struggle between ancient bushido honor and Westernization.",
        "names": ["Kiyo", "Haru", "Shizuka", "Tomi", "Chiyo", "Fumiko", "Kazuko", "Nobuko"],
        "titles": [
            "The Modernizing Tokyo Aristocrat", "The Disillusioned Samurai's Daughter", "The Early Telegraph Pioneer",
            "The Western Silk Merchant's Wife"
        ],
        "tags": ["Meiji Restoration", "Steam & Kimono", "Tokyo Gaslamps", "Bakumatsu Twilight", "Industrializing Asia", "Japan"]
    },
    "victorian_tsarist_russia": {
        "id": "victorian_tsarist_russia",
        "name": "❄️ Late Imperial Russia & St. Petersburg Romanovs (c. 1860 – 1914 CE)",
        "short_name": "Imperial St. Petersburg",
        "span": "c. 1860 – 1914 CE",
        "category": "Victorian",
        "region": "Eastern Europe",
        "aesthetic": "Gilded grand ballrooms of the Winter Palace, snow-choked Nevsky Prospekt traversed by horse-drawn troikas, Fabergé enameled imperial eggs, heavy sable fur stoles, French champagne.",
        "tech": "Trans-Siberian Railway construction, telegraphs, ironclad warships, electric lighting in aristocratic palaces, industrial factories along the Neva.",
        "social_codes": "Autocratic Tsarist court etiquette, French spoken in high society, peasant emancipation tensions, rising underground revolutionary salons.",
        "names": ["Tatiana", "Olga", "Anastasia", "Irina", "Ksenia", "Natalya", "Vera", "Lyudmila"],
        "titles": [
            "The Winter Palace Courtier", "The Grand Duke's Consort", "The Revolutionary Salon Hostess",
            "The Imperial Ballerina"
        ],
        "tags": ["Imperial Russia", "Winter Palace Balls", "St. Petersburg Snow", "Romanov Dynasty", "Late 19th Century", "Russia"]
    },
    "twenties_weimar_berlin": {
        "id": "twenties_weimar_berlin",
        "name": "🎷 Weimar Republic & Berlin Cabaret (1919 – 1933 CE)",
        "short_name": "Weimar Berlin Cabaret",
        "span": "1919 – 1933 CE",
        "category": "20th Century",
        "region": "Central Europe",
        "aesthetic": "Smoky subterranean cabaret clubs with spotlight beams, avant-garde Bauhaus design, decadent nightlife, jazz trumpets, bobbed flapper haircuts, monochrome expressionist cinema posters.",
        "tech": "Electric tramways, rotary telephones, cinema sound recording, radio broadcasting, modern skyscrapers, subways.",
        "social_codes": "Unprecedented artistic and personal freedom, disillusionment with post-WWI order, hyperinflation turbulence, avant-garde expressionism.",
        "names": ["Marlene", "Lotte", "Greta", "Ilse", "Hedwig", "Renate", "Anneliese", "Gerda"],
        "titles": [
            "The Cabaret Chanteuse", "The Bauhaus Architect Consort", "The Avant-Garde Expressionist Painter",
            "The Berlin Journalist"
        ],
        "tags": ["Weimar Republic", "Berlin Cabaret", "Bauhaus & Jazz", "Expressionist Nights", "Interwar Modernity", "Germany"]
    }
}

# =========================================================================
# USER CUSTOM ERAS PERSISTENCE & SEMANTIC SEARCH ENGINE
# =========================================================================

import os
import json
import time
import random
from pathlib import Path
import os
import re
import json
import time
import random
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional, Set

USER_ERAS_FILE = Path(__file__).resolve().parent / "user_eras.json"
ROOT_DATA_EXTENSIONS_DIR = Path(__file__).resolve().parent.parent / "data" / "eras_extensions"


def get_external_user_extension_dir() -> Path:
    """
    Resolves the OS-specific external user data directory for private era extensions:
    - Linux / Unix: ~/.local/share/chargen/eras_extensions (or $XDG_DATA_HOME/chargen/eras_extensions)
    - Windows: %APPDATA%\\CharGen\\eras_extensions (or ~\\AppData\\Roaming\\CharGen\\eras_extensions)
    """
    if sys.platform == "win32" or bool(os.environ.get("APPDATA")):
        appdata = os.environ.get("APPDATA") or str(Path.home() / "AppData" / "Roaming")
        return Path(appdata) / "CharGen" / "eras_extensions"
    else:
        xdg = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
        return Path(xdg) / "chargen" / "eras_extensions"


def get_primary_extension_dir(destination: str = "project_data") -> Path:
    if destination in ("local_user", "user", "external"):
        return get_external_user_extension_dir()
    return ROOT_DATA_EXTENSIONS_DIR


EXTENSION_DIRS = [
    ROOT_DATA_EXTENSIONS_DIR,
    get_external_user_extension_dir(),
    Path(__file__).resolve().parent / "eras_extensions",
    Path(__file__).resolve().parent.parent / "eras_extensions"
]

def load_extension_eras() -> Dict[str, Dict[str, Any]]:
    """Loads modular era extension JSON files from data/eras_extensions/ and idea_generator/eras_extensions/."""
    ext_eras: Dict[str, Dict[str, Any]] = {}
    for d in EXTENSION_DIRS:
        if not d.exists() or not d.is_dir():
            continue
        for f in d.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    content = fp.read().strip()
                    if not content:
                        continue
                    data = json.loads(content)

                def _register(item: Any, fallback_key: Optional[str] = None):
                    if not isinstance(item, dict):
                        return
                    raw_id = item.get("id") or fallback_key or (re.sub(r'[^a-z0-9_]+', '_', (item.get("name") or "ext_era").lower()).strip('_'))
                    if not raw_id:
                        return
                    era_id = str(raw_id).strip()
                    item["id"] = era_id
                    item["is_user_era"] = True
                    item["is_extension"] = True
                    item.setdefault("category", "Extension Eras")
                    ext_eras[era_id] = item

                if isinstance(data, list):
                    for entry in data:
                        _register(entry)
                elif isinstance(data, dict):
                    if "era_pair" in data and isinstance(data["era_pair"], dict):
                        for k, v in data["era_pair"].items():
                            _register(v, k)
                    elif data.get("id") and (data.get("name") or data.get("social_codes")):
                        _register(data)
                    else:
                        for k, v in data.items():
                            _register(v, k)
            except Exception as e:
                print(f"[ErasExtension] Error loading {f}: {e}")
    return ext_eras

def load_user_eras() -> Dict[str, Dict[str, Any]]:
    """Loads custom user-created eras from disk."""
    if not USER_ERAS_FILE.exists():
        return {}
    try:
        with open(USER_ERAS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
            elif isinstance(data, list):
                return {item["id"]: item for item in data if "id" in item}
    except Exception as e:
        print(f"Error loading user eras: {e}")
    return {}

def save_user_era(era_data: Dict[str, Any]) -> Dict[str, Any]:
    """Saves or updates a custom user era template persistently."""
    user_eras = load_user_eras()
    era_id = era_data.get("id")
    if not era_id or era_id == "new":
        slug = re.sub(r'[^a-z0-9]+', '_', (era_data.get("short_name") or era_data.get("name") or "era").lower()).strip('_')
        era_id = f"user_{slug}_{int(time.time())}"
        era_data["id"] = era_id

    era_data["is_user_era"] = True
    if not era_data.get("category"):
        era_data["category"] = "User Eras"
    if not era_data.get("region"):
        era_data["region"] = "Custom Setting"
    if not era_data.get("created_at"):
        era_data["created_at"] = time.strftime("%Y-%m-%d %H:%M:%S")

    # Ensure names, titles, tags are lists
    if isinstance(era_data.get("names"), str):
        era_data["names"] = [n.strip() for n in era_data["names"].split(",") if n.strip()]
    if isinstance(era_data.get("titles"), str):
        era_data["titles"] = [t.strip() for t in era_data["titles"].split(",") if t.strip()]
    if isinstance(era_data.get("tags"), str):
        era_data["tags"] = [tg.strip() for tg in era_data["tags"].split(",") if tg.strip()]

    user_eras[era_id] = era_data
    try:
        with open(USER_ERAS_FILE, "w", encoding="utf-8") as f:
            json.dump(user_eras, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error writing user eras: {e}")
    return era_data

def delete_user_era(era_id: str) -> bool:
    """Removes a custom user era template from disk."""
    user_eras = load_user_eras()
    if era_id in user_eras:
        del user_eras[era_id]
        try:
            with open(USER_ERAS_FILE, "w", encoding="utf-8") as f:
                json.dump(user_eras, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving after delete: {e}")
    return False

ERAS_DB_FILE = Path(__file__).parent / "eras_db.json"

def load_eras_db() -> Dict[str, Dict[str, Any]]:
    """Loads all eras from the primary eras_db.json database file."""
    if ERAS_DB_FILE.exists():
        try:
            with open(ERAS_DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            print(f"[ErasData] Failed to load eras_db.json: {e}")
    return {}

def read_era_tool(era_id: str) -> Optional[Dict[str, Any]]:
    """Tool function: Reads an existing era from the eras_db.json database."""
    return get_era_info(era_id)

def get_era_categories() -> List[str]:
    """Returns a sorted list of unique categories across all eras."""
    all_eras = get_all_eras(include_user=True)
    cats = {e.get("category") for e in all_eras.values() if e.get("category")}
    return sorted(list(cats))

def search_era_categories(query: str = "") -> List[Dict[str, Any]]:
    """Returns matching categories with their counts."""
    all_eras = get_all_eras(include_user=True)
    counts: Dict[str, int] = {}
    for e in all_eras.values():
        c = e.get("category") or "Uncategorized"
        counts[c] = counts.get(c, 0) + 1
    q = (query or "").strip().lower()
    matched = []
    for cat, count in counts.items():
        if not q or q in cat.lower():
            matched.append({"name": cat, "count": count, "category": cat})
    matched.sort(key=lambda x: -x["count"])
    return matched

def list_eras_tool(query: str = "", category: str = "", limit: int = 15) -> List[Dict[str, Any]]:
    """Tool function: Searches and lists existing eras from the database."""
    results = search_eras_semantic(query=query, category_filter=category or "All")
    return results[:limit]

def get_era_info(era_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full metadata for built-in, db, extension, or custom user eras."""
    if not era_id or era_id == "off":
        return None
    e = era_id.strip()
    db_eras = load_eras_db()
    if e in db_eras:
        return db_eras[e]
    if e in HISTORICAL_ERAS:
        return HISTORICAL_ERAS[e]
    ext_eras = load_extension_eras()
    if e in ext_eras:
        return ext_eras[e]
    user_eras = load_user_eras()
    if e in user_eras:
        return user_eras[e]
    # Check lowercase fallback
    for k, v in db_eras.items():
        if k.lower() == e.lower():
            return v
    for k, v in HISTORICAL_ERAS.items():
        if k.lower() == e.lower():
            return v
    for k, v in ext_eras.items():
        if k.lower() == e.lower():
            return v
    for k, v in user_eras.items():
        if k.lower() == e.lower():
            return v
    return None

def get_all_eras(include_user: bool = True) -> Dict[str, Dict[str, Any]]:
    """Returns all available eras including database, extensions, and user-created eras."""
    combined = dict(HISTORICAL_ERAS)
    db_eras = load_eras_db()
    if db_eras:
        combined.update(db_eras)
    if include_user:
        extensions = load_extension_eras()
        user_eras = load_user_eras()
        combined.update(extensions)
        combined.update(user_eras)
    return combined

# =========================================================================
# HIGH-ACCURACY SEMANTIC MEANING & KEYWORD SEARCH ENGINE
# =========================================================================

STEMS = {
    "knights": "knight", "castles": "castle", "swords": "sword", "samurais": "samurai",
    "vikings": "viking", "pirates": "pirate", "pharaohs": "pharaoh", "pyramids": "pyramid",
    "chivalry": "chivalr", "chivalric": "chivalr", "feudalism": "feudal", "empires": "empire",
    "dynasties": "dynasty", "crusades": "crusad", "crusaders": "crusad", "temples": "temple",
    "clans": "clan", "dragons": "dragon", "monks": "monk", "monasteries": "monaster",
    "revolutions": "revolut", "battles": "battle", "wars": "war", "wars of": "war",
    "shogunate": "shogun", "barons": "baron", "dukes": "duke", "kings": "king",
    "submissive": "submiss", "submission": "submiss", "dominant": "dominan", "dominance": "dominan",
    "collars": "collar", "chastisement": "chastise", "spankings": "spank", "obedience": "obedien",
    "chieftains": "chieftain", "patriarchs": "patriarch", "thralls": "thrall", "familiars": "familiar",
    "captives": "captive", "inquisitors": "inquisit", "warlords": "warlord",
    "patriarchal": "patriarch", "patriarchy": "patriarch", "paterfamilias": "paterfamilias",
    "elves": "elf", "demihumans": "demihuman", "demi-humans": "demihuman", "demi-human": "demihuman",
    "beastfolk": "beastfolk", "kemonomimi": "kemonomimi", "kitsunes": "kitsune", "catgirls": "catgirl",
    "tri-racial": "multirace", "multi-species": "multirace", "multi-racial": "multirace",
}

SEMANTIC_CONCEPT_MAP: Dict[str, List[str]] = {
    "bdsm": ["dominan", "submiss", "collar", "restraint", "discipline", "chastise", "spank", "obedien", "bound", "protocol", "kneel", "captive"],
    "male dom": ["patriarch", "dominan", "master", "lord", "archon", "chieftain", "inquisit", "sultan", "sovereign", "possessive", "chastise", "kneel", "tamed"],
    "dominance": ["dominan", "master", "sovereign", "patriarch", "authority", "possessive", "discipline", "rule", "archon"],
    "submissive": ["submiss", "thrall", "consort", "pet", "ward", "kneel", "obedien", "bound", "captive", "penitent", "tamed"],
    "discipline": ["chastise", "spank", "punish", "paddle", "strap", "kneel", "repent", "protocol", "strict", "ruler", "penance"],
    "obedience": ["obedien", "submiss", "kneel", "protocol", "chastise", "bound", "curtsy", "kowtow"],
    "collar": ["torc", "choker", "collar", "bound", "restraint", "slave", "thrall", "pet"],
    "captive": ["bound", "captive", "chains", "cellar", "ward", "prize", "tamed", "hostage"],
    "patriarch": ["patriarch", "paterfamilias", "male dom", "dominan", "sovereign", "warlord", "archon", "khan", "master", "chastise", "obedience", "headship"],
    "patriarchal": ["patriarch", "paterfamilias", "male dom", "dominan", "sovereign", "warlord", "archon", "khan", "master", "chastise", "obedience", "headship"],
    "patriarchy": ["patriarch", "paterfamilias", "male dom", "dominan", "sovereign", "warlord", "archon", "khan", "master", "chastise", "obedience", "headship"],
    "elf": ["high elf", "dark elf", "drow", "wood elf", "moon elf", "sylvan", "elven", "glamour", "sun spire"],
    "elves": ["high elf", "dark elf", "drow", "wood elf", "moon elf", "sylvan", "elven", "glamour", "sun spire"],
    "high elf": ["high elf", "sun elf", "solar archon", "sun spire", "gold torc", "aurelia", "elven", "noble"],
    "dark elf": ["dark elf", "drow", "shadow", "obsidian", "underdark", "vhaera", "nathrae", "spider-silk", "sunless"],
    "drow": ["dark elf", "drow", "shadow", "obsidian", "underdark", "vhaera", "nathrae", "spider-silk", "sunless"],
    "wood elf": ["wood elf", "sylvan", "forest", "ironwood", "oak", "huntress", "elder tree", "ash switch"],
    "demihuman": ["demi-human", "beastfolk", "kemonomimi", "kitsune", "cat-girl", "wolf-kin", "dragonkin", "naga", "tail", "ears", "pack", "den"],
    "demi human": ["demi-human", "beastfolk", "kemonomimi", "kitsune", "cat-girl", "wolf-kin", "dragonkin", "naga", "tail", "ears", "pack", "den"],
    "beastfolk": ["beastfolk", "wolf-kin", "catfolk", "kitsune", "alpha", "pack", "fur", "den", "demihuman", "throat"],
    "kemonomimi": ["kemonomimi", "kitsune", "cat-girl", "neko", "tail", "ears", "bell collar", "cushion"],
    "multi-species": ["tri-racial", "multi-race", "elves", "demihuman", "human", "high elf", "dark elf", "seraglio", "imperium", "concordat"],
    "multirace": ["tri-racial", "multi-race", "elves", "demihuman", "human", "high elf", "dark elf", "seraglio", "imperium", "concordat"],
    "human": ["human", "noblewoman", "captive", "ward", "homestead", "paterfamilias", "bride", "consort"],
    "harem": ["seraglio", "sultan", "concubine", "odalisque", "consort", "sheikh", "vizier", "palace", "ankle bells"],
    "vampire": ["vampir", "blood", "thrall", "elder", "gothic", "candelabra", "night", "sanguine", "draven"],
    "fae": ["sylvan", "elven", "glamour", "twilight", "silverwood", "thorn", "geas", "archon"],
    "cultivation": ["xianxia", "sect", "jade", "qi", "daoist", "meridian", "patriarch", "kowtow", "spiritual", "cultivat"],
    "warlord": ["chieftain", "steppes", "clan", "rawhide", "longhouse", "captive", "pelt", "axe", "tamed"],
    "inquisition": ["inquisit", "penance", "heretic", "flame", "repent", "birch", "chastise", "cloister", "truth"],
    "dark fantasy": ["obsidian", "blood", "vampir", "inquisit", "abyss", "shadow", "drow", "torc", "warlock", "citadel", "archon", "basalt"],
    "knight": ["chivalr", "lance", "tournament", "armor", "armour", "squire", "heraldry", "vassal", "feudal", "joust", "castle", "sword"],
    "castle": ["keep", "fortress", "citadel", "bailey", "medieval", "feudal", "stone", "rampart", "moat", "tower", "castellan"],
    "samurai": ["bushido", "katana", "shogun", "daimyo", "sengoku", "kamakura", "ronin", "edo", "japan", "kyoto", "armor", "honor"],
    "ninja": ["shinobi", "stealth", "sengoku", "assassin", "japan", "shadow", "shuriken"],
    "pyramid": ["pharaoh", "nile", "egypt", "monument", "hieroglyph", "tomb", "cairo", "giza", "mummy", "sand"],
    "desert": ["sand", "oasis", "dune", "caravan", "sultanate", "caliphate", "cairo", "bedouin", "sahara", "mamluk", "arabia"],
    "viking": ["norse", "longship", "danelaw", "scandinavia", "fjord", "valhalla", "shieldmaiden", "jarl", "runestone", "axe"],
    "pirate": ["buccaneer", "galleon", "caribbean", "cutlass", "sail", "privateer", "corsair", "plunder", "black flag", "flintlock"],
    "noir": ["detective", "fedora", "speakeasy", "trenchcoat", "gangster", "prohibition", "jazz", "smoke", "dame", "hardboiled"],
    "magic": ["arcane", "spire", "enchant", "wizard", "sorcer", "dragon", "fae", "elven", "ley-line", "mythic", "crystal"],
    "fantasy": ["arcane", "spire", "enchant", "wizard", "dragon", "fae", "elven", "ley-line", "mythic", "timeless"],
    "witch": ["alchemy", "inquisition", "heresy", "sorcer", "occult", "coven", "potions", "grimoire"],
    "crusade": ["crusad", "jerusalem", "templar", "hospitaller", "saladin", "holy land", "levant", "outremer", "faith", "teutonic"],
    "dark ages": ["early medieval", "anglo-saxon", "danelaw", "kievan rus", "migration", "barbarian", "viking"],
    "middle ages": ["medieval", "feudal", "chivalr", "crusad", "knight", "castle", "cathedral", "manor", "serf"],
    "wild west": ["frontier", "cowboy", "saloon", "outlaw", "sheriff", "revolver", "colt", "stagecoach", "gold rush", "boomtown"],
    "western": ["frontier", "cowboy", "saloon", "outlaw", "sheriff", "revolver", "colt", "stagecoach", "gold rush"],
    "cowboy": ["frontier", "wild west", "saloon", "outlaw", "sheriff", "revolver", "colt", "ranch", "horse"],
    "steampunk": ["steam", "brass", "cogs", "clockwork", "victorian", "gaslamp", "industrial", "airship", "smog"],
    "victorian": ["gaslamp", "smog", "steam", "corset", "crinoline", "top hat", "industrial", "london", "dickensian", "parlor"],
    "gladiator": ["colosseum", "arena", "rome", "roman", "caesar", "senate", "centurion", "legion", "latin"],
    "rome": ["roman", "caesar", "latin", "senate", "republic", "colosseum", "gladiator", "aqueduct", "legion", "patrician"],
    "roman": ["rome", "caesar", "latin", "senate", "republic", "colosseum", "gladiator", "aqueduct", "legion"],
    "greece": ["sparta", "athens", "olympus", "hoplite", "parthenon", "philosophy", "hellenic", "classical", "aegean"],
    "greek": ["sparta", "athens", "olympus", "hoplite", "parthenon", "philosophy", "hellenic", "classical", "aegean"],
    "scotland": ["highland", "clans", "tartan", "kilt", "edinburgh", "lochs", "hebrides", "braveheart", "stewart"],
    "scottish": ["highland", "clans", "tartan", "kilt", "edinburgh", "lochs", "hebrides", "braveheart", "stewart"],
    "ireland": ["gaelic", "brehon", "celtic", "emerald", "bards", "clans", "high king", "dublin"],
    "irish": ["gaelic", "brehon", "celtic", "emerald", "bards", "clans", "high king", "dublin"],
    "wales": ["welsh", "snowdonia", "longbow", "marcher", "celtic", "brehon"],
    "welsh": ["wales", "snowdonia", "longbow", "marcher", "celtic"],
    "england": ["anglo-saxon", "norman", "plantagenet", "tudor", "roses", "elizabethan", "victorian", "regency", "london"],
    "english": ["anglo-saxon", "norman", "plantagenet", "tudor", "roses", "elizabethan", "victorian", "regency", "london"],
    "france": ["capetian", "valois", "hundred years", "versailles", "bourbon", "parisian", "fleur-de-lis", "troubadour", "occitan"],
    "french": ["capetian", "valois", "hundred years", "versailles", "bourbon", "parisian", "fleur-de-lis", "troubadour", "occitan"],
    "germany": ["holy roman empire", "hre", "baron", "teutonic", "hanseatic", "weimar", "german", "prussia"],
    "german": ["holy roman empire", "hre", "baron", "teutonic", "hanseatic", "weimar", "prussia"],
    "italy": ["renaissance", "florence", "venice", "rome", "sicily", "medici", "doge", "norman sicily", "italian"],
    "italian": ["renaissance", "florence", "venice", "rome", "sicily", "medici", "doge", "norman sicily"],
    "spain": ["castile", "reconquista", "al-andalus", "cordoba", "granada", "el cid", "flamenco", "spanish"],
    "spanish": ["castile", "reconquista", "al-andalus", "cordoba", "granada", "el cid", "spanish"],
    "japan": ["heian", "kamakura", "sengoku", "edo", "meiji", "samurai", "shogun", "kyoto", "tokyo", "kimono"],
    "japanese": ["heian", "kamakura", "sengoku", "edo", "meiji", "samurai", "shogun", "kyoto", "tokyo", "kimono"],
    "china": ["han", "tang", "song", "ming", "qing", "dynasty", "beijing", "forbidden city", "silk", "porcelain"],
    "chinese": ["han", "tang", "song", "ming", "qing", "dynasty", "beijing", "forbidden city", "silk", "porcelain"],
    "korea": ["goryeo", "joseon", "silla", "hangul", "celadon", "hanbok", "seoul", "korean"],
    "korean": ["goryeo", "joseon", "silla", "hangul", "celadon", "hanbok", "seoul"],
    "india": ["delhi sultanate", "chola", "mughal", "maurya", "ashoka", "rajasthan", "sanskrit", "indian"],
    "indian": ["delhi sultanate", "chola", "mughal", "maurya", "ashoka", "rajasthan", "sanskrit"],
    "russia": ["rus", "novgorod", "kiev", "moscow", "tsar", "boyar", "slavic", "kremlin", "steppe", "russian"],
    "russian": ["rus", "novgorod", "kiev", "moscow", "tsar", "boyar", "slavic", "kremlin", "steppe"],
    "slavic": ["rus", "novgorod", "bohemia", "poland", "lithuania", "prague", "boyar", "tsar", "kiev"],
    "byzantine": ["constantinople", "byzantium", "komnenian", "palaiologan", "orthodox", "basileus", "hagiasophia"],
    "constantinople": ["byzantine", "byzantium", "komnenian", "palaiologan", "orthodox", "basileus", "istanbul"],
    "ottoman": ["suleiman", "topkapi", "janissary", "porte", "istanbul", "divan", "pasha", "sultan", "turkey"],
    "persia": ["achaemenid", "safavid", "isfahan", "shiraz", "cyrus", "shah", "persian", "iran"],
    "persian": ["achaemenid", "safavid", "isfahan", "shiraz", "cyrus", "shah", "iran"],
    "aztec": ["tenochtitlan", "mexica", "mesoamerica", "nahuatl", "pyramid", "sun stone", "obsidian", "mexico"],
    "inca": ["cusco", "andes", "machu picchu", "sun road", "quechua", "quipu", "peru"],
    "africa": ["mali", "timbuktu", "mansa musa", "solomonic", "ethiopia", "swahili", "kilwa", "african"],
    "cold war": ["espionage", "spies", "kgb", "cia", "berlin", "nuclear", "atomic", "1960s", "1970s", "iron curtain"],
    "retro": ["neon", "cassette", "synth", "1980s", "arcade", "futurism", "vhs", "walkman"],
    "grunge": ["flannel", "1990s", "y2k", "dial-up", "indie", "riot grrrl", "cd-rom"],
}

CENTURY_MAP = {
    "1st": ["c. 1", "first century", "27 bce", "476 ce"],
    "2nd": ["c. 100", "second century"],
    "3rd": ["c. 200", "third century"],
    "4th": ["c. 300", "fourth century"],
    "5th": ["c. 400", "fifth century"],
    "6th": ["c. 500", "sixth century"],
    "7th": ["c. 600", "c. 650", "seventh century", "618", "650"],
    "8th": ["c. 700", "eighth century", "762", "793", "794"],
    "9th": ["c. 800", "ninth century", "802", "848"],
    "10th": ["c. 900", "tenth century", "918", "929", "960", "988"],
    "11th": ["c. 1000", "eleventh century", "1000", "1044", "1065", "1066", "1077", "1081", "1099"],
    "12th": ["c. 1100", "twelfth century", "1100", "1130", "1136", "1139", "1150", "1154", "1185"],
    "13th": ["c. 1200", "thirteenth century", "1200", "1206", "1230", "1235", "1238", "1241", "1250", "1261", "1270", "1286", "1291", "1293"],
    "14th": ["c. 1300", "fourteenth century", "1300", "1320", "1325", "1337", "1346", "1368", "1392"],
    "15th": ["c. 1400", "fifteenth century", "1400", "1438", "1450", "1455", "1467", "1485", "1490"],
    "16th": ["c. 1500", "sixteenth century", "1500", "1501", "1517", "1520", "1526", "1550", "1568"],
    "17th": ["c. 1600", "seventeenth century", "1600", "1603", "1650"],
    "18th": ["c. 1700", "eighteenth century", "1700", "1715", "1740", "1765", "1789"],
    "19th": ["c. 1800", "nineteenth century", "1800", "1837", "1840", "1860", "1868", "1890"],
    "20th": ["c. 1900", "twentieth century", "1900", "1914", "1919", "1920", "1939", "1940", "1950", "1960", "1970", "1980", "1990"],
}

def parse_span_years(span_str: str):
    """Extracts numeric start and end years from a historical span string."""
    is_bce = "bce" in span_str.lower() or "bc" in span_str.lower()
    nums = [int(n) for n in re.findall(r'\b\d{1,4}\b', span_str)]
    if len(nums) >= 2:
        start, end = nums[0], nums[1]
        if is_bce:
            return -start, -end
        return start, end
    elif len(nums) == 1:
        return nums[0], nums[0]
    return None, None

def search_eras_semantic(
    query: str = "",
    category_filter: str = "All",
    region_filter: str = "All",
    only_user: bool = False,
    variant_filter: str = "all"
) -> List[Dict[str, Any]]:
    """
    High-accuracy semantic search engine across both built-in historical eras and user-created custom eras.
    Accurately matches:
    - Keywords, country names, concepts, and synonyms ('knights', 'samurai', '14th century', 'desert', 'pirates')
    - Aesthetic textures, technological limitations, and social propriety dynamics
    - Time spans, centuries, regions, categories, and tags
    """
    all_eras = get_all_eras(include_user=True)
    q_raw = (query or "").strip().lower()
    
    # 1. Clean query words and filter stopwords if compound query
    STOP_WORDS = {"the", "and", "of", "in", "to", "a", "an", "at", "by", "for", "with", "from", "era", "age", "period", "century"}
    raw_words = [re.sub(r'[^a-z0-9\-]', '', w) for w in q_raw.split() if len(w) > 1]
    if len(raw_words) > 1:
        words = [w for w in raw_words if w not in STOP_WORDS]
        if not words:
            words = raw_words
    else:
        words = raw_words
    
    # 2. Extract semantic expansions & detected century ranges
    target_stems: Set[str] = set()
    century_ranges: List[tuple] = []

    # Detect century expressions like "14th", "14th century", "1400s", "12th"
    cent_matches = re.findall(r'\b(\d{1,2})(?:st|nd|rd|th)\b', q_raw)
    for c_str in cent_matches:
        try:
            c_num = int(c_str)
            if 1 <= c_num <= 21:
                century_ranges.append(((c_num - 1) * 100, c_num * 100))
        except ValueError:
            pass

    for w in raw_words:
        stemmed = STEMS.get(w, w)
        if w not in STOP_WORDS:
            target_stems.add(stemmed)
        # Check concept dictionary
        for concept_key, concept_synonyms in SEMANTIC_CONCEPT_MAP.items():
            if stemmed == concept_key or concept_key in stemmed or stemmed in concept_key:
                target_stems.update(concept_synonyms)

    results: List[Dict[str, Any]] = []

    for era_id, era in all_eras.items():
        # Apply variant filter ('poly' for multi-partner/polygyny, 'mono' for sole partner/monogamy)
        if variant_filter in ("poly", "polygyny", "eram", "m"):
            name_low = (era.get("name") or "").lower()
            short_low = (era.get("short_name") or "").lower()
            tags_low = [t.lower() for t in era.get("tags", [])]
            is_poly = (
                era_id.endswith("_haven") or
                era_id.endswith("_polygyny") or
                "multi-wife" in name_low or "multi-wife" in short_low or
                "multi-partner" in name_low or "multi-partner" in short_low or
                "polygyny" in name_low or "polygamous" in name_low or
                any("polygyn" in t or "multi-wife" in t or "multi-partner" in t for t in tags_low)
            )
            if not is_poly:
                continue
        elif variant_filter in ("mono", "monogamy", "eras", "solo", "s"):
            name_low = (era.get("name") or "").lower()
            short_low = (era.get("short_name") or "").lower()
            tags_low = [t.lower() for t in era.get("tags", [])]
            is_mono = (
                era_id.endswith("_monogamy") or
                "sole" in name_low or "sole" in short_low or
                "monogamy" in name_low or "monogamous" in name_low or
                any("monogam" in t or "sole" in t for t in tags_low)
            )
            if not is_mono:
                continue

        # Apply strict mode filters
        is_user = era.get("is_user_era", False)
        if only_user and not is_user:
            continue

        cat = era.get("category", "")
        is_ext = era.get("is_extension", False)
        if category_filter and category_filter not in ("All", "All Eras", ""):
            if category_filter == "Extensions":
                if not is_ext:
                    continue
            elif category_filter == "User Eras":
                if not is_user and cat != "User Eras":
                    continue
            elif cat.lower() != category_filter.lower():
                continue

        reg = era.get("region", "")
        if region_filter and region_filter not in ("All", "All Regions", ""):
            if reg.lower() != region_filter.lower() and region_filter.lower() not in reg.lower():
                continue

        # If query is blank, score by natural catalog order
        if not words:
            era_copy = dict(era)
            era_copy["relevance_score"] = 100 if is_user else 50
            results.append(era_copy)
            continue

        # Score matching
        score = 0
        name = era.get("name", "").lower()
        short = era.get("short_name", "").lower()
        span = era.get("span", "").lower()
        cat_lower = cat.lower()
        reg_lower = reg.lower()
        tags_str = " ".join(era.get("tags", [])).lower()
        aesthetic = era.get("aesthetic", "").lower()
        tech = era.get("tech", "").lower()
        social = era.get("social_codes", "").lower()
        titles_str = " ".join(era.get("titles", [])).lower()
        names_str = " ".join(era.get("names", [])).lower()

        # Exact ID or name match bonus
        if q_raw == era_id.lower() or q_raw == short:
            score += 200
        elif q_raw in name:
            score += 120

        # Exact word matches
        for w in words:
            if w in name: score += 55
            if w in short: score += 45
            if w in cat_lower: score += 35
            if w in reg_lower: score += 35
            if w in tags_str: score += 30
            if w in span: score += 30
            if w in titles_str or w in names_str: score += 20
            if w in aesthetic: score += 15
            if w in tech: score += 15
            if w in social: score += 15

        # Semantic expanded concept matches
        for stem in target_stems:
            if stem in name: score += 45
            if stem in short: score += 35
            if stem in tags_str: score += 25
            if stem in cat_lower or stem in reg_lower: score += 20
            if stem in span: score += 25
            if stem in titles_str or stem in names_str: score += 15
            if stem in aesthetic: score += 12
            if stem in tech: score += 12
            if stem in social: score += 12

        # Century range overlap matches (e.g. "14th century" -> 1300-1400 CE)
        if century_ranges:
            s_yr, e_yr = parse_span_years(span)
            if s_yr is not None and e_yr is not None:
                for c_start, c_end in century_ranges:
                    if max(s_yr, c_start) <= min(e_yr, c_end):
                        score += 160

        if score > 0:
            era_copy = dict(era)
            era_copy["relevance_score"] = score
            results.append(era_copy)

    # Sort results descending by score
    results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    return results


# ============================================================================
# Modular Extension Management & 5-Pillars Compliance Linter (Python)
# ============================================================================

def list_extension_files() -> List[Dict[str, Any]]:
    """Lists all JSON extension files in data/eras_extensions/ and external user extension folder."""
    results = []
    seen_files = set()

    # Scan project data dir first, then user external dir
    scan_dirs = [
        (ROOT_DATA_EXTENSIONS_DIR, False),
        (get_external_user_extension_dir(), True)
    ]

    for dir_path, is_external in scan_dirs:
        if not os.path.exists(dir_path):
            try:
                os.makedirs(dir_path, exist_ok=True)
            except Exception:
                continue

        try:
            for file in os.listdir(dir_path):
                if not file.endswith(".json"):
                    continue
                file_key = f"{'external:' if is_external else 'project:'}{file}"
                if file_key in seen_files:
                    continue
                seen_files.add(file_key)

                file_path = os.path.join(dir_path, file)
                try:
                    stats = os.stat(file_path)
                    with open(file_path, "r", encoding="utf-8") as f:
                        raw = f.read().strip()
                    if not raw:
                        continue
                    parsed = json.loads(raw)
                    era_list = []

                    def extract_meta(item, fallback_key=None):
                        if not isinstance(item, dict):
                            return
                        eid = item.get("id") or fallback_key or (re.sub(r"[^a-z0-9_]", "_", item.get("name", "").lower()) if item.get("name") else "unknown")
                        era_list.append({
                            "id": str(eid),
                            "name": item.get("name", str(eid)),
                            "short_name": item.get("short_name", ""),
                            "category": item.get("category", "")
                        })

                    if isinstance(parsed, list):
                        for item in parsed:
                            extract_meta(item)
                    elif isinstance(parsed, dict):
                        if "era_pair" in parsed and isinstance(parsed["era_pair"], dict):
                            for k, v in parsed["era_pair"].items():
                                extract_meta(v, k)
                        elif "id" in parsed and ("name" in parsed or "social_codes" in parsed):
                            extract_meta(parsed)
                        else:
                            for k, v in parsed.items():
                                extract_meta(v, k)

                    results.append({
                        "filename": file,
                        "filePath": file_path,
                        "sizeBytes": stats.st_size,
                        "eraCount": len(era_list),
                        "eras": era_list,
                        "isExternalUser": is_external
                    })
                except Exception as e:
                    print(f"[Eras] Error reading extension file {file} in {dir_path}: {e}")
        except Exception as e:
            print(f"[Eras] Error listing extension directory {dir_path}: {e}")

    return results


def save_extension_file(filename: str, content: Any, destination: str = "project_data") -> Dict[str, Any]:
    """Saves era definitions into an extension file (project data or OS external user dir)."""
    clean_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", filename.strip())
    if not clean_name.endswith(".json"):
        clean_name += ".json"

    target_dir = get_primary_extension_dir(destination)
    os.makedirs(target_dir, exist_ok=True)
    file_path = os.path.join(target_dir, clean_name)

    count = len(content) if isinstance(content, (list, dict)) else 1

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=2, ensure_ascii=False)

    return {
        "success": True,
        "filePath": file_path,
        "count": count,
        "destination": "local_user" if destination in ("local_user", "user", "external") else "project_data"
    }


def delete_extension_file(filename: str, destination: Optional[str] = None) -> bool:
    """Deletes an extension file from target destination or searches both."""
    clean_name = os.path.basename(filename.strip())

    if destination:
        dirs_to_check = [get_primary_extension_dir(destination)]
    else:
        dirs_to_check = [ROOT_DATA_EXTENSIONS_DIR, get_external_user_extension_dir()]

    for d in dirs_to_check:
        file_path = os.path.join(d, clean_name)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                return True
            except Exception as e:
                print(f"[Eras] Failed removing {file_path}: {e}")
    return False


def validate_era_compliance(era: Dict[str, Any], pair_era: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Python 5-Pillars Compliance Linter for an Era Definition.
    Audits against the worldbuilding rules in ERA_AUTHORING_SPEC.md.
    """
    issues = []
    warnings = []
    strengths = []

    name = str(era.get("name", "")).lower()
    short_name = str(era.get("short_name", "")).lower()
    eid = str(era.get("id", "")).lower()
    social = str(era.get("social_codes", "")).lower()
    tags = [str(t).lower() for t in era.get("tags", [])] if isinstance(era.get("tags"), list) else []
    titles = [str(t).lower() for t in era.get("titles", [])] if isinstance(era.get("titles"), list) else []
    names = era.get("names", []) if isinstance(era.get("names"), list) else []
    aesthetic = str(era.get("aesthetic", ""))
    tech = str(era.get("tech", ""))

    # Quality Check 1: Dual-Format (Paired Setting Set)
    dual_format = False
    is_poly = "polygyny" in eid or "multi_wife" in eid or "multi-wife" in name or "multi-wife" in short_name or "multi-partner" in name or any("polygyny" in t or "multi-wife" in t or "multi-partner" in t for t in tags)
    is_mono = "monogamy" in eid or "sole_bride" in eid or "sole-bride" in name or "sole bride" in name or "sole bride" in short_name or "sole-partner" in name or any("monogamy" in t or "sole-bride" in t or "sole partner" in t for t in tags)

    if pair_era:
        p_name = str(pair_era.get("name", "")).lower()
        p_id = str(pair_era.get("id", "")).lower()
        p_poly = "polygyny" in p_id or "multi-wife" in p_name or "multi-partner" in p_name
        p_mono = "monogamy" in p_id or "sole bride" in p_name or "sole-bride" in p_name or "sole partner" in p_name
        if (is_poly and p_mono) or (is_mono and p_poly):
            dual_format = True
            strengths.append("Verified complete paired set (Multi-Partner + Sole Partner).")
    elif is_poly or is_mono:
        dual_format = True
        strengths.append(f"Identified variant mode: {'Multi-Partner (Polygyny)' if is_poly else 'Sole Partner (Monogamy)'}.")
    else:
        warnings.append("Era does not explicitly identify Multi-Partner or Sole Partner variant in title, short_name, or tags.")

    # Quality Check 2: Setting Atmosphere & World Depth
    setting_depth = True
    if len(aesthetic) >= 40:
        strengths.append("Rich sensory aesthetics and environmental atmosphere established.")
    else:
        warnings.append("Aesthetic sensory visuals are brief; elaborate on architecture, lighting, and textures.")
        setting_depth = False

    # Quality Check 3: Social Codes & Relationship Dynamics
    social_structure = True
    if len(social) >= 80:
        strengths.append("Clear cultural etiquette, social hierarchy, and interpersonal dynamics established.")
    else:
        issues.append("Social codes paragraph is too brief to define the relationship dynamic and world rules.")
        social_structure = False

    # Optional Theme Highlights: Acknowledge user-requested specific tropes without enforcing them dogmatically
    has_seclusion = ("secluded" in social or "sanctuary" in social or "private" in social or "isolation" in social or "zero guards" in social)
    if has_seclusion:
        strengths.append("High-privacy secluded sanctuary dynamic detected.")

    has_domestic_discipline = any(d in social for d in ["discipline", "knee", "lap", "headship"])
    if has_domestic_discipline:
        strengths.append("Traditional domestic headship dynamic detected.")

    # Quality Check 4: Content Richness & Name Pools
    content_richness = True
    if len(names) < 8:
        warnings.append(f"Name pool has {len(names)} names (recommended: 12+).")
        content_richness = False
    else:
        strengths.append(f"Diverse name pool populated ({len(names)} names).")

    if len(titles) < 4:
        warnings.append(f"Titles list has {len(titles)} archetypes (recommended: 6+).")
        content_richness = False
    else:
        strengths.append(f"Companion archetype titles provided ({len(titles)} titles).")

    if len(tags) < 4:
        warnings.append(f"Tags list has {len(tags)} entries (recommended: 6+).")
        content_richness = False

    score = 100 - (len(issues) * 20) - (len(warnings) * 5)
    if score < 0:
        score = 0

    return {
        "eraId": str(era.get("id", "unnamed")),
        "eraName": str(era.get("name", "Unnamed Era")),
        "compliant": len(issues) == 0,
        "score": score,
        "pillars": {
            "dualFormat": dual_format,
            "settingDepth": setting_depth,
            "socialStructure": social_structure,
            "contentRichness": content_richness,
        },
        "strengths": strengths,
        "warnings": warnings,
        "issues": issues,
    }

