import { Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <div className="hidden md:contents">
          <AppSidebar />
        </div>
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="relative flex-1 overflow-x-hidden">
            <div className="bg-radial-glow pointer-events-none absolute inset-0 -z-0 opacity-60" aria-hidden />
            <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
          <BottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
