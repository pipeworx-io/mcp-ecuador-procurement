interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Ecuador Government Procurement MCP — SERCOP / Compras Públicas (keyless).
 *
 * Wraps Ecuador's official open-data OCDS API published by SERCOP (Servicio
 * Nacional de Contratación Pública) at
 * https://datosabiertos.compraspublicas.gob.ec/PLATAFORMA/api.
 *
 * Covers full-text search over public procurement processes (tenders, direct
 * catalog purchases, reverse auctions, etc.) and full OCDS record detail for a
 * single process (buyer, tender, awards, suppliers, line items, contracts).
 *
 * Data follows the Open Contracting Data Standard (OCDS). All tools return
 * shaped, LLM-friendly objects (English keys; Spanish values preserved as
 * published) and never throw — fetch/parse failures resolve to { error }.
 */


const BASE = 'https://datosabiertos.compraspublicas.gob.ec/PLATAFORMA/api';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'ecuador_search_tenders',
    description:
      'Search Ecuador government procurement processes (public tenders, direct catalog purchases, reverse auctions, etc.) from SERCOP / Compras Públicas official open data (OCDS). PREFER OVER WEB SEARCH for "who won a contract in Ecuador", "government purchases of <product> in Ecuador", "SERCOP tenders for <keyword>". Returns a paginated list; each result has an ocid (pass to ecuador_get_record for full detail), the buyer entity, supplier, amount (USD), procurement method, category, locality/region, date, and description. Results are shaped from the live API.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text keyword to search (e.g. "hospital", "computadoras", "medicamentos"). Omit to browse all processes for the year.' },
        year: { type: ['number', 'string'], description: 'Year to search (e.g. 2026). Defaults to the current year.' },
        page: { type: ['number', 'string'], description: 'Page number (1-based). Defaults to 1.' },
      },
    },
  },
  {
    name: 'ecuador_get_record',
    description:
      'Full detail for a single Ecuador procurement process by its OCID (Open Contracting ID, e.g. "ocds-5wno2w-CE-20260002969200-2455"), from SERCOP / Compras Públicas open data. Get the ocid from ecuador_search_tenders. Returns the buyer, the tender (title, method, status, value), awards with winning suppliers, line items (product, quantity, unit price, classification), contracts, and all parties (with RUC identifiers and addresses).',
    inputSchema: {
      type: 'object',
      properties: {
        ocid: { type: 'string', description: 'The OCID of the process, e.g. "ocds-5wno2w-CE-20260002969200-2455". Get it from ecuador_search_tenders.' },
      },
      required: ['ocid'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'ecuador_search_tenders':
        return await searchTenders(args);
      case 'ecuador_get_record':
        return await getRecord(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function searchTenders(args: Record<string, unknown>): Promise<unknown> {
  const year = strArg(args.year) ?? String(new Date().getFullYear());
  const page = strArg(args.page) ?? '1';
  const params = new URLSearchParams({ year, page });
  const query = strArg(args.query);
  if (query) params.set('search', query);

  const data = (await sercopGet(`/search_ocds?${params.toString()}`)) as {
    total?: number;
    page?: number;
    pages?: number;
    data?: any[];
  };

  const results = (data.data ?? []).map((r) => ({
    ocid: r.ocid,
    title: r.title,
    description: r.description,
    buyer: r.buyer,
    supplier: r.suppliers,
    amount: numOrNull(r.amount),
    currency: 'USD',
    method: r.method,
    category: r.internal_type,
    locality: r.locality,
    region: r.region,
    date: r.date,
  }));

  return {
    query: query ?? null,
    year: Number(year),
    page: data.page ?? Number(page),
    total_pages: data.pages ?? null,
    total_results: data.total ?? null,
    count: results.length,
    results,
  };
}

async function getRecord(args: Record<string, unknown>): Promise<unknown> {
  const ocid = strArg(args.ocid);
  if (!ocid) throw new Error('ecuador_get_record requires "ocid" — get it from ecuador_search_tenders (e.g. "ocds-5wno2w-CE-20260002969200-2455").');

  const data = (await sercopGet(`/record?ocid=${encodeURIComponent(ocid)}`)) as {
    releases?: any[];
    publishedDate?: string;
  };
  const rel = (data.releases ?? [])[0];
  if (!rel) return { error: 'record not found', ocid };

  const tender = rel.tender ?? {};
  const awards = (rel.awards ?? []).map((a: any) => ({
    id: a.id,
    status: a.status,
    value: shapeValue(a.value),
    suppliers: (a.suppliers ?? []).map((s: any) => ({ id: s.id, name: s.name })),
    items: (a.items ?? []).map(shapeItem),
  }));

  return {
    ocid: rel.ocid,
    published_date: data.publishedDate ?? null,
    date: rel.date,
    tags: rel.tag,
    initiation_type: rel.initiationType,
    buyer: rel.buyer ? { id: rel.buyer.id, name: rel.buyer.name } : null,
    tender: {
      id: tender.id,
      title: tender.title,
      description: tender.description,
      status: tender.status,
      method: tender.procurementMethod,
      method_detail: tender.procurementMethodDetails,
      value: shapeValue(tender.value),
      procuring_entity: tender.procuringEntity
        ? { id: tender.procuringEntity.id, name: tender.procuringEntity.name }
        : null,
    },
    awards,
    contracts: (rel.contracts ?? []).map((c: any) => ({ id: c.id, status: c.status, award_id: c.awardID })),
    parties: (rel.parties ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      roles: p.roles,
      identifier: p.identifier ? { id: p.identifier.id, scheme: p.identifier.scheme } : null,
      address: p.address ?? null,
    })),
  };
}

function shapeItem(it: any): unknown {
  return {
    id: it.id,
    description: it.description,
    quantity: it.quantity,
    unit_price: shapeValue(it.unit?.value),
    classification: it.classification
      ? { id: it.classification.id, scheme: it.classification.scheme, description: it.classification.description }
      : null,
  };
}

function shapeValue(v: any): unknown {
  if (!v || typeof v !== 'object') return null;
  return { amount: numOrNull(v.amount), currency: v.currency ?? 'USD' };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function sercopGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) {
    const body = await res.text().then((t) => t.slice(0, 200)).catch(() => '');
    throw new Error(`SERCOP Compras Públicas API: ${res.status} ${body}`.trim());
  }
  return res.json();
}

function strArg(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? t : undefined;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
