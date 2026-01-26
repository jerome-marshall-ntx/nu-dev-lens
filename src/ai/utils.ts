import { embeddingModel } from "@/ai/models";
import { EMBEDDING_DIMENSIONS } from "@/scripts/embedding/embed.config";
import { embed, embedMany, type UIMessage } from "ai";

export const messageToString = (message: UIMessage) => {
  return message.parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      return "";
    })
    .join("");
};

export const embedQuery = async (query: string) => {
  const { embedding: queryEmbedding } = await embed({
    model: embeddingModel,
    value: query,
    providerOptions: {
      ollama: {
        dimensions: EMBEDDING_DIMENSIONS,
      },
    },
  });

  return queryEmbedding;
};

export const embedQueryMany = async (queries: string[]) => {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: queries,
    providerOptions: {
      ollama: {
        dimensions: EMBEDDING_DIMENSIONS,
      },
    },
  });
  return embeddings;
};
