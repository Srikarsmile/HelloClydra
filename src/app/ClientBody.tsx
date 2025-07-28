"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast";
import ClerkThemeProvider from "@/components/ClerkThemeProvider";

export default function ClientBody({
  children
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remove any extension-added classes during hydration
  useEffect(() => {
    try {
      // This runs only on the client after hydration
      document.body.className = "antialiased";
      setIsClient(true);
      
      // Add error handling for authentication issues
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        // Silently handle - error logged above
        if (event.reason?.message?.includes('clerk') || event.reason?.message?.includes('auth')) {
          setError('Authentication service is having issues. Please refresh the page.');
        }
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      
      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    } catch (err) {
      setError('Application initialization failed. Please refresh the page.');
    }
  }, []);

  if (error) {
    return (
      <div className="antialiased">
        <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
          <div className="text-center p-8 bg-[var(--bg-card)] rounded-lg shadow-lg max-w-md">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-600">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Application Error</h1>
            <p className="text-[var(--text-subtle)] mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg hover:bg-[var(--brand-primary)]/90 transition-colors focus-brand"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state until client is ready
  if (!isClient) {
    return (
      <div className="antialiased min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)] mx-auto mb-4"></div>
          <p className="text-sm text-[var(--text-subtle)]">
            Loading application...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="antialiased">
      <ClerkThemeProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </ClerkThemeProvider>
    </div>
  );
}
