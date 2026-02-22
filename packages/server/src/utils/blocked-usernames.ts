/**
 * Blocked username patterns — prevents registration of offensive, misleading,
 * or reserved usernames. All checks are case-insensitive.
 */

// Reserved / system names
const RESERVED = [
  "admin",
  "administrator",
  "mod",
  "moderator",
  "support",
  "help",
  "system",
  "root",
  "bot",
  "official",
  "staff",
  "team",
  "null",
  "undefined",
  "anonymous",
  "deleted",
  "unknown",
];

// Prefix patterns — block usernames that START with these (brand protection)
const RESERVED_PREFIXES = ["emovo"];

// Slurs, hate speech, and offensive terms
// This is intentionally broad to catch common variations (leet speak, etc.)
const OFFENSIVE_PATTERNS = [
  // Racial slurs
  "n[i1!|]gg",
  "n[i1!|]gga",
  "n[i1!|]gger",
  "ch[i1!|]nk",
  "sp[i1!|]c",
  "sp[i1!|]ck",
  "k[i1!|]ke",
  "g[o0]ok",
  "w[e3]tback",
  "beaner",
  "coon",
  "darkie",
  "towelhead",
  "raghead",
  "camelj[o0]ckey",
  "redskin",
  "s[a4]vage",
  "j[i1!|]gaboo",
  "zipperhead",
  "cracker",
  "honky",
  "gringo",
  "gaij[i1!|]n",

  // Homophobic / transphobic
  "f[a4@]gg[o0]t",
  "f[a4@]g",
  "dyke",
  "tr[a4@]nny",
  "tranny",
  "shemale",

  // Sexist / misogynistic
  "wh[o0]re",
  "sl[u\xFC]t",
  "b[i1!|]tch",
  "c[u\xFC]nt",

  // Other hate / extremism
  "nazi",
  "h[i1!|]tler",
  "kkk",
  "wh[i1!|]tepower",
  "whitesupr",
  "h[e3][i1!|]l",
  "jihad",
  "isis",
  "alqaeda",

  // Self-harm related
  "kill(my|your|ur)self",
  "suicide",
  "selfharm",

  // Sexual
  "p[e3]do",
  "p[a4@]edo",
  "r[a4@]p[i1!|]st",
  "molest",
];

/**
 * Check whether a username is blocked. Returns true if the username
 * matches a reserved name or contains offensive patterns.
 */
export function isUsernameBlocked(username: string): { blocked: boolean; reason?: string } {
  const lower = username.toLowerCase().replace(/[\s.-]/g, "");

  // Exact match against reserved names
  if (RESERVED.includes(lower)) {
    return { blocked: true, reason: "reserved" };
  }

  // Prefix match — block "emovo_admin", "emovoapp", etc. but allow exact "emovo"
  for (const prefix of RESERVED_PREFIXES) {
    if (lower.startsWith(prefix) && lower !== prefix) {
      return { blocked: true, reason: "reserved" };
    }
  }

  // Check offensive patterns
  for (const pattern of OFFENSIVE_PATTERNS) {
    try {
      const regex = new RegExp(pattern, "i");
      if (regex.test(lower)) {
        return { blocked: true, reason: "inappropriate" };
      }
    } catch {
      // If regex is invalid, fall back to simple includes
      if (lower.includes(pattern.replace(/\[.*?\]/g, ""))) {
        return { blocked: true, reason: "inappropriate" };
      }
    }
  }

  return { blocked: false };
}
