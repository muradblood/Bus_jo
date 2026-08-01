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

  useEffect(() => {
    if (!settings) return;
    try {
      if (settings.banksData) {
        localStorage.setItem("sat_admin_banks_v3", settings.banksData);
      }
      localStorage.setItem("geoblock_settings_v2", settings.geoBlockSettings);
      localStorage.setItem("sat_pricing_settings_v3", settings.pricingSettings);
    } catch { /* ignore storage errors */ }
  }, [settings]);

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
