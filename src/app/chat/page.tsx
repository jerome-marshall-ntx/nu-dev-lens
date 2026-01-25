"use client";

import { ChatInterface } from "@/components/chat";
import { useChat } from "@ai-sdk/react";

export default function Chat() {
  const { messages, sendMessage, status } = useChat();
  console.log("🚀 ~ Chat ~ messages:", messages);

  return (
    <ChatInterface
      messages={messages}
      status={status}
      onSendMessage={(text) => sendMessage({ text })}
    />
  );
}
