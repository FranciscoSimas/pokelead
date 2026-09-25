# PokeLead — Ponto de situação & roadmap

**Data:** 2026-09-23  
**Live:** https://pokelead.vercel.app/  
**Repo:** https://github.com/FranciscoSimas/pokelead

---

## 1. Onde estamos hoje (honesto)

PokeLead é um **assistente de draft PvP** sólido: a tua box → liga/cup → ranks PvPoke → IVs → cobertura tipada → trios sugeridos / recommend.

**Ainda não** é o sítio onde uma pessoa abre e pensa “isto compete com PoGoTeams / BattleFlow / PvPoke Team Builder”. A lógica base existe; a **experiência e o diferencial competitivo** é que faltam.

### Já feito (manter)

| Área | Estado |
|------|--------|
| Box manual + edit + tags + evolve | OK |
| Import screenshots (AI/OCR) + sync cloud | OK (mobile MIME/HEIC; IVs conservadores — review se AI/bars discordam) |
| Conta Supabase, merge guest↔cloud com dedupe | OK |
| Analyze (roles PvPoke) | OK |
| Teams (Lead/Switch/Closer, score, coverage, recommend) | OK + **Include Evos** (pré-evo → forma final, CP liga, candy) |
| Compare 1v1 | OK (fórmula ≠ Teams **de propósito**) |
| Cups + fallback open league | OK |
| Perf: session cache GM/ranks, IV tables, picker maior | OK |
| Mobile nav / bottom sheets | Aceitável, não “wow” |

### Fraco / a doer (percebe-se esforço a mais)

| Área | Problema |
|------|----------|
| **Frontend geral** | Fase 0 ✅ (tokens + Box/Home/Teams/Analyze/Compare alinhados) |
| **Filtros da Box** | Fase 0 ✅ compactos + sheet |
| **Home** | Layout clássico + tokens; sprites editáveis |
| **Densidade de info** | Melhor em Analyze/Teams/Compare; ainda afinável |
| **Matchups reais** | Só cobertura de **tipos**, não matriz vs meta |
| **Battle / shields** | Não existe |
| **Investimento** | Sem keep/transfer/XL cost |
| **Personalidade** | O site não “conhece” o jogador |

---

## 2. O que “completo + diferenciado” significa

Mercado actual (referência, não copiar):

- **PvPoke** — ranks + battle + matrix (golden data; UI antiga)
- **PoGoTeams / BattleFlow** — box → teams + matchups + (às vezes) sim + build-around

**PokeLead não deve ser “mais um PvPoke clone”.**  
O eixo diferenciador natural (já no ADN do projecto):

> **A tua box real, limpa e rápida, com decisões de draft claras — não uma enciclopédia de meta.**

### 3 pilares de “OK, há esforço / é diferente”

1. **Craft visual** — limpo, moderno, zero clutter (primeira impressão)
2. **Box-first intelligence** — tudo parte do que *tens*, não do top 50 abstracto
3. **Uma feature “só aqui”** — personalização + decisões (favoritos / invest / holes vs meta), não só tabelas

A ideia dos **top 3 Pokémon preferidos** encaixa no pilar 3: o site deixa de ser genérico e passa a ser *teu* (tema, home, “build around”, empty states, recomendações).

---

## 3. Roadmap por fases

### Fase 0 — Frontend redesign ✅ (feito)

**Objectivo:** alguém entra e pensa “produto moderno e limpo”, antes de qualquer feature nova.

Ordem (estado):

1. **Design system** ✅ - tokens, surfaces flat, `.card` / `.btn` / `.field` / `.chip` / `.segment`
2. **Home** ✅ - layout clássico (4 cards + sprites) com tokens; sprites editáveis + sync
3. **Box UX** ✅ - filtros compactos + sheet; form colapsável; cards limpos
4. **Teams / Analyze / Compare** ✅ - mesma linguagem visual; Score em destaque
5. **Mobile polish** ✅ - sheets, safe areas, densidades (parcial + alinhado)

**Não fazer nesta fase:** battle engine, raids, novas páginas grandes.

Critério de done: tu próprio abres a Box e **não** queres esconder os filtros de vergonha. → cumprido.

**Próximo:** Fase 1 (favoritos / box decisions).

---

### Fase 1 - Diferenciação “box + eu”

| Item | Notas |
|------|--------|
| **Include Evos / Powered (Teams)** | ✅ Done: separate EVOs + Powered toggles |
| **Top 3 favoritos** (onboarding / settings) | ✅ Theme from #1 type (Home + Account); not in score |
| **Build around favorite** | Opcional / leve depois do tema |
| **Keep / invest / transfer** por cup | Badge na card da box |
| **XL + Best Buddy no IV rank** | ✅ L51 + buddy cap wired |
| **Mesma espécie: qual guardar?** | Comparar N Blastoise na box |

Isto é o que faz “esforço + pessoal” sem precisar de simular 1000 battles.

---

### Fase 2 — PvP competitivo de verdade

| Item | Notas |
|------|--------|
| **Matriz vs top meta** (dados `matchups` PvPoke) | Maior ROI vs battle engine completo |
| **Holes do trio** em linguagem humana | “Fraco a Azu / Medicham” |
| **Safe switch explícito** | Além do role rank |
| **Score com matchups** (não só tipos) | Teams fica mais crível |
| Battle 1v1 **ou** deep-link PvPoke pré-preenchido | Engine próprio = projecto grande |

---

### Fase 3 — Season, share, polish de produto

- Cup schedule fiável / “active this week”
- Partilhar trio (link)
- Export/import box
- Thumbs guest / HEIC edge cases
- (Opcional) PWA

### Fora do core PvP (adiar)

- Raids / megas / gym / rocket  
Só depois do PvP “wow”.

---

## 4. Ideia: top 3 preferidos (rascunho de produto)

**Onde escolher:** primeiro login / guest “Get started” / Account settings.

**O que muda (sem overbuild):**

- Header / home com os 3 sprites
- Accent color derivado do tipo dominante do #1 (subtile)
- Teams: atalho “Build around [favorite]”
- Recommend: ligeiro boost se o mon é favorito (ou só UI highlight)
- Empty box: “Começa por adicionar o teu [favorite]”

**Não fazer:** skins pesadas, 12 temas, bloquear o resto do site até escolher.

---

## 5. Ordem de execução (acordada)

1. **Frontend redesign** (Fase 0) ✅  
2. Top 3 favoritos + home pessoal (tema, não draft) ✅  
3. Keep / invest / compare same species  
4. Matriz matchups vs meta  
5. Share + export  
6. Battle (próprio ou deep-link)

*(Include Evos no Teams já feito, à parte desta ordem de personalização.)*

---

## 6. Nota estratégica

Completo ≠ ter todas as features da lista.  
Completo *e* diferenciado = **Fase 0 impecável** + **1–2 features “só PokeLead”** (favoritos + box decisions + holes vs meta).

PvPoke continua a ser a fonte de ranks; PokeLead ganha se for **mais limpo, mais teu, e mais acção** (“o que faço com o que tenho?”).

---

*Substitui/actualiza o foco do `PVP_ROADMAP.md` antigo (features PvP puras). Manter ambos: este = produto + UX; o outro = backlog competitivo detalhado.*
