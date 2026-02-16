"use client";

import { ChatInterface } from "@/components/chat";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat-new", // Chat API endpoint
    }),
  });
  console.log("🚀 ~ Chat ~ messages:", messages);

  return (
    <ChatInterface
      messages={messages}
      status={status}
      onSendMessage={(text) => sendMessage({ text })}
    />
  );
}
