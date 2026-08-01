import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppRouter } from "@/types/router";
import { type ReactNode, useEffect } from "react";

export const trpc = createTRPCReact<AppRouter>();

// Keep the public, non-secret configuration synchronized for legacy
// synchronous consumers. Bot credentials intentionally never reach the client.
function SettingsSyncInner() {
  const { data: settings } = trpc.settings.publicConfig.useQuery(undefined, {
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });
  const { data: serverBanks } = trpc.banks.publicList.useQuery(undefined, {
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });

  useEffect(() => {
    if (!settings) return;
    try {
      localStorage.setItem("geoblock_settings_v2", settings.geoBlockSettings);
      localStorage.setItem("sat_pricing_settings_v3", settings.pricingSettings);
      localStorage.setItem("sat_design_settings_v1", settings.designSettings);
      const design = JSON.parse(settings.designSettings) as {
        colors?: Record<string, string>;
        cards?: Record<string, { enabled?: boolean; bgColor?: string; textColor?: string }>;
      };
      const root = document.documentElement;
      const colorVars: Record<string, string> = {
        primary: '--sat-primary', primaryDark: '--sat-primary-dark', background: '--sat-bg',
        cardBg: '--sat-card', textMain: '--sat-text', textMuted: '--sat-muted',
        border: '--sat-border', success: '--sat-success', danger: '--sat-danger',
      };
      for (const [key, variable] of Object.entries(colorVars)) {
        const value = design.colors?.[key];
        if (value) root.style.setProperty(variable, value);
      }
      for (const [key, card] of Object.entries(design.cards ?? {})) {
        if (card.bgColor) root.style.setProperty(`--sat-card-${key}-bg`, card.bgColor);
        if (card.textColor) root.style.setProperty(`--sat-card-${key}-text`, card.textColor);
        root.style.setProperty(`--sat-card-${key}-display`, card.enabled === false ? 'none' : 'block');
      }
    } catch { /* ignore storage errors */ }
  }, [settings]);

  useEffect(() => {
    if (!serverBanks) return;
    try {
      localStorage.setItem("sat_admin_banks_v3", JSON.stringify(serverBanks));
    } catch { /* ignore storage errors */ }
  }, [serverBanks]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
    mutations: {
      retry: false,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SettingsSyncInner />
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
