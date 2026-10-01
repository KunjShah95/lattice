// Reports every alternatives edge that is neither a peer section nor the same
// kind. Mirrors the test of the same name so failures can be fixed in one pass
// rather than one build at a time.
const fs = require("node:fs");

const dataSrc = fs.readFileSync("src/lib/data.ts", "utf8");
const attrSrc = fs.readFileSync("src/lib/attributes.ts", "utf8");

// Split data.ts into sections and collect tool -> section.
const sectionRe = /slug:\s*"([^"]+)"[\s\S]*?tools:\s*\[([\s\S]*?)\n    \],/g;
const sectionOf = new Map();
const toolRe = /t\("([^"]+)"/g;
for (const s of dataSrc.matchAll(sectionRe)) {
  for (const t of s[2].matchAll(toolRe)) sectionOf.set(t[1], s[1]);
}

// tool -> alternatives + kind, parsed per entry rather than by regex across
// the file. A lazy `[\s\S]*?` from one entry's name will happily run into the
// *next* entry's alternatives and silently mis-attribute them.
const altsOf = new Map();
const kindOf = new Map();
for (const chunk of attrSrc.split(/\n {2}(?=")/)) {
  const nameMatch = chunk.match(/^"([^"]+)":/);
  if (!nameMatch) continue;
  const name = nameMatch[1];

  const kindMatch = chunk.match(/kind:\s*"([^"]+)"/);
  if (kindMatch) kindOf.set(name, kindMatch[1]);

  const altMatch = chunk.match(/alternatives:\s*\[([^\]]*)\]/);
  if (altMatch) {
    const list = altMatch[1]
      .split(",")
      .map((x) => x.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    if (list.length) altsOf.set(name, list);
  }
}

const bad = [];
for (const [from, list] of altsOf) {
  for (const to of list) {
    if (!sectionOf.has(to)) {
      bad.push(`${from} -> ${to}   (UNKNOWN TOOL)`);
      continue;
    }
    const sameSection = sectionOf.get(from) === sectionOf.get(to);
    const sameKind = kindOf.get(from) === kindOf.get(to);
    if (!sameSection && !sameKind) {
      bad.push(
        `${from} -> ${to}   (${sectionOf.get(from)}/${kindOf.get(from)}  ->  ${sectionOf.get(to)}/${kindOf.get(to)})`,
      );
    }
  }
}

console.log(`tools with alternatives: ${altsOf.size}`);
console.log(`edges checked: ${[...altsOf.values()].reduce((n, l) => n + l.length, 0)}`);
console.log(`bad edges: ${bad.length}`);
for (const b of bad) console.log("  " + b);
