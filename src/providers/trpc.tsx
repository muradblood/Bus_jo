import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppRouter } from "@/types/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

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
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
