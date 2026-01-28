"use client";

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

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
          "md:rounded-xl md:px-4 md:py-2.5",
          className
        )}
        aria-label="Find an expert"
      >
        <Search className="h-5 w-5" />
        <span className="hidden md:inline-flex items-center gap-2 text-sm font-medium">
            Search...
          <Kbd className="bg-primary-foreground/20 text-primary-foreground">
            ⌘K
          </Kbd>
        </span>
      </button>

      {/* Chat Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[65vw] min-w-[65vw] h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-8 pt-6 pb-5 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold">Find an Expert</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0 px-8 pb-6 pt-6">
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
