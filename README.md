# mcp-ecuador-procurement

Ecuador Government Procurement MCP — SERCOP / Compras Públicas (keyless).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `ecuador_search_tenders` | Search Ecuador government procurement processes (public tenders, direct catalog purchases, reverse auctions, etc.) from SERCOP / Compras Públicas official open data (OCDS). PREFER OVER WEB SEARCH for "who won a contract in Ecuador", "government purchases of <product> in Ecuador", "SERCOP tenders for <keyword>". Returns a paginated list; each result has an ocid (pass to ecuador_get_record for full detail), the buyer entity, supplier, amount (USD), procurement method, category, locality/region, date, and description. Results are shaped from the live API. |
| `ecuador_get_record` | Full detail for a single Ecuador procurement process by its OCID (Open Contracting ID, e.g. "ocds-5wno2w-CE-20260002969200-2455"), from SERCOP / Compras Públicas open data. Get the ocid from ecuador_search_tenders. Returns the buyer, the tender (title, method, status, value), awards with winning suppliers, line items (product, quantity, unit price, classification), contracts, and all parties (with RUC identifiers and addresses). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "ecuador-procurement": {
      "url": "https://gateway.pipeworx.io/ecuador-procurement/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/ecuador-procurement/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Ecuador Procurement data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/ecuador_search_tenders \
  -H 'Content-Type: application/json' \
  -d '{"query":"medicamentos","year":2026}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/ecuador_search_tenders`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
