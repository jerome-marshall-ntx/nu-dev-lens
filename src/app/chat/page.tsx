"use client";

import { ChatInterface } from "@/components/chat";
import { useChat } from "@ai-sdk/react";

export default function Chat() {
  const { messages, sendMessage, status } = useChat();

  return (
    <ChatInterface
      messages={messages}
      status={status}
      onSendMessage={(text) => sendMessage({ text })}
    />
  );
}
