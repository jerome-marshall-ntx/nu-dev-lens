"use client";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";

interface ChatInputProps {
  status: ChatStatus;
  onSubmit: (message: PromptInputMessage) => void;
}

export function ChatInput({ status, onSubmit }: ChatInputProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    onSubmit(message);
  };

  return (
    <div className="w-full p-1">
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputBody>
          <PromptInputTextarea placeholder="What would you like to know?" />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputSubmit
            disabled={status === "streaming"}
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
