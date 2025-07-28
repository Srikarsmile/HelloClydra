"use client";

import { ClerkProvider } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import type { Appearance } from '@clerk/types';

interface ClerkThemeProviderProps {
  children: React.ReactNode;
  publishableKey: string;
}

export default function ClerkThemeProvider({ children, publishableKey }: ClerkThemeProviderProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <ClerkProvider publishableKey={publishableKey}>
        {children}
      </ClerkProvider>
    );
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  const lightAppearance: Appearance = {
    variables: {
      colorPrimary: "#F5A623",
      colorBackground: "#FFF8F1",
      colorInputBackground: "#FFFFFF",
      colorInputText: "#111111",
      colorText: "#111111",
      colorTextSecondary: "#666666",
      colorNeutral: "#FFF8F1",
      borderRadius: "12px",
    },
    elements: {
      card: "bg-white border border-orange-200/50 shadow-xl rounded-2xl backdrop-blur-sm",
      headerTitle: "text-gray-900 font-semibold",
      headerSubtitle: "text-gray-600",
      socialButtonsBlockButton: "bg-white border border-orange-200/50 text-gray-700 hover:bg-orange-50/50 hover:border-orange-300/50 rounded-xl transition-all duration-200",
      formButtonPrimary: "bg-[#F5A623] hover:bg-[#F5A623]/90 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200",
      footerActionLink: "text-[#F5A623] hover:text-[#F5A623]/80 font-medium",
      formFieldInput: "bg-white border border-orange-200/50 text-gray-900 rounded-xl focus:border-[#F5A623]/50 focus:ring-2 focus:ring-[#F5A623]/20 transition-all duration-200",
      formFieldLabel: "text-gray-700 font-medium",
      identityPreviewText: "text-gray-600",
      identityPreviewEditButton: "text-[#F5A623] hover:text-[#F5A623]/80 font-medium",
      dividerLine: "bg-orange-200/30",
      dividerText: "text-gray-500",
      // UserButton specific styles
      userButtonAvatarBox: "w-10 h-10 rounded-full border-2 border-orange-200/50 hover:border-[#F5A623]/50 transition-all duration-200 shadow-md hover:shadow-lg",
      userButtonPopoverCard: "bg-white border border-orange-200/50 shadow-2xl rounded-2xl backdrop-blur-sm p-2",
      userButtonPopoverActions: "space-y-1",
      userButtonPopoverActionButton: "text-gray-700 hover:bg-orange-50/70 hover:text-[#F5A623] rounded-xl px-3 py-2 transition-all duration-200 font-medium",
      userButtonPopoverActionButtonText: "text-current",
      userButtonPopoverActionButtonIcon: "text-current",
      userButtonPopoverFooter: "hidden",
    }
  };

  const darkAppearance: Appearance = {
    variables: {
      colorPrimary: "#F5A623",
      colorBackground: "#0F0F0F",
      colorInputBackground: "#1A1A1A",
      colorInputText: "#EDEDED",
      colorText: "#EDEDED",
      colorTextSecondary: "#AAAAAA",
      colorNeutral: "#2A2A2A",
      borderRadius: "12px",
    },
    elements: {
      card: "bg-[#1A1A1A] border border-orange-500/20 shadow-2xl rounded-2xl backdrop-blur-sm",
      headerTitle: "text-white font-semibold",
      headerSubtitle: "text-gray-300",
      socialButtonsBlockButton: "bg-[#2A2A2A] border border-orange-500/20 text-gray-200 hover:bg-[#333333] hover:border-orange-500/30 rounded-xl transition-all duration-200",
      formButtonPrimary: "bg-[#F5A623] hover:bg-[#F5A623]/90 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200",
      footerActionLink: "text-[#F5A623] hover:text-[#F5A623]/80 font-medium",
      formFieldInput: "bg-[#2A2A2A] border border-orange-500/20 text-white rounded-xl focus:border-[#F5A623]/50 focus:ring-2 focus:ring-[#F5A623]/20 transition-all duration-200",
      formFieldLabel: "text-gray-300 font-medium",
      identityPreviewText: "text-gray-400",
      identityPreviewEditButton: "text-[#F5A623] hover:text-[#F5A623]/80 font-medium",
      dividerLine: "bg-orange-500/20",
      dividerText: "text-gray-400",
      // UserButton specific styles
      userButtonAvatarBox: "w-10 h-10 rounded-full border-2 border-orange-500/30 hover:border-[#F5A623]/60 transition-all duration-200 shadow-lg hover:shadow-xl",
      userButtonPopoverCard: "bg-[#1A1A1A] border border-orange-500/20 shadow-2xl rounded-2xl backdrop-blur-sm p-2",
      userButtonPopoverActions: "space-y-1",
      userButtonPopoverActionButton: "text-gray-200 hover:bg-[#333333] hover:text-[#F5A623] rounded-xl px-3 py-2 transition-all duration-200 font-medium",
      userButtonPopoverActionButtonText: "text-current",
      userButtonPopoverActionButtonIcon: "text-current",
      userButtonPopoverFooter: "hidden",
    }
  };

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={isDark ? darkAppearance : lightAppearance}
    >
      {children}
    </ClerkProvider>
  );
}