# Git Visualizer — Frontend

React 19 + Vite app for the Git Visualizer educational playground. Talks to the
Spring Boot backend (`../Git Visualizer-Backend`, default `http://localhost:8080`)
over its REST API; git command *simulation* runs entirely client-side.

## Run

```
npm install
npm run dev        # http://localhost:5173 (CORS-allowed by the backend)
npm run build      # production bundle in dist/
```

The backend must be running (`docker compose up -d` in the backend folder) — if it
isn't, the app shows an interruption screen with a retry button.

Set `VITE_API_BASE` to point at a different backend origin.

## Structure

```
src/
├── main.jsx              entry, router
├── App.jsx               content loading, theme, progress state, routes
├── api.js                REST calls (loads the whole command library at boot)
├── index.css             design tokens (light/dark), keyframes, responsive rules
├── lib/
│   ├── gitSim.js         client-side git simulation + live graph layout
│   ├── graphRender.js    designed before/after graph layout
│   └── format.jsx        `code`/*bold* text formatting, area chip styles
└── components/
    ├── Landing.jsx       header, rotating hero, command grid, free-play banner
    ├── Workspace.jsx     sidebar (accordion + mobile drawer), lesson, sandbox, right panel
    ├── graphs.jsx        SVG renderers (lesson + live)
    ├── ErrorScreen.jsx   backend-unreachable screen
    ├── ResetModal.jsx    themed reset-progress confirmation
    ├── ThemeButton.jsx   dark-mode toggle
    └── Footer.jsx        credit + LinkedIn link

Routes:  /  ·  /commands/:id  ·  /free
```

## Behavior notes

- Progress ("X of 26 visited") and theme live in localStorage (`gv-learned-v2`,
  `gv-theme`) — no accounts, nothing server-side.
- Lesson graphs open static on the **Before** state; entrance animations only play
  via "▶ Play transition".
- Graph SVG colors are computed by the layout engines, which take a `dark` flag —
  CSS variables handle everything else.
