# neurAlly 2.0 — Cognitive Mirror AI Assistant

An AI-powered cognitive extension and strategic partner application. Works as an externalized executive function—analyzing user input, maintaining persistent context, and reflecting insights back to accelerate decision-making.

## Core Philosophy: The Cognitive Mirror

**Three Foundational Pillars:**
1. **Reduction of Cognitive Load** — Filter chaos into clarity; turn "what should I do?" into "do this"
2. **Preservation of Context** — Maintain continuous narrative; identify patterns users are too close to see
3. **Pragmatic Feedback Loop** — Reflect contradictions, force confrontation with constraints, optimize for momentum

**The Core Equation:** `Input (Your Ambiguity) + Context (Our History) + Constraints (Reality) = High-Impact Action`

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Build Tool:** Vite (port 5000)
- **AI:** Google Gemini via `@google/genai`
- **Storage:** IndexedDB (local-first) + optional Supabase sync
- **Cognitive Engine:** Proprietary reflection loop, personality adaptation, and memory management
- **Animations:** Framer Motion (motion)
- **Icons:** lucide-react

## Architecture: The Cognitive Brain Layers

```
.
├── App.tsx                     # Main orchestrator & chat interface
├── services/
│   ├── cognitiveEngine.ts      # BRAIN: Reflection loops, belief tracking, personality drift
│   ├── geminiService.ts        # AI interface (text, image, video generation)
│   └── db.ts                   # Persistence: IndexedDB + Supabase sync
├── types.ts                    # Data structures (UserBelief, ConversationTheme, CognitiveState, etc.)
├── constants.ts                # System instructions (enforces Cognitive Mirror behavior)
├── components/                 # UI layer (reflection surface)
└── utils/                      # Helpers (markdown, supabase)
```

## Cognitive Features

### 1. Memory & Context Layers
- **User Beliefs** — Extracts and tracks core beliefs mentioned in conversation
- **Conversation Themes** — Detects recurring topics (Career, Financial, Health, Creativity, Decision Making, etc.)
- **Growth Metrics** — Tracks personal development and progress over time
- **Persistent State** — All cognitive data saved to IndexedDB, survives sessions

### 2. Reflection Engine
- **Cognitive Analysis** — Before responding, analyzes user beliefs and themes
- **Pattern Detection** — Identifies cycles, contradictions, and blind spots
- **Context Injection** — Prepends user profile and cognitive history to every prompt
- **Structured Footer** — Every response ends with **Insight**, **Opportunity**, **Action** (IOA)

### 3. Personality Adaptation
- **Communication Style Detection** — Direct, collaborative, exploratory, or technical
- **Emotional Pattern Recognition** — Calm, energetic, anxious, or focused states
- **Decision Style Tracking** — Analytical, intuitive, pragmatic, or balanced approaches
- **Real-Time Adaptation** — AI adjusts tone and depth based on detected patterns

## Running the App

```bash
npm install
npm run dev
```

App runs at http://localhost:5000

## Environment Variables

Required:
- `VITE_GEMINI_API_KEY` — Google Gemini API key (required for AI features)
- Or: `VITE_API_KEY` — Alternative variable name

Optional:
- Supabase credentials (for cloud sync): configure in `utils/supabase.ts`

## Key Functions

### CognitiveEngine (services/cognitiveEngine.ts)
- `updateState(messages, userProfile)` — Update engine with new conversation data
- `generateIOA(userMessage, profile)` — Generate Insight/Opportunity/Action footer
- `buildContextInjection(profile)` — Create context window for prompt injection
- `extractBeliefs(message)` — Mine user beliefs from natural language
- `detectThemes(messages)` — Identify conversation themes and intensity
- `adaptPersonality(userMessage, response)` — Learn communication patterns

### Database (services/db.ts)
- `getCognitiveState()` / `saveCognitiveState(state)` — Persist cognitive memory
- `getProfile()` / `saveProfile(profile)` — User profile management

## Deployment

Configured as a static site deployment:
- Build: `npm run build`
- Public directory: `dist`

## How It Works: The Thought Flow

1. **User sends message** → Cognitive engine analyzes against stored beliefs/themes
2. **Context injection** → User history, goals, and detected patterns prepended to prompt
3. **AI processes** → Gemini responds with full context (not reset between messages)
4. **IOA footer added** → Response includes actionable Insight, Opportunity, and Action
5. **State updated** → New beliefs extracted, themes updated, personality refined
6. **Saved to storage** → Cognitive state persists for next session

This ensures the AI never resets, continuously learns your patterns, and optimizes for your momentum.
