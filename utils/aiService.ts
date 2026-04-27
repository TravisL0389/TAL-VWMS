// =============================================================================
// AI Service — Gemini-powered Smart Pull planner with a deterministic
// nearest-neighbour fallback so the app stays useful without an API key.
// =============================================================================
import { GoogleGenAI, Type } from '@google/genai';
import type {
  Order, OrderLine, InventoryItem, Rack, PullPlan, PullStep,
} from '../types';

// In Vite the value is injected via define(); in other runtimes it may be undefined.
const apiKey =
  (typeof process !== 'undefined' && (process as any)?.env?.API_KEY) ||
  (typeof process !== 'undefined' && (process as any)?.env?.GEMINI_API_KEY) ||
  '';

let ai: GoogleGenAI | null = null;
try {
  if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (err) {
  console.warn('[ai] failed to init Gemini:', err);
}

export const isAIConfigured = (): boolean => ai !== null;

// ---------------------------------------------------------------------------
// Heuristic planner — used when AI is off, missing, or fails.
// Strategy: nearest-neighbour over rack centres starting at door (0,0).
// ---------------------------------------------------------------------------
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function rackCentre(r: Rack) {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

interface PlanInputs {
  order: Order;
  inventory: InventoryItem[];
  racks: Rack[];
}

function buildSteps(inp: PlanInputs): { steps: PullStep[]; warnings: string[] } {
  const { order, inventory, racks } = inp;
  const warnings: string[] = [];
  const stops: { line: OrderLine; item: InventoryItem | null; rack: Rack | null }[] = [];

  for (const line of order.lines) {
    const item = inventory.find(i => i.id === line.itemId || i.sku === line.sku) || null;
    const rack = item?.rackId ? racks.find(r => r.id === item.rackId) || null : null;

    if (!item) {
      warnings.push(`No inventory record found for "${line.name}" (${line.sku}).`);
    } else if (item.available < line.quantity) {
      warnings.push(`Low stock on "${line.name}": need ${line.quantity}, only ${item.available} available.`);
    }
    if (item && item.status === 'REPAIR') {
      warnings.push(`"${line.name}" is currently flagged for repair.`);
    }
    if (item && !rack) {
      warnings.push(`"${line.name}" has no assigned location yet.`);
    }
    stops.push({ line, item, rack });
  }

  // Nearest-neighbour through rack centres.
  const ordered: typeof stops = [];
  let current = { x: 0, y: 0 };
  const remaining = [...stops];
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i].rack;
      const c = r ? rackCentre(r) : { x: 9_999_999, y: 9_999_999 };
      const d = distance(current, c);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    if (next.rack) current = rackCentre(next.rack);
    ordered.push(next);
  }

  const steps: PullStep[] = ordered.map(({ line, item, rack }) => ({
    itemId: item?.id ?? line.itemId,
    itemName: line.name,
    sku: line.sku,
    quantity: line.quantity,
    rackId: rack?.id ?? '—',
    rackName: rack?.name || rack?.id || 'Unassigned',
    shelf: item?.shelf,
    position: item?.position,
    estimatedSeconds: 45 + (rack ? Math.round(distance({ x: 0, y: 0 }, rackCentre(rack)) / 200) : 0),
    reasoning: rack
      ? `Nearest stop on the optimised route from the previous location.`
      : `No location assigned — handle manually.`,
    warning:
      !item ? 'No inventory record' :
      item.available < line.quantity ? `Only ${item.available} of ${line.quantity} available` :
      item.status === 'REPAIR' ? 'Item flagged for repair' : undefined,
  }));

  return { steps, warnings };
}

export function buildHeuristicPlan(inp: PlanInputs): PullPlan {
  const { steps, warnings } = buildSteps(inp);
  const total = steps.reduce((s, x) => s + x.estimatedSeconds, 0);
  return {
    orderId: inp.order.id,
    steps,
    totalEstimatedSeconds: total,
    warnings,
    notes: 'Generated with the built-in nearest-neighbour route planner.',
    generatedBy: 'HEURISTIC',
    generatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Gemini-powered planner — asks the model to refine ordering and reasoning,
// and to surface anomalies the heuristic might miss.
// ---------------------------------------------------------------------------
const PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    orderedItemIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'item ids in the optimal pulling order',
    },
    perStepReasoning: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          itemId: { type: Type.STRING },
          reasoning: { type: Type.STRING },
        },
      },
    },
    overallNotes: { type: Type.STRING },
    anomalies: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['orderedItemIds'],
};

export async function buildAIPlan(inp: PlanInputs): Promise<PullPlan> {
  // Always start from the heuristic result so we have a sensible baseline.
  const baseline = buildHeuristicPlan(inp);
  if (!ai) return baseline;

  // Compact summary for the model — coords matter; everything else is short.
  const summary = {
    door: { x: 0, y: 0 },
    racks: inp.racks.map(r => ({
      id: r.id, name: r.name || r.id,
      centre: rackCentre(r),
      occupancy: r.occupied, capacity: r.capacity,
      status: r.status,
    })),
    items: inp.order.lines.map(line => {
      const item = inp.inventory.find(i => i.id === line.itemId || i.sku === line.sku);
      return {
        itemId: item?.id ?? line.itemId,
        sku: line.sku, name: line.name,
        needed: line.quantity,
        available: item?.available ?? 0,
        rackId: item?.rackId ?? null,
        shelf: item?.shelf, position: item?.position,
        status: item?.status ?? 'UNKNOWN',
      };
    }),
  };

  const prompt = `You are a warehouse pull-route optimiser. Given the door at (0,0), a list of racks with centre coordinates, and a list of items to collect, produce the pull order that minimises total walking distance while respecting practical constraints:
- group stops at the same rack together
- bulky/heavy items last when possible
- flag any item whose available stock is below the requested quantity
- flag any item whose status is REPAIR or whose rack is OFFLINE/MAINTENANCE
Return JSON matching the supplied schema. Use the provided itemId values only. Order: ${inp.order.reference}.

Data:\n${JSON.stringify(summary, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: PLAN_SCHEMA,
      },
    });

    const text = (response as any).text ?? '';
    const parsed = JSON.parse(text);
    const reasoningById: Record<string, string> = {};
    for (const r of (parsed.perStepReasoning ?? [])) {
      reasoningById[r.itemId] = r.reasoning;
    }

    const orderedIds: string[] = parsed.orderedItemIds || [];
    const stepMap = new Map(baseline.steps.map(s => [s.itemId, s]));
    const reordered: PullStep[] = [];
    for (const id of orderedIds) {
      const s = stepMap.get(id);
      if (s) {
        reordered.push({ ...s, reasoning: reasoningById[id] || s.reasoning });
        stepMap.delete(id);
      }
    }
    // Append any stragglers the model omitted.
    for (const s of stepMap.values()) reordered.push(s);

    return {
      ...baseline,
      steps: reordered,
      warnings: [...baseline.warnings, ...(parsed.anomalies ?? [])],
      notes: parsed.overallNotes || baseline.notes,
      generatedBy: 'AI',
      generatedAt: Date.now(),
    };
  } catch (err) {
    console.warn('[ai] planner fell back to heuristic:', err);
    return baseline;
  }
}

// ---------------------------------------------------------------------------
// Inventory anomaly detector — used by Dashboard to surface insights.
// ---------------------------------------------------------------------------
export interface InventoryInsight {
  level: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
}

export function localInsights(inventory: InventoryItem[]): InventoryInsight[] {
  const out: InventoryInsight[] = [];
  const lowStock = inventory.filter(i => i.available > 0 && i.available <= Math.max(2, Math.floor(i.quantity * 0.15)));
  const oos = inventory.filter(i => i.available === 0 && i.status !== 'RETIRED');
  const repair = inventory.filter(i => i.status === 'REPAIR');
  if (oos.length > 0) out.push({ level: 'CRITICAL', message: `${oos.length} item${oos.length > 1 ? 's' : ''} out of stock.` });
  if (lowStock.length > 0) out.push({ level: 'WARN', message: `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} running low.` });
  if (repair.length > 0) out.push({ level: 'INFO', message: `${repair.length} item${repair.length > 1 ? 's' : ''} in repair.` });
  if (out.length === 0) out.push({ level: 'INFO', message: 'All inventory is healthy.' });
  return out;
}

export async function aiInsights(inventory: InventoryItem[]): Promise<InventoryInsight[]> {
  const baseline = localInsights(inventory);
  if (!ai || inventory.length === 0) return baseline;
  try {
    const compact = inventory.slice(0, 200).map(i => ({
      sku: i.sku, name: i.name, qty: i.quantity, avail: i.available, status: i.status,
    }));
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Review this warehouse inventory snapshot and return up to 4 short, plain-English insights for an operations manager. Focus on stockouts, low stock, items in repair, and unusual ratios. Each insight should be one sentence.\n\n${JSON.stringify(compact)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING },
                  message: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });
    const text = (response as any).text ?? '';
    const parsed = JSON.parse(text);
    const items: InventoryInsight[] = (parsed.insights || []).map((x: any) => ({
      level: ['INFO', 'WARN', 'CRITICAL'].includes(x.level) ? x.level : 'INFO',
      message: String(x.message || ''),
    })).filter((x: InventoryInsight) => x.message);
    return items.length ? items : baseline;
  } catch (err) {
    console.warn('[ai] insights fell back to heuristic:', err);
    return baseline;
  }
}
