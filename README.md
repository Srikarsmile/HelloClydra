# Clydra AI

A modern, feature-rich AI chat application built with Next.js, TypeScript, and cutting-edge web technologies. Experience seamless conversations with advanced AI models, web search integration, and a pixel-perfect responsive design optimized for all devices.

## Quick Start (Simple Mode)

If you want to skip authentication setup and get started quickly:

1. **Clone and install**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/clydra-ai.git
   cd clydra-ai
   npm install
   ```

2. **Set up minimal environment**:
   ```bash
   # Create .env.local with minimal required variables
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   ```

3. **Run the app**:
   ```bash
   npm run dev
   ```

The app now uses a simple landing page that bypasses Clerk authentication issues and allows direct access to the chat interface.

## 🆕 Recent Updates

### **UI/UX Improvements**
- ✅ **Fixed theme toggle positioning** - Optimized theme switch button for mobile devices (reduced from 48px to 40px)
- ✅ **Improved navigation bar** - Mobile header reduced by ~15% for better screen real estate
- ✅ **Removed input borders** - Clean, borderless chat input with no unwanted lines
- ✅ **Fixed plus menu positioning** - Attachment menu now properly appears above input instead of being clipped
- ✅ **Enhanced touch targets** - Better mobile accessibility with optimized button sizes
- ✅ **Consolidated components** - Removed duplicate theme toggle implementations

### **Performance Optimizations**
- ⚡ **Faster builds** - Turbopack integration for lightning-fast development
- 🎨 **Smoother animations** - Reduced animation complexity for better performance
- 📱 **Mobile-first CSS** - Optimized stylesheets for mobile devices
- 🔧 **Code cleanup** - Removed unused styles and consolidated CSS rules

## ✨ Features

### 🎨 **Modern UI/UX Design**
- **Pixel-perfect interface** - Clean, modern chat experience with glass morphism effects
- **Dark/Light mode** - Seamless theme switching with smooth transitions
- **Mobile-first responsive** - Optimized navigation and touch interactions for all screen sizes
- **Accessibility focused** - WCAG compliant with proper contrast ratios and keyboard navigation

### 🤖 **Advanced AI Integration**
- **Multiple AI models** - Powered by Grok-4, Claude, and other top models via OpenRouter API
- **Context-aware conversations** - Maintains conversation history and context
- **Streaming responses** - Real-time response streaming for immediate feedback
- **Smart model selection** - Automatic model switching based on task complexity

### 🌐 **Intelligent Web Search**
- **Real-time web search** - Live information retrieval with Exa AI integration
- **Source citations** - Automatic citation and source management
- **Research synthesis** - Combines web data with AI reasoning

### 🔬 **Deep Research Capabilities**
- **Asynchronous research tasks** - Background processing for complex research queries
- **Comprehensive reports** - Structured markdown reports with citations
- **Schema-based outputs** - Generate structured data matching JSON schemas
- **Multi-source analysis** - Synthesizes information from multiple web sources

### 💾 **Data Management**
- **Persistent chat history** - Conversations saved with Supabase database
- **File attachments** - Support for images, documents, and PDFs
- **Export functionality** - Download conversations and research reports
- **Privacy controls** - User data management and deletion options

### 📱 **Cross-Platform Experience**
- **Progressive Web App** - Install on any device for native-like experience
- **Touch optimizations** - Gesture controls and haptic feedback on mobile
- **Keyboard shortcuts** - Power user features for desktop
- **Offline capabilities** - Basic functionality works without internet

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for global state
- **UI Components**: Custom components with shadcn/ui base
- **Icons**: Heroicons and Lucide React
- **Animations**: Framer Motion for smooth transitions

### **Backend & APIs**
- **Runtime**: Node.js with Edge Runtime support
- **API Routes**: Next.js API routes with middleware
- **Authentication**: Clerk (optional, can be bypassed)
- **Database**: Supabase with PostgreSQL
- **File Storage**: Supabase Storage for attachments
- **Real-time**: Supabase Realtime for live updates

### **AI & Search**
- **AI Provider**: OpenRouter (Grok-4, Claude, GPT-4, etc.)
- **Search Engine**: Exa AI for web search and research
- **Processing**: Streaming responses with Server-Sent Events
- **Content Filtering**: Built-in safety and content moderation

### **Developer Experience**
- **Package Manager**: npm/bun with fast installs
- **Code Quality**: ESLint, TypeScript, and Biome formatting
- **Build System**: Turbopack for lightning-fast builds
- **Deployment**: Vercel-optimized with edge functions

## Getting Started (Full Setup)

### Prerequisites

- Node.js 18+ 
- npm or bun
- Clerk account (for authentication)
- Supabase account (for database)
- OpenRouter account (for AI)
- Exa account (optional, for web search)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/clydra-ai.git
   cd clydra-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure environment variables**
   
   Copy `.env.local` and fill in your API keys:
   ```bash
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

   # OpenRouter AI
OPENROUTER_API_KEY=sk-or-v1-...

   # Exa Search (Required for web search and research functionality)
   EXA_API_KEY=your_exa_api_key_here

   NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Clydra AI
   ```

4. **Set up Supabase database**
   
   Run the SQL schema in your Supabase dashboard:
   ```bash
   # Copy content from supabase-schema.sql and run in Supabase SQL editor
   ```

5. **Configure Clerk**
   
   - Create a new Clerk application
   - Enable email/password authentication
   - Set up redirect URLs for development

6. **Run the development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 🔧 Troubleshooting

### **Authentication Issues**

If you encounter loading screens or authentication problems:

1. **Check environment variables**: Ensure all required keys are properly set
2. **Clear browser cache**: Try incognito mode or clear cookies
3. **Disable ad blockers**: Some ad blockers interfere with authentication
4. **Check network connectivity**: Ensure access to Clerk and Supabase services
5. **Use debug page**: Visit `/debug-auth` to see detailed authentication status

### **UI/Display Issues**

If you experience interface problems:

1. **Theme toggle not working**: Clear browser storage and refresh the page
2. **Mobile navigation issues**: Ensure JavaScript is enabled and try clearing cache
3. **Attachment menu not appearing**: Check if there are browser console errors
4. **Input field borders**: These have been removed in recent updates - refresh if still visible
5. **Mobile responsiveness**: Ensure viewport meta tag is properly loaded

### **Performance Issues**

For slow loading or performance problems:

1. **Enable hardware acceleration**: Check browser settings for GPU acceleration
2. **Clear browser data**: Remove cached files and cookies
3. **Check network speed**: Ensure stable internet connection for AI responses
4. **Reduce browser extensions**: Disable unnecessary extensions that might interfere
5. **Try different browser**: Test with Chrome, Firefox, or Safari for compatibility

### Alternative Landing Page

The app includes a simple landing page (`SimpleLanding`) that bypasses Clerk authentication entirely. This is useful for:
- Quick testing and development
- Avoiding authentication setup complexity
- Demos and presentations

To switch back to the authenticated version, update `src/app/page.tsx` to use `LandingPage` instead of `SimpleLanding`.

## Research Functionality

The application includes advanced research capabilities powered by Exa AI:

### Research Mode Features

- **Enhanced AI Responses** - More detailed, analytical responses with citations
- **Web Search Integration** - Real-time web search to augment responses with current information
- **Deep Research Tasks** - Asynchronous research tasks that generate comprehensive reports
- **Structured Output** - Support for JSON schema-based outputs and inferred schemas
- **Source Citations** - Automatic citation and source management

### Using Research Mode

1. **Enable Research Mode** - Toggle the "Research Mode" button in the chat interface
2. **Web Search** - Enable "Web Search" for real-time information integration
3. **Deep Research** - Use the "Deep Research" button for complex research tasks that generate detailed reports

### Research API

The application exposes a research API at `/api/research` that supports:

- **Task Creation** - Create asynchronous research tasks
- **Task Polling** - Monitor task progress and retrieve results
- **Schema Support** - Generate structured data matching provided JSON schemas
- **Markdown Reports** - Generate comprehensive markdown research reports

Example API usage:
```javascript
// Create a research task
const response = await fetch('/api/research', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instructions: "What are the latest developments in AI research?",
    model: "exa-research",
    output: { inferSchema: true }
  })
})
const { id } = await response.json()

// Poll for results
const result = await fetch(`/api/research?taskId=${id}`)
const taskData = await result.json()
```

## Project Structure

```
clydra-ai/
├── src/
│   ├── app/           # Next.js app directory
│   │   ├── api/       # API routes (chat, conversations)
│   │   └── globals.css # Global styles
│   ├── components/    # Reusable UI components
│   │   ├── chat-*.tsx # Chat-related components
│   │   ├── sidebar.tsx # Navigation sidebar
│   │   ├── simple-landing.tsx # Simple landing page (no auth)
│   │   ├── landing-page.tsx # Full landing page (with auth)
│   │   └── main-content.tsx # Main chat interface
│   └── lib/          # Utility functions (Supabase client)
├── middleware.ts     # Clerk authentication middleware
├── supabase-schema.sql # Database schema
└── package.json      # Project dependencies
```

## 📝 Available Scripts

### **Development**
- `npm run dev` - Start development server with Turbopack (recommended)
- `npm run dev:webpack` - Start development server with Webpack (fallback)
- `npm run build` - Build optimized production bundle
- `npm run start` - Start production server
- `npm run preview` - Preview production build locally

### **Code Quality**
- `npm run lint` - Run ESLint and TypeScript checks
- `npm run lint:fix` - Auto-fix linting issues where possible
- `npm run type-check` - Run TypeScript compiler checks
- `npm run format` - Format code with Biome
- `npm run format:check` - Check code formatting without changes

### **Database & Deployment**
- `npm run db:generate` - Generate Supabase types from schema
- `npm run db:push` - Push schema changes to Supabase
- `npm run deploy` - Deploy to Vercel (requires setup)

### **Testing**
- `npm run test` - Run unit tests (if configured)
- `npm run test:watch` - Run tests in watch mode
- `npm run e2e` - Run end-to-end tests (if configured)

## 🚀 Deployment

### **Vercel (Recommended)**

The easiest way to deploy Clydra AI is using Vercel:

1. **Connect to Vercel**:
   ```bash
   npx vercel --prod
   ```

2. **Set environment variables** in Vercel dashboard:
   - Add all required API keys from your `.env.local`
   - Ensure NEXT_PUBLIC_SITE_URL points to your domain

3. **Configure domains** (optional):
   - Add custom domain in Vercel settings
   - Update environment variables if needed

### **Other Platforms**

Clydra AI can also be deployed to:
- **Railway**: Full-stack deployment with PostgreSQL
- **DigitalOcean App Platform**: Container-based deployment
- **AWS Amplify**: Serverless deployment with AWS services
- **Netlify**: Static generation with serverless functions

### **Docker Deployment**

For containerized deployment:

1. **Build Docker image**:
   ```bash
   docker build -t clydra-ai .
   ```

2. **Run container**:
   ```bash
   docker run -p 3000:3000 --env-file .env.local clydra-ai
   ```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create your feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow the code style** - Run `npm run format` before committing
4. **Test your changes** - Ensure the build passes with `npm run build`
5. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request** with a clear description of your changes

### **Development Guidelines**
- Use TypeScript for all new code
- Follow the existing component structure
- Add proper error handling and loading states
- Test on both desktop and mobile devices
- Update documentation for new features

## License

This project is for educational purposes only. It demonstrates modern web development techniques for building AI chat applications.

## Acknowledgments

- [Next.js](https://nextjs.org) for the amazing framework
- [Tailwind CSS](https://tailwindcss.com) for the utility-first CSS framework
- [Clerk](https://clerk.dev) for authentication
- [Supabase](https://supabase.com) for the database
- [OpenRouter](https://openrouter.ai) for AI model access
# HelloClydra
