# Clydra AI

A modern AI chat application built with Next.js and TypeScript.

## Quick Start

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd clydra-ai
   npm install
   ```

2. **Set up environment**:
   Create `.env.local` with:
   ```bash
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   ```

3. **Run the app**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- Chat with AI models (Grok, Claude, GPT-4)
- Web search integration
- Dark/light mode
- Mobile responsive
- File attachments
- Chat history

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Database**: Supabase
- **AI**: OpenRouter API
- **Search**: Exa AI

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - Code linting
