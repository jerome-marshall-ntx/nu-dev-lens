import { embeddingModel } from "@/ai/models";
import { cosineSimilarity, embed, embedMany } from "ai";
import { config } from "dotenv";

config();

const main = async () => {
  try {
    console.log("🔮 Embedding single value...\n");

    // Embed a single value
    const { embedding, usage } = await embed({
      model: embeddingModel,
      value: "sunny day at the beach",
      providerOptions: {
        ollama: {
          dimensions: 1024,
        },
      },
    });

    console.log(`Embedding dimensions: ${embedding.length}`);
    console.log(`Tokens used: ${usage.tokens}`);
    console.log(`First 5 values: [${embedding.slice(0, 5).join(", ")}...]\n`);

    console.log("🔮 Embedding multiple values...\n");

    // Embed multiple values
    const values = [
      "sunny day at the beach",
      "rainy afternoon in the city",
      "snowy night in the mountains",
    ];

    const { embeddings, usage: batchUsage } = await embedMany({
      model: embeddingModel,
      values,
      providerOptions: {
        ollama: {
          dimensions: 1024,
        },
      },
    });

    console.log(`Embedded ${embeddings.length} values`);
    console.log(`Total tokens used: ${batchUsage.tokens}\n`);

    console.log("📊 Calculating similarity...\n");

    // Calculate similarity between embeddings
    const similarity1 = cosineSimilarity(embeddings[0]!, embeddings[1]!);
    const similarity2 = cosineSimilarity(embeddings[0]!, embeddings[2]!);
    const similarity3 = cosineSimilarity(embeddings[1]!, embeddings[2]!);

    console.log(
      `Similarity between "${values[0]}" and "${values[1]}": ${similarity1.toFixed(4)}`,
    );
    console.log(
      `Similarity between "${values[0]}" and "${values[2]}": ${similarity2.toFixed(4)}`,
    );
    console.log(
      `Similarity between "${values[1]}" and "${values[2]}": ${similarity3.toFixed(4)}`,
    );

    console.log("\n🎉 Embedding complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  }
};

void main();
