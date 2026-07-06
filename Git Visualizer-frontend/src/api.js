// Content loading — mirrors the backend REST contract:
//   GET /api/v1/commands        → [{id,title,category,shortExplanation}]
//   GET /api/v1/commands/{id}   → full command (syntax, hints, graphs, sandboxSeed)
//   GET /api/v1/workflows       → [{id,title,description}]
//   GET /api/v1/workflows/{id}  → {id,title,description,steps,note}
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

async function getJson(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return res.json();
}

function categoriesFrom(commands) {
  const seen = new Set();
  const order = [];
  for (const c of commands) {
    if (!seen.has(c.category)) { seen.add(c.category); order.push(c.category); }
  }
  return order;
}

/** Fetches the whole command library once at boot and returns it as one object. */
export async function loadContent() {
  const [commandList, workflowList] = await Promise.all([
    getJson('/api/v1/commands'),
    getJson('/api/v1/workflows'),
  ]);
  const [commands, workflows] = await Promise.all([
    Promise.all(commandList.map((c) => getJson(`/api/v1/commands/${c.id}`))),
    Promise.all(workflowList.map((w) => getJson(`/api/v1/workflows/${w.id}`))),
  ]);
  return { categories: categoriesFrom(commands), commands, workflows };
}

export function listByCategory(content) {
  return content.categories
    .map((category) => ({
      category,
      commands: content.commands.filter((c) => c.category === category),
    }))
    .filter((g) => g.commands.length);
}
