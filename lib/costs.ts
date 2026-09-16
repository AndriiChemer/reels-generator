import type { GenerationMetadata } from "@/lib/types/generation";

export type GenerationCostSummary = {
  estimatedTotalUsd: number;
  knownGenerationCount: number;
  totalGenerationCount: number;
  unknownGenerationCount: number;
};

export function calculateGenerationCostSummary(
  generations: GenerationMetadata[],
): GenerationCostSummary {
  return generations.reduce<GenerationCostSummary>(
    (summary, generation) => {
      const estimatedCostUsd = generation.estimatedCostUsd;

      if (
        typeof estimatedCostUsd === "number" &&
        Number.isFinite(estimatedCostUsd)
      ) {
        return {
          ...summary,
          estimatedTotalUsd: roundUsd(summary.estimatedTotalUsd + estimatedCostUsd),
          knownGenerationCount: summary.knownGenerationCount + 1,
          totalGenerationCount: summary.totalGenerationCount + 1,
        };
      }

      return {
        ...summary,
        totalGenerationCount: summary.totalGenerationCount + 1,
        unknownGenerationCount: summary.unknownGenerationCount + 1,
      };
    },
    {
      estimatedTotalUsd: 0,
      knownGenerationCount: 0,
      totalGenerationCount: 0,
      unknownGenerationCount: 0,
    },
  );
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    currency: "USD",
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

export function roundUsd(value: number) {
  return Math.round(value * 10000) / 10000;
}
