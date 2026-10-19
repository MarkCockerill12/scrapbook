/**
 * What people say. Period-correct small talk for a 1996 3D chat: greetings in caps, a/s/l,
 * people asking how to change their avatar, lag complaints, somebody building a house.
 * Lines are per world; replies are picked by what the visitor typed.
 */

export type WorldId = "hub" | "island" | "cafe" | "void" | "gallery";

export const AMBIENT: Record<WorldId, string[]> = {
  hub: [
    "HELLO EVERYONE!!!",
    "how do u change ur avatar",
    "anyone from ohio",
    "lag is so bad tonight",
    "brb mom needs the phone line",
    "this is sooo cool",
    "has anyone been to the void? its creepy",
    "the red blob thing is the server mascot i think",
    "my modem is 14.4 lol",
    "go thru the portals they go to other worlds",
    "is this real 3D??",
    "wb!",
  ],
  island: [
    "im building a house here",
    "need more bricks",
    "dont fall off the edge lol",
    "this island was empty last week",
    "who made the ladder",
    "nice trees",
    "land is free if u register",
  ],
  cafe: [
    "*sips coffee*",
    "anyone want to play 20 questions",
    "the music in here is so 90s lmao",
    "i met my bf in here",
    "this is the chillest world",
    "whats everyones fav website",
    "*waves*",
  ],
  void: ["...", "is anyone there", "i dont think we should be here", "where does that door go", "afk"],
  gallery: [
    "these were rendered on a supercomputer",
    "the glass ball one is my fav",
    "how is this real time",
    "click the balls on the pool table",
  ],
};

const REPLIES: [RegExp, string[]][] = [
  [/\b(hi|hey|hello|yo|sup|hiya)\b/i, ["hi {nick}!!", "heyy {nick}", "HI!!!", "welcome {nick}"]],
  [/a\/?s\/?l/i, ["16/f/cali", "19/m/texas", "why do u want to know", "15/m/uk"]],
  [/\b(lol|lmao|rofl|haha)\b/i, ["lol", "LOL", "hehe", "rofl"]],
  [/\b(bye|cya|gtg|g2g)\b/i, ["bye {nick}!", "cya", "noooo dont go"]],
  [/\?$/, ["idk", "good question", "ask the server admin", "maybe?"]],
  [/\b(cool|awesome|wow|nice)\b/i, ["ikr", "totally", "its the future"]],
];
const SHRUG = ["lol", "k", "cool", "wut", "same", ":)", "nice", "ok {nick}"];

export function replyTo(text: string, nick: string): string {
  const pool = REPLIES.find(([re]) => re.test(text.trim()))?.[1] ?? SHRUG;
  return pool[Math.floor(Math.random() * pool.length)].replace("{nick}", nick);
}

/** What someone says when the visitor clicks them. */
export function greet(nick: string): string {
  const pool = ["hi {nick}!", "*waves*", "a/s/l?", "nice avatar {nick}", "do i know u", "hey whats up", "lol hi"];
  return pool[Math.floor(Math.random() * pool.length)].replace("{nick}", nick);
}

export function guestName(): string {
  return `Guest_${1000 + Math.floor(Math.random() * 9000)}`;
}
