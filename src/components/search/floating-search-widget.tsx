"use client";

import { CONTRIBUTOR_CLICK_EVENT } from "@/components/ai-elements/message";
import { ChatInterface } from "@/components/chat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Search } from "lucide-react";
import * as React from "react";

interface FloatingSearchWidgetProps {
  className?: string;
}

export function FloatingSearchWidget({ className }: FloatingSearchWidgetProps) {
  const [open, setOpen] = React.useState(false);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat-new",
    }),
  });

  // Keyboard shortcut handler
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Handle initial query from URL (if opened with query param)
  React.useEffect(() => {
    if (open && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const query = params.get("q");
      if (query && messages.length === 0) {
        sendMessage({ text: query });
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [open, sendMessage, messages.length]);

  // Close modal when a contributor is clicked
  React.useEffect(() => {
    const handleContributorClick = () => {
      setOpen(false);
    };

    window.addEventListener(CONTRIBUTOR_CLICK_EVENT, handleContributorClick);
    return () => {
      window.removeEventListener(
        CONTRIBUTOR_CLICK_EVENT,
        handleContributorClick,
      );
    };
  }, []);

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "glow-border fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-5 py-3.5 text-foreground transition-all duration-300 focus:outline-none",
          "shadow-[0_4px_20px_rgba(59,130,246,0.3),0_0_40px_rgba(59,130,246,0.15)]",
          "hover:scale-[1.02] hover:shadow-[0_4px_25px_rgba(59,130,246,0.4),0_0_50px_rgba(59,130,246,0.25)] active:scale-[0.98]",
          "dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-[0_4px_20px_rgba(96,165,250,0.25),0_0_40px_rgba(96,165,250,0.15)] dark:hover:shadow-[0_4px_25px_rgba(96,165,250,0.35),0_0_50px_rgba(96,165,250,0.2)]",
          className,
        )}
        aria-label="Find an expert"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700">
          <Search className="h-4 w-4 text-primary" />
        </div>
        <span className="hidden items-center gap-2 text-sm font-medium md:inline-flex">
          Search...
          <Kbd className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-muted-foreground dark:bg-zinc-700">
            ⌘K
          </Kbd>
        </span>
      </button>

      {/* Chat Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[85vh] max-h-[85vh] w-[80vw] min-w-[80vw] flex-col gap-0 overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/80 p-0 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-background/60">
          <DialogHeader className="shrink-0 border-b border-zinc-200/60 bg-zinc-50/50 px-8 pt-6 pb-5 dark:border-white/5 dark:bg-transparent">
            <DialogTitle className="text-lg font-semibold">
              Find an Expert
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden bg-white/40 px-8 pt-6 pb-6 dark:bg-transparent">
            <ChatInterface
              messages={messages}
              status={status}
              onSendMessage={(text) => sendMessage({ text })}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
