# **Último update:** 25/09/2026

# ⚔️ PokeLead

App web para PvP de Pokémon GO. A tua box real → ranks PvPoke → equipas Lead / Switch / Closer.

## 📖 Sobre

Fiz o PokeLead como assistente de draft para o que tenho de verdade no Pokémon GO, não como mais uma enciclopédia de meta. Adicionas os teus Pokémon (ou importas screenshots), escolhes liga ou cup, e recebes roles, cobertura e sugestões de trio alinhadas com os rankings do [PvPoke](https://pvpoke.com).

O login e o sync na cloud são opcionais (Supabase). Em guest a box fica no browser. Os ranks vêm do PvPoke através de um proxy na API Next.js.

## ✨ Funcionalidades principais

- 📦 Box (entrada manual, tags, evolve, power up)
- 📷 Import por screenshot (OCR + Gemini AI opcional)
- 🔐 Auth e sync na cloud (Supabase), com merge guest ↔ conta
- 📊 Analyze (Overall, Leads, Closers, Switches e roles relacionados)
- 👥 Teams (Lead / Switch / Closer, score, cobertura de tipos, recommend)
- 🧬 Toggles Include Evos / Powered na construção de equipas
- 🆚 Compare 1v1
- 🏆 Great / Ultra / Master League e cups
- ⭐ Top favoritos (tema da home a partir do tipo do #1)
- 📱 Layout mobile first

## 🛠️ Tecnologias utilizadas

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Zustand

### Backend e dados
- Supabase (Auth, PostgreSQL, Storage)
- Rankings PvPoke (proxy em `/api/pvpoke`)
- Tesseract.js + Gemini opcional (import de screenshots)

### Hosting
- Vercel ([pokelead.vercel.app](https://pokelead.vercel.app))

## 📁 Estrutura do projeto

```
pokelead/
├── src/
│   ├── app/            # Rotas (box, analyze, teams, compare, auth, API)
│   ├── components/     # UI e componentes de features
│   ├── hooks/
│   ├── lib/            # PvPoke, teams, IV, OCR, sync
│   └── store/          # Store Zustand da box
├── supabase/migrations/
├── .env.example
└── package.json
```

## 📌 Estado atual

MVP / produto soft utilizável. Box, analyze, teams e compare funcionam. Redesign frontend (fase 0) e tema de favoritos já estão. Próximas ideias: keep/invest, matriz de matchups vs meta, partilha/export.

## 🤝 Contribuir

Este é um projeto pessoal. Sugestões são bem-vindas, mas neste momento não estou à procura de contribuidores ativos.

## 📄 Licença

Uso pessoal e educacional do código deste repositório. Dados de ranking © PvPoke. Pokémon © Nintendo / Niantic / The Pokémon Company. O PokeLead é um projecto fan independente.

## 🔗 Links

- **App:** https://pokelead.vercel.app
- **Repositório:** https://github.com/FranciscoSimas/pokelead
- **README em inglês:** [README.md](README.md)
