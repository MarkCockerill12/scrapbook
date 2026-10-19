import type { AvatarSpec } from "./avatar";
import type { WorldId } from "./chat";
import type { Kit } from "./kit";
import { cafe } from "./places/cafe";
import { hub } from "./places/hub";
import { island } from "./places/island";
import { voidWorld } from "./places/void";

/**
 * The worlds on the server. Each is a set piece with a few fixed viewpoints: textured
 * primitives under a photographed sky, people milling about, the floating, spinning,
 * morphing things early 3D worlds were full of, and portals to the others.
 */

type V3 = [number, number, number];

export interface View {
  name: string;
  pos: V3;
  tgt: V3;
}

export interface WorldDef {
  id: Exclude<WorldId, "gallery">;
  name: string;
  sky: number;
  /** Multiplies the sky photo: the void is the same sky, drained. */
  skyTint?: number;
  background: number;
  /** The first is where you arrive. */
  views: View[];
  light: { sky: number; ground: number; sun: number; dir: V3 };
  avatars: AvatarSpec[];
  /** Where the camera may fly. Defaults to a big box over the ground. */
  bounds?: { min: V3; max: V3 };
  /** Units per second. */
  flySpeed?: number;
  build: (k: Kit) => void;
}

export const WORLDS: Record<Exclude<WorldId, "gallery">, WorldDef> = { hub, island, cafe, void: voidWorld };

export const WORLD_NAMES: Record<WorldId, string> = {
  hub: "Ground Zero",
  island: "Sky Island",
  cafe: "CyberCafé",
  void: "The Void",
  gallery: "Render Gallery",
};
