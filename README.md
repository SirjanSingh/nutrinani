# NutriNani - Decoding Labels for a Healthier You

**🌐 Live demo: [nutrinani.vercel.app](https://nutrinani.vercel.app/)**

A healthcare & wellness GenAI app that helps you scan food labels, get personalized verdicts, safe recipes, and trusted health advice — all tailored to your family's dietary needs, allergies, and health conditions.

## Features

- 🔍 **Food Label Scanner** - Scan ingredients and nutrition labels, get an instant safe/unsafe verdict based on the active profile's health conditions and allergies
- 👥 **Family Profiles** - Netflix-style multiple profiles so every family member gets recommendations tuned to their own diet, allergies, and diseases
- 🍽️ **Personalized Recipes** - Recipes filtered by what's in your pantry and safe for the active profile
- 📦 **Smart Inventory** - Track pantry items with expiry dates, one-click "cook with what I have"
- 💬 **Nani Chatbot** - Conversational health assistant with full chat history (last 5 sessions, autosaved)
- 🎙️ **Voice Bot** - Ask Nani questions hands-free
- 👨‍👩‍👧 **Community** - See what other families are cooking and sharing

## Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + Radix UI + shadcn/ui
- React Router, TanStack Query, React Hook Form + Zod
- `react-markdown` for chatbot replies
- `@zxing/browser` + `tesseract.js` for barcode/OCR scanning

**Backend (AWS, serverless)**
- AWS Lambda (Node.js 20.x) behind API Gateway HTTP API v2
- DynamoDB for inventory, profiles, and chat sessions
- AWS Cognito (User Pool + Hosted UI) for auth, with Google OAuth
- Amazon Bedrock + Gemini for the chatbot
- AWS SAM for infra-as-code

**Hosting**
- Frontend: [Vercel](https://nutrinani.vercel.app/)
- Backend: AWS (ap-southeast-2)

## Getting Started

### Prerequisites

- Node.js 20+ & npm
- An AWS account (only if you want to redeploy the backend — the hosted backend is already live)

### Local development

```bash
git clone https://github.com/SirjanSingh/nutrinani.git
cd nutrinani/nutrinani
npm install
cp .env.example .env       # fill in your Cognito + API values
npm run dev
```

The app runs at `http://localhost:8080`.

### Environment variables

See `.env.example` for the full list. The minimum required set:

| Variable | Purpose |
|---|---|
| `VITE_COGNITO_REGION` | AWS region of your Cognito User Pool |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | Cognito App Client ID (no secret) |
| `VITE_COGNITO_DOMAIN` | Hosted UI domain (needed for Google sign-in) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID |
| `VITE_API_BASE_URL` | API Gateway base URL for the deployed Lambdas |

> `VITE_COGNITO_REDIRECT_SIGN_IN` / `_SIGN_OUT` should be left **unset** in production — the app falls back to `window.location.origin`, which works for every Vercel preview and production URL automatically.

## Deploying

### Frontend → Vercel

This repo is Vercel-ready:
- `vercel.json` configures the Vite build and adds an SPA rewrite (`/* → /index.html`) so React Router deep links don't 404
- **Root Directory** in Vercel project settings: `nutrinani`
- Add the env vars from `.env.example` under Settings → Environment Variables
- Cognito callback URLs and Google OAuth authorized origins must include your Vercel URL

### Backend → AWS SAM

```bash
cd nutrinani/backend/inventory-api
sam build
sam deploy --guided
```

The chat-sessions Lambda (`backend/chat-sessions-api/`) is deployed manually via AWS CLI. It attaches to the same API Gateway (`/chat/sessions`, `/chat/sessions/{id}`) and uses the same Cognito JWT authorizer as the inventory API.

## Project Structure

```
nutrinani/
├── nutrinani/                    # frontend (Vite app, Vercel root)
│   ├── src/
│   │   ├── components/           # UI components
│   │   │   ├── ChatBot.tsx       # Nani chat with markdown + history sidebar
│   │   │   ├── Scanner.tsx       # label scanner (barcode + OCR)
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Inventory.tsx
│   │   │   ├── Recipes.tsx
│   │   │   └── profiles/         # family profile management
│   │   ├── contexts/             # AuthContext, ProfileContext
│   │   ├── lib/                  # amplify config, API clients
│   │   ├── pages/                # route entry points
│   │   └── types/                # shared TS types
│   ├── public/                   # static assets
│   ├── vercel.json               # Vercel SPA config
│   └── .env.example
└── backend/
    ├── inventory-api/            # pantry CRUD Lambda
    └── chat-sessions-api/        # chat history CRUD Lambda
```

## Available Scripts

From `nutrinani/nutrinani/`:

- `npm run dev` – start dev server on `:8080`
- `npm run build` – production build to `dist/`
- `npm run preview` – preview the production build locally
- `npm run lint` – ESLint

## Family Profiles

NutriNani is built around a Netflix-style profile picker:

- Up to **6 profiles** per account
- Each profile stores its own **age, diet type, allergies, diseases, and preferences**
- Switching profiles instantly re-filters recipes, scanner verdicts, and chatbot answers
- Profile data is scoped per-user in DynamoDB (key = Cognito `sub`)

## Author

**Sirjan Singh** — [@SirjanSingh](https://github.com/SirjanSingh)

## License

MIT — see [LICENSE](./LICENSE) for details.

## Support

For support, email support@nutrinani.com or open an issue on this repo.
