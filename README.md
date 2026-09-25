# PokeLead

Web app for Pokémon GO PvP: your box → PvPoke-aligned ranks → Lead / Switch / Closer teams.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · Zustand

## Develop / deploy

**No local Node required for production.** Push to GitHub and deploy on Vercel (build runs in the cloud).

```bash
# Only if you choose to run locally later:
npm install
npm run dev
```

## Features (MVP)

- Manual box (forms, Shadow, IVs, moves) — `localStorage`
- Analyze: Overall + Leads / Closers / Switches / Chargers / Attackers / Consistency
- Teams: top cores with explicit roles
- Great / Ultra / Master League
- Sprites via Pokédex number
- Rankings proxied from [PvPoke](https://pvpoke.com) (`/api/pvpoke/...`)

## Credits

Ranking data © PvPoke. Pokémon © Nintendo / Niantic / TPC.
