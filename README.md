# Career-a-vis-AI

Interactive data visualization project exploring AI's impact on jobs, industries, salaries, and automation risk.

## Tech Stack

- React 19
- TypeScript
- Vite
- D3.js
- ESLint + Prettier

## Prerequisites

- Node.js 20+ (recommended: latest LTS)
- npm 10+

Check versions:

```bash
node -v
npm -v
```

## Quick Start

1. Clone the repository.
2. Open a terminal in the project root.
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open the local URL shown in terminal (usually `http://localhost:5173`).

## Available Scripts

- `npm run dev`: Start Vite dev server with hot reload.
- `npm run build`: Build production files into `dist/`.
- `npm run preview`: Preview the production build locally.
- `npm run lint`: Run ESLint checks.
- `npm run format`: Format source files with Prettier.

## Build for Production

```bash
npm run build
```

Output is generated in:

- `dist/`

To preview the production build:

```bash
npm run preview
```

## Project Structure

```text
Career-a-vis-AI/
├─ public/
│  ├─ db/                      # CSV + topology data used by charts
│  ├─ images/                  # UI and visualization assets
│  └─ GoogleSans-Regular.ttf
├─ src/
│  ├─ charts/                  # D3/React chart components
│  ├─ components/              # Shared UI wrappers/sections
│  ├─ pages/                   # Page/section-level components + CSS
│  ├─ utils/
│  │  └─ paths.ts              # Helpers for public asset/data URLs
│  ├─ App.tsx                  # Main application composition
│  └─ main.tsx                 # App bootstrap
├─ index.html
├─ package.json
└─ vite.config.js
```

## Data Sources in This Repo

Main datasets are stored under `public/db/`:

- `ai_impact_jobs_2010_2025.csv`
- `AI_index_db.csv`
- `ai_job_trends_dataset.csv`
- `jobstreet_all_job_dataset.csv`
- `metrics.csv`
- `world-110m.json`

These files are loaded at runtime through helper utilities in `src/utils/paths.ts`.

## Notes for Teammates

- Keep CSV filenames unchanged unless you also update all references in code.
- If you add new public assets, put them under `public/` and reference them via the path helpers.
- Run `npm run lint` before pushing.

## Troubleshooting

### `npm install` fails

- Delete `node_modules` and `package-lock.json`, then reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Port already in use

Run dev server on another port:

```bash
npm run dev -- --port 5174
```

### Build issues

- Confirm Node and npm versions match prerequisites.
- Run a clean install and rebuild:

```bash
npm install
npm run build
```

## License

If this is for a course team project, add your preferred license here (for example MIT) once finalized.
