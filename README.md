# **Last update:** 25/09/2026

# ⚔️ PokeLead

Web app for Pokémon GO PvP. Your real box → PvPoke ranks → Lead / Switch / Closer teams.

## 📖 About

I built PokeLead as a draft assistant for what I actually own in Pokémon GO, not another meta encyclopedia. You add your Pokémon (or import screenshots), pick a league or cup, and get roles, coverage and trio suggestions aligned with [PvPoke](https://pvpoke.com) rankings.

Login and cloud sync are optional (Supabase). Guests can use the box in the browser. Ranking data comes from PvPoke through a small Next.js API proxy.

## ✨ Main Features

- 📦 Box (manual entry, tags, evolve, power up)
- 📷 Screenshot import (OCR + optional Gemini AI)
- 🔐 Auth and cloud sync (Supabase), with guest ↔ account merge
- 📊 Analyze (Overall, Leads, Closers, Switches, and related roles)
- 👥 Teams (Lead / Switch / Closer, score, type coverage, recommend)
- 🧬 Include Evos / Powered toggles when building teams
- 🆚 Compare 1v1
- 🏆 Great / Ultra / Master League plus cups
- ⭐ Top favorites (home theme from your #1 type)
- 📱 Mobile first layout

## 🛠️ Technologies Used

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Zustand

### Backend and data
- Supabase (Auth, PostgreSQL, Storage)
- PvPoke rankings (proxied via `/api/pvpoke`)
- Tesseract.js + optional Gemini (screenshot import)

### Hosting
- Vercel ([pokelead.vercel.app](https://pokelead.vercel.app))

## 📁 Project Structure

```
pokelead/
├── src/
│   ├── app/            # Routes (box, analyze, teams, compare, auth, API)
│   ├── components/     # UI and feature components
│   ├── hooks/
│   ├── lib/            # PvPoke, teams, IV, OCR, sync helpers
│   └── store/          # Zustand box store
├── supabase/migrations/
├── .env.example
└── package.json
```

## 📌 Current status

Usable MVP / soft product. Box, analyze, teams and compare work. Frontend redesign (phase 0) and favorites theme are in. Next ideas: keep/invest decisions, matchup matrix vs meta, share/export.

## 🤝 Contributing

This is a personal project. Suggestions are welcome, but I am not looking for active contributors right now.

## 📄 License

Personal and educational use of the code in this repo. Ranking data © PvPoke. Pokémon © Nintendo / Niantic / The Pokémon Company. PokeLead is an independent fan project.

## 🔗 Links

- **Live app:** https://pokelead.vercel.app
- **Repository:** https://github.com/FranciscoSimas/pokelead
- **Portuguese README:** [README_PT.md](README_PT.md)
