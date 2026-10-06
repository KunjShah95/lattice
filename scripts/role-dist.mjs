import { allTools, toolsByRole, toolCount } from "../src/lib/data.ts";
import { ROLE_IDS } from "../src/lib/roles.ts";

const rows = ROLE_IDS.map((id) => [id, toolsByRole(id).length]);
rows.sort((a, b) => b[1] - a[1]);
console.log("total", toolCount);
for (const [id, n] of rows) console.log(id.padEnd(12), String(n).padStart(4), (n / toolCount).toFixed(3));

// where does 'applied' live?
const applied = toolsByRole("applied");
const byCat = {};
for (const t of applied) byCat[t.category.slug] = (byCat[t.category.slug] ?? 0) + 1;
console.log("\napplied by section:");
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) console.log(" ", k.padEnd(24), v);
