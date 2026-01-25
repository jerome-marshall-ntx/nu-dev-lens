"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { UIMessage } from "ai";

interface MessageListProps {
  messages: UIMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <Conversation>
      <ConversationContent>
        {messages.map((message) => {
          // Check if message has any content
          const hasContent = message.parts.some(
            (part) =>
              part.type === "text" ||
              part.type === "dynamic-tool" ||
              part.type.startsWith("tool-"),
          );

          if (!hasContent) return null;

          return (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  // Render text content
                  if (part.type === "text") {
                    return (
                      <MessageResponse key={index}>{part.text}</MessageResponse>
                    );
                  }

                  // Render dynamic tools (unknown at compile time)
                  if (part.type === "dynamic-tool") {
                    return (
                      <Tool key={index}>
                        <ToolHeader
                          type="dynamic-tool"
                          state={part.state}
                          toolName={part.toolName}
                        />
                        <ToolContent>
                          {part.state !== "input-streaming" && (
                            <ToolInput input={part.input} />
                          )}
                          {part.state === "output-available" && (
                            <ToolOutput
                              output={part.output}
                              errorText={undefined}
                            />
                          )}
                          {part.state === "output-error" && (
                            <ToolOutput
                              output={undefined}
                              errorText={part.errorText}
                            />
                          )}
                        </ToolContent>
                      </Tool>
                    );
                  }

                  // Render specific tool types (tool-searchContributors, etc.)
                  if (
                    part.type.startsWith("tool-") &&
                    "state" in part &&
                    "input" in part
                  ) {
                    return (
                      <Tool key={index}>
                        <ToolHeader type={part.type} state={part.state} />
                        <ToolContent>
                          {part.state !== "input-streaming" && (
                            <ToolInput input={part.input} />
                          )}
                          {part.state === "output-available" &&
                            "output" in part && (
                              <ToolOutput
                                output={part.output}
                                errorText={undefined}
                              />
                            )}
                          {part.state === "output-error" &&
                            "errorText" in part && (
                              <ToolOutput
                                output={undefined}
                                errorText={part.errorText}
                              />
                            )}
                        </ToolContent>
                      </Tool>
                    );
                  }

                  return null;
                })}
              </MessageContent>
            </Message>
          );
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
