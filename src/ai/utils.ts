import { embeddingModel } from "@/ai/models";
import { EMBEDDING_DIMENSIONS } from "@/scripts/embedding/embed.config";
import { embed, embedMany } from "ai";

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