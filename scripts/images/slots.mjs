/**
 * Slot -> search query map for the harvester.
 *
 * Only covers what is ACTUALLY obtainable from openly-licensed sources (Wikimedia
 * Commons, Openverse/Flickr-CC). A large part of IMAGE_MANIFEST.md is not, and is
 * deliberately absent here rather than filled with weak approximations:
 *
 *   - Console and game UI (3DS home menu, Wii menu, Xbox 360 blades, PS1 memory card)
 *   - Game screenshots (Mario Sunshine, Halo, Wind Waker, Xenoblade)
 *   - Frutiger Aero / Windows Vista wallpapers
 *   - GeoCities-era GIFs and 88x31 badges  -> see harvest-buttons.mjs, different source
 *   - Specific subculture photography (JDM night meets, dead malls, skate zines)
 *
 * Those stay on the manual list. `node scripts/images/coverage.mjs` reports the gap.
 *
 * `src`: "commons" | "openverse" | "both".  Commons is better for objects, textures,
 * architecture and public-domain art; Openverse is better for people, vehicles,
 * interiors and anything candid.
 */

export const SLOTS = {
  "frutiger-aero": {
    frutiger_sky: { q: "blue sky cumulus clouds", n: 6, src: "commons", minW: 1600 },
    frutiger_grass: { q: "green rolling hill meadow landscape", n: 5, src: "commons", minW: 1600 },
    frutiger_underwater: { q: "underwater sunbeams caustics sea", n: 5, src: "commons" },
    frutiger_bubble: { q: "soap bubble macro", n: 14, src: "both" },
    frutiger_fish: { q: "tropical reef fish side view", n: 12, src: "both" },
    frutiger_waterdrop: { q: "water droplet macro glass", n: 10, src: "both" },
    frutiger_leaf: { q: "wet tropical leaf dew macro", n: 6, src: "both" },
    frutiger_skyscraper: { q: "glass skyscraper looking up blue sky", n: 6, src: "both" },
    frutiger_lensflare: { q: "bokeh lens flare lights", n: 5, src: "openverse" },
  },

  tiki: {
    tiki_sunset: { q: "beach sunset ocean orange sky", n: 6, src: "both" },
    tiki_torch: { q: "tiki torch flame night", n: 5, src: "openverse" },
    tiki_mug: { q: "tiki mug carved ceramic", n: 6, src: "openverse" },
    tiki_bamboo: { q: "bamboo texture rattan weave", n: 5, src: "commons" },
    tiki_flower: { q: "hibiscus plumeria flower isolated", n: 8, src: "both" },
    tiki_lantern: { q: "paper lantern lit night", n: 6, src: "both" },
    tiki_palm: { q: "palm tree silhouette sky", n: 6, src: "both" },
    tiki_cocktail: { q: "tropical cocktail garnish glass", n: 6, src: "openverse" },
    tiki_carving: { q: "tiki carving wooden totem", n: 5, src: "openverse" },
    tiki_ocean: { q: "dark ocean water surface night", n: 4, src: "commons" },
  },

  aztec: {
    aztec_wall: { q: "maya stone relief carving detail", n: 8, src: "commons" },
    aztec_glyph: { q: "maya hieroglyph glyph stone", n: 14, src: "commons" },
    aztec_temple: { q: "maya pyramid temple Tikal Chichen Itza", n: 8, src: "commons" },
    aztec_lava: { q: "lava flow molten rock", n: 8, src: "commons" },
    aztec_gold: { q: "pre-columbian gold artefact mask museum", n: 8, src: "commons" },
    aztec_vine: { q: "hanging jungle vines moss overgrowth", n: 6, src: "both" },
    aztec_obsidian: { q: "obsidian blade volcanic glass", n: 4, src: "commons" },
    aztec_journal: { q: "aged paper parchment texture", n: 5, src: "commons" },
  },

  "game-beach": {
    gbeach_water: { q: "turquoise tropical shallow water caustics", n: 8, src: "both" },
    gbeach_sand: { q: "white sand beach texture", n: 5, src: "commons" },
    gbeach_sky: { q: "bright cumulus cloud blue sky", n: 5, src: "commons" },
    gbeach_palm: { q: "coconut palm tree isolated", n: 6, src: "both" },
    gbeach_island: { q: "tropical island aerial lagoon", n: 6, src: "both" },
  },

  "deep-sea": {
    sea_creature: { q: "deep sea creature abyss", n: 10, src: "commons" },
    sea_jellyfish: { q: "jellyfish glowing dark water", n: 10, src: "both" },
    sea_dark: { q: "dark underwater deep blue", n: 6, src: "both" },
    sea_viewport: { q: "submarine porthole bathysphere", n: 5, src: "commons" },
    sea_coral: { q: "bioluminescent coral deep reef", n: 6, src: "both" },
  },

  cottagecore: {
    cottage_meadow: { q: "wildflower meadow summer grass", n: 8, src: "both" },
    cottage_paper: { q: "watercolour paper texture", n: 4, src: "commons" },
    cottage_flower: { q: "pressed flower botanical specimen", n: 12, src: "commons" },
    cottage_object: { q: "teapot teacup still life", n: 10, src: "both" },
    cottage_laundry: { q: "laundry line hanging washing", n: 5, src: "openverse" },
    cottage_cat: { q: "cat sitting side profile", n: 10, src: "both" },
    cottage_window: { q: "wooden window frame cottage interior", n: 5, src: "both" },
    cottage_bread: { q: "rustic bread loaf jar preserves", n: 6, src: "both" },
  },

  "dead-mall": {
    mall_atrium: { q: "shopping mall interior atrium skylight", n: 10, src: "both" },
    mall_carpet: { q: "patterned carpet texture", n: 4, src: "both" },
    mall_fountain: { q: "shopping mall fountain", n: 5, src: "both" },
    mall_gate: { q: "closed shop security shutter gate", n: 5, src: "both" },
    mall_plant: { q: "artificial plant planter interior", n: 5, src: "both" },
    mall_bust: { q: "marble bust classical sculpture", n: 8, src: "commons" },
    mall_escalator: { q: "escalator empty shopping centre", n: 5, src: "both" },
    mall_abandoned: { q: "abandoned shopping mall derelict", n: 8, src: "both" },
  },

  vaporwave: {
    vapor_bust: { q: "marble bust classical sculpture white", n: 10, src: "commons" },
    vapor_palm: { q: "palm tree silhouette sunset", n: 6, src: "both" },
    vapor_dolphin: { q: "dolphin jumping", n: 5, src: "both" },
    vapor_cassette: { q: "audio cassette tape", n: 6, src: "both" },
    vapor_statue: { q: "greek roman statue museum", n: 8, src: "commons" },
    vapor_checker: { q: "checkerboard tiled floor", n: 4, src: "commons" },
  },

  liminal: {
    lim_hallway: { q: "empty office corridor fluorescent", n: 12, src: "both" },
    lim_carpet: { q: "office carpet texture beige", n: 4, src: "both" },
    lim_wall: { q: "yellow wall texture stained", n: 5, src: "commons" },
    lim_ceiling: { q: "suspended ceiling tiles fluorescent panel", n: 5, src: "both" },
    lim_door: { q: "plain door empty corridor", n: 6, src: "both" },
    lim_stairwell: { q: "empty concrete stairwell", n: 6, src: "both" },
    lim_pool: { q: "empty swimming pool tiles", n: 6, src: "both" },
  },

  win98: {
    win98_beige: { q: "beige desktop computer CRT monitor 1990s", n: 8, src: "both" },
    win98_stockphoto: { q: "1990s office business people computer", n: 8, src: "both" },
    win98_floppy: { q: "floppy disk 3.5 inch", n: 6, src: "both" },
    win98_mouse: { q: "ball mouse beige computer keyboard", n: 5, src: "both" },
    win98_office: { q: "1990s office cubicle interior", n: 6, src: "both" },
  },

  "cyber-sigilism": {
    sigil_device: { q: "portable game console handheld silver", n: 10, src: "both" },
    sigil_mp3: { q: "mp3 player ipod classic", n: 6, src: "both" },
    sigil_flipphone: { q: "flip phone clamshell mobile 2000s", n: 8, src: "both" },
    sigil_chrome: { q: "brushed metal chrome texture", n: 5, src: "commons" },
    sigil_earbud: { q: "white wired earphones cable", n: 5, src: "both" },
    sigil_minidisc: { q: "minidisc walkman portable player", n: 5, src: "both" },
    sigil_grey: { q: "grey concrete texture smooth", n: 4, src: "commons" },
  },

  arcade: {
    arcade_cabinet: { q: "arcade cabinet machine", n: 10, src: "both" },
    arcade_marquee: { q: "arcade marquee sign lit", n: 6, src: "both" },
    arcade_panel: { q: "arcade control panel joystick buttons", n: 8, src: "both" },
    arcade_button: { q: "arcade button close up", n: 8, src: "both" },
    arcade_interior: { q: "video game arcade interior neon", n: 8, src: "both" },
    arcade_crt: { q: "CRT television screen close up", n: 5, src: "both" },
  },

  bbs: {
    bbs_crt: { q: "CRT computer monitor green phosphor terminal", n: 8, src: "both" },
    bbs_modem: { q: "dial up modem 1990s", n: 5, src: "both" },
    bbs_terminal: { q: "vintage computer terminal 1980s", n: 8, src: "both" },
    bbs_keyboard: { q: "vintage mechanical keyboard beige", n: 5, src: "both" },
  },

  matrix: {
    matrix_serverroom: { q: "server room data centre dark", n: 6, src: "both" },
    matrix_crt: { q: "CRT monitor green text terminal", n: 5, src: "both" },
    matrix_keyboard: { q: "mechanical keyboard dark backlit", n: 4, src: "both" },
  },

  ps1: {
    ps1_hardware: { q: "playstation console controller 1990s", n: 8, src: "both" },
    ps1_jewelcase: { q: "CD jewel case compact disc", n: 5, src: "both" },
    ps1_texture: { q: "low resolution texture tile stone", n: 8, src: "commons" },
    ps1_crt: { q: "CRT television 1990s living room", n: 5, src: "both" },
  },

  neon: {
    neon_tube: { q: "neon sign tube glowing dark", n: 12, src: "both" },
    neon_lightpaint: { q: "light painting long exposure trails", n: 8, src: "both" },
    neon_ledstrip: { q: "LED strip light RGB", n: 5, src: "both" },
    neon_sign: { q: "neon shop sign night street", n: 10, src: "both" },
    neon_blacklight: { q: "ultraviolet blacklight fluorescent glow", n: 5, src: "both" },
  },

  "nintendo-3ds": {
    n3ds_wires: { q: "overhead power lines cables japan street", n: 8, src: "both" },
    n3ds_street: { q: "japan residential street night", n: 8, src: "both" },
    n3ds_vending: { q: "japanese vending machine night", n: 8, src: "both" },
    n3ds_konbini: { q: "convenience store japan night exterior", n: 6, src: "both" },
    n3ds_gachapon: { q: "gachapon capsule toy machine", n: 5, src: "both" },
  },

  jdm: {
    jdm_car: { q: "nissan skyline japanese sports car", n: 14, src: "both" },
    jdm_meet: { q: "car meet night parking modified cars", n: 10, src: "both" },
    jdm_interior: { q: "modified car interior bucket seat", n: 6, src: "both" },
    jdm_detail: { q: "car wheel exhaust detail modified", n: 8, src: "both" },
    jdm_streetnight: { q: "tokyo street night neon wet road", n: 8, src: "both" },
    jdm_parking: { q: "multi storey car park night", n: 6, src: "both" },
    jdm_desk: { q: "dark fabric felt texture", n: 4, src: "commons" },
  },

  "skate-zine": {
    zine_skate: { q: "skateboarder trick street", n: 12, src: "both" },
    zine_paper: { q: "crumpled paper texture scan", n: 6, src: "commons" },
    zine_spray: { q: "spray paint graffiti tag wall", n: 8, src: "both" },
    zine_magazine: { q: "vintage magazine print page", n: 8, src: "commons" },
    zine_skatepark: { q: "skate park concrete bowl", n: 6, src: "both" },
  },

  "xbox-360": {
    x360_console: { q: "xbox 360 console controller", n: 8, src: "both" },
    x360_dew: { q: "soft drink can energy drink", n: 6, src: "both" },
    x360_crisps: { q: "crisp packet snack bag", n: 5, src: "both" },
    x360_setup: { q: "gaming setup television console 2000s", n: 6, src: "both" },
  },

  wii: {
    wii_remote: { q: "wii remote controller nintendo", n: 8, src: "both" },
    wii_console: { q: "nintendo wii console white", n: 6, src: "both" },
    wii_galaxy: { q: "galaxy starfield nebula space", n: 8, src: "commons" },
    wii_planet: { q: "planet sphere space render", n: 6, src: "commons" },
  },

  news: {
    news_studio: { q: "television news studio set", n: 8, src: "both" },
    news_camera: { q: "television broadcast camera studio", n: 5, src: "both" },
    news_radar: { q: "weather radar map meteorology", n: 6, src: "commons" },
    news_crt: { q: "old television set CRT 4:3", n: 6, src: "both" },
    news_greenscreen: { q: "green screen chroma key studio", n: 5, src: "both" },
  },

  "early-internet": {
    // The badges and GIFs come from harvest-buttons.mjs. These are the photographic
    // and texture slots only.
    earlynet_starfield: { q: "starfield night sky stars", n: 8, src: "commons" },
    earlynet_space: { q: "nebula galaxy hubble", n: 8, src: "commons" },
    earlynet_ufo: { q: "flying saucer UFO model", n: 6, src: "both" },
    earlynet_alien: { q: "grey alien extraterrestrial model", n: 5, src: "both" },
    earlynet_tile: { q: "seamless tile pattern texture", n: 8, src: "commons" },
    earlynet_crt: { q: "1990s computer monitor desktop", n: 5, src: "both" },
  },
};

/** Total images the map will attempt. */
export function plannedTotal() {
  return Object.values(SLOTS).reduce(
    (sum, slots) => sum + Object.values(slots).reduce((s, cfg) => s + cfg.n, 0),
    0,
  );
}
