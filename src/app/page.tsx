import Hero from '@/components/home/Hero';
import Features from '@/components/home/Features';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />

      {/* Models Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Premium AI Models</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Access the most advanced AI models from leading providers, each optimized for different use cases.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border">
              <h3 className="font-bold text-lg mb-2">🚀 Grok-4</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">8K context • Fast responses</p>
              <p className="text-sm">X.AI&apos;s latest model with exceptional speed and reasoning capabilities.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border">
              <h3 className="font-bold text-lg mb-2">💎 Gemini 2.5 Pro</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">2M context • Advanced reasoning</p>
              <p className="text-sm">Google&apos;s most capable model with massive context and multimodal vision.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border">
              <h3 className="font-bold text-lg mb-2">🧠 Claude Sonnet 4</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">200K context • Balanced</p>
              <p className="text-sm">Anthropic&apos;s flagship model with excellent reasoning and safety.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Advanced Capabilities</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Built with cutting-edge technology for the most demanding AI workflows.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-[var(--accent)] text-white p-2 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">File Processing Pipeline</h3>
                  <p className="text-gray-600 dark:text-gray-400">Upload PDFs, images, Word docs, Excel files, and more. Advanced processing extracts text, analyzes content, and integrates with AI vision models.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[var(--accent)] text-white p-2 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Real-time Web Search</h3>
                  <p className="text-gray-600 dark:text-gray-400">Powered by Exa API for the most current information. Automatically detects when queries need web search and provides cited sources.</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-[var(--accent)] text-white p-2 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Supermemory Integration</h3>
                  <p className="text-gray-600 dark:text-gray-400">Every conversation and file is stored in an intelligent memory system that provides relevant context automatically across sessions.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[var(--accent)] text-white p-2 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Specialized AI Modes</h3>
                  <p className="text-gray-600 dark:text-gray-400">Feynman mode for simple explanations, research mode for deep analysis, and automatic vision mode for image understanding.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
