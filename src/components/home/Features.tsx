'use client';

import { motion } from 'framer-motion';

export default function Features() {
  const items = [
    { icon: '🤖', title: 'Multiple AI Models', copy: 'Choose from Grok-4, Gemini 2.5 Pro, Claude Sonnet 4, and more premium models for every task.' },
    { icon: '📁', title: 'Multimodal File Support', copy: 'Upload and analyze images, PDFs, Word docs, Excel files, and more with AI vision and processing.' },
    { icon: '🔍', title: 'Real-time Web Search', copy: 'Get the latest information with Exa-powered web search integrated directly into conversations.' },
    { icon: '🧠', title: 'Infinite Memory', copy: 'Supermemory system remembers all your conversations and files for intelligent context retrieval.' },
    { icon: '⚡', title: 'Smart Performance', copy: 'Dynamic streaming for complex queries, fast responses for simple ones, and optimistic UI updates.' },
    { icon: '🎯', title: 'Specialized Modes', copy: 'Feynman mode for simple explanations, research mode for deep analysis, and automatic vision mode.' },
  ];
  
  return (
    <section className="py-16 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Why Choose Clydra?</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            A complete AI platform with advanced models, file processing, web search, and memory systems built for power users.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i, index) => (
            <motion.div
              key={i.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col items-center text-center gap-4 p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <span className="text-4xl">{i.icon}</span>
              <h3 className="font-semibold text-xl">{i.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{i.copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
