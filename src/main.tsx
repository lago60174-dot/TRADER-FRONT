import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

// Single QueryClient — passed to router context, then used by __root.tsx's QueryClientProvider
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry 3 times on network errors, but not on 401/403/404
      retry: (failureCount, error) => {
        const msg = (error as Error).message ?? "";
        if (msg.includes("Session expir") || msg.includes("401") || msg.includes("404")) return false;
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15_000), // 2s, 4s, 8s
    },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// NO QueryClientProvider here — __root.tsx handles it using the router context
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
