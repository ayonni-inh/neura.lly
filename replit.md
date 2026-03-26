# neurAlly 2.0

An AI-powered cognitive extension and strategic partner application built with React + Vite + TypeScript.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Build Tool:** Vite (port 5000)
- **AI:** Google Gemini via `@google/genai`
- **Storage:** IndexedDB (local-first) + optional Supabase sync
- **Animations:** Framer Motion (motion)
- **Icons:** lucide-react

## Project Structure

```
.
├── App.tsx             # Main application logic and routing
├── index.tsx           # App entry point
├── index.html          # HTML template
├── vite.config.ts      # Vite config (port 5000, allowedHosts: true)
├── types.ts            # TypeScript interfaces
├── constants.ts        # App-wide constants and model names
├── components/         # UI components
├── services/           # API and DB integrations (geminiService, db)
└── utils/              # Helpers (markdown renderer, supabase client)
```

## Running the App

```bash
npm install
npm run dev
```

App runs at http://localhost:5000

## Environment Variables

- `GEMINI_API_KEY` — Google Gemini API key (required for AI features)
- Supabase credentials (optional, for cloud sync): configure in `utils/supabase.ts`

## Deployment

Configured as a static site deployment:
- Build: `npm run build`
- Public directory: `dist`
