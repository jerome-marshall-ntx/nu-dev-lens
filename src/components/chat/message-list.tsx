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
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { cn } from "@/lib/utils";
import type { ChatStatus, UIMessage } from "ai";
import { BrainIcon } from "lucide-react";
import { Shimmer } from "../ai-elements/shimmer";

interface MessageListProps {
  messages: UIMessage[];
  status?: ChatStatus;
}

export function MessageList({ messages, status }: MessageListProps) {
  // Check if AI is thinking (message submitted but not yet streaming)
  const isThinking =
    status === "submitted" &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "user";

  return (
    <Conversation>
      <ConversationContent>
        {messages.map((message) => {
          // Check if message has any content
          const hasContent = message.parts.some(
            (part) =>
              part.type === "text" ||
              part.type === "dynamic-tool" ||
              part.type.startsWith("tool-") ||
              part.type === "reasoning" ||
              part.type === "step-start",
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

                  // Render reasoning parts
                  if (part.type === "reasoning" && "text" in part) {
                    return (
                      <Reasoning
                        key={index}
                        isStreaming={part.state === "streaming"}
                        defaultOpen={false}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
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

        {/* Show thinking indicator when AI is processing */}
        {isThinking && (
          <Message from="assistant">
            <MessageContent>
              <div
                className={cn(
                  "flex items-center gap-2 text-sm text-muted-foreground",
                )}
              >
                <BrainIcon className="size-4 animate-pulse" />
                <Shimmer duration={1.5}>Thinking...</Shimmer>
              </div>
            </MessageContent>
          </Message>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
