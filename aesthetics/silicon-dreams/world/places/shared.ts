/** Facing from (x, z) toward (cx, cz). */
export const face = (x: number, z: number, cx: number, cz: number) => Math.atan2(cx - x, cz - z);

/** The other ScrapBook channels, as seen on the server's floating screens. */
export const ELSEWHERE = ["frutiger-aero", "liminal", "deep-sea", "vaporwave", "ps1", "dead-mall", "matrix", "wii", "arcade", "space", "academia", "jdm"];
