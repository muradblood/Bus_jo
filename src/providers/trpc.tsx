import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppRouter } from "@/types/router";
import { type ReactNode, useEffect } from "react";
import { getSocket } from "@/lib/socket";

export const trpc = createTRPCReact<AppRouter>();

// Syncs key settings from DB to localStorage so visitor-facing
// synchronous code (telegram sending, bank detection, geo-block)
// always uses the latest admin-configured values.
function SettingsSyncInner() {
  const utils = trpc.useUtils();
  const { data: settings } = trpc.settings.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!settings) return;
    try {
      if (settings.telegramFullSettings) {
        localStorage.setItem("sat_telegram_settings_v1", settings.telegramFullSettings);
      }
      if (settings.banksData) {
        localStorage.setItem("sat_admin_banks_v3", settings.banksData);
      }
      if (settings.geoBlockSettings) {
        localStorage.setItem("geoblock_settings_v2", settings.geoBlockSettings);
      }
      if (settings.pricingSettings) {
        localStorage.setItem("sat_pricing_settings_v3", settings.pricingSettings);
      }
    } catch { /* ignore storage errors */ }
  }, [settings]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleSettingsUpdated = () => {
      void utils.settings.list.invalidate();
    };

    socket.on("settings:updated", handleSettingsUpdated);

    return () => {
      socket.off("settings:updated", handleSettingsUpdated);
    };
  }, [utils]);

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
      // No transformer — use plain JSON to avoid superjson parse errors
      // when the server returns HTML (static hosting) instead of JSON
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" })
          .then((res) => {
            const ct = res.headers.get("content-type") || "";
            if (res.ok && ct.includes("application/json")) {
              return res;
            }
            // Return empty successful JSON for static hosting
            return new Response(
              JSON.stringify({ result: { data: { json: [] } } }),
              { status: 200, headers: { "content-type": "application/json" } }
            );
          })
          .catch(() => {
            return new Response(
              JSON.stringify({ result: { data: { json: [] } } }),
              { status: 200, headers: { "content-type": "application/json" } }
            );
          });
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
