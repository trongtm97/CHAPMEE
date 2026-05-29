import { readStorageItem, STORAGE_KEYS, writeStorageItem } from "@/lib/brand/storage";
import { getExperimentDefinition, isExperimentActive } from "@/lib/experiments/experiments";
import type { ExperimentVariantResult } from "@/types/experiment";

const anonymousIdStorageKey = STORAGE_KEYS.experimentsAnonymousId;
const assignmentStorageKey = STORAGE_KEYS.experimentsAssignments;

function normalizeTraffic(weights: number[], length: number) {
  if (weights.length !== length) {
    return new Array(length).fill(100 / Math.max(length, 1));
  }
  const sum = weights.reduce((total, item) => total + Math.max(item, 0), 0);
  if (sum <= 0) {
    return new Array(length).fill(100 / Math.max(length, 1));
  }
  return weights.map((item) => (Math.max(item, 0) / sum) * 100);
}

function hashToBucket(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0) % 10000;
}

function selectVariantIndex(subjectKey: string, experimentKey: string, weights: number[]) {
  const bucket = hashToBucket(`${experimentKey}:${subjectKey}`) / 100;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i += 1) {
    cumulative += weights[i];
    if (bucket < cumulative) {
      return i;
    }
  }
  return Math.max(0, weights.length - 1);
}

function fallbackVariant(experimentKey: string): ExperimentVariantResult {
  const definition = getExperimentDefinition(experimentKey);
  if (!definition || definition.variants.length === 0) {
    return {
      experimentKey,
      variant: "A",
      payload: {},
      isDefault: true
    };
  }

  const variant =
    definition.variants.find((item) => item.key === definition.default_variant) ??
    definition.variants[0];

  return {
    experimentKey,
    variant: variant.key,
    payload: variant.payload ?? {},
    isDefault: true
  };
}

export function getExperimentVariant(
  experimentKey: string,
  userIdOrAnonymousId: string | null | undefined
): ExperimentVariantResult {
  const definition = getExperimentDefinition(experimentKey);
  if (!definition || !isExperimentActive(definition) || definition.variants.length === 0) {
    return fallbackVariant(experimentKey);
  }

  if (!userIdOrAnonymousId) {
    return fallbackVariant(experimentKey);
  }

  const normalizedWeights = normalizeTraffic(
    definition.traffic_allocation,
    definition.variants.length
  );
  const variantIndex = selectVariantIndex(
    userIdOrAnonymousId,
    experimentKey,
    normalizedWeights
  );
  const assignedVariant = definition.variants[variantIndex] ?? definition.variants[0];

  return {
    experimentKey,
    variant: assignedVariant.key,
    payload: assignedVariant.payload ?? {},
    isDefault: assignedVariant.key === definition.default_variant
  };
}

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

export function getOrCreateAnonymousExperimentId() {
  if (!canUseBrowserStorage()) {
    return null;
  }

  try {
    const existing = readStorageItem(anonymousIdStorageKey);
    if (existing) {
      return existing;
    }
    const nextId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    writeStorageItem(anonymousIdStorageKey, nextId);
    return nextId;
  } catch {
    return null;
  }
}

function readStoredAssignments() {
  if (!canUseBrowserStorage()) {
    return {};
  }
  try {
    const raw = readStorageItem(assignmentStorageKey);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getStoredExperimentVariant(experimentKey: string) {
  const assignments = readStoredAssignments();
  return assignments[experimentKey] ?? null;
}

export function storeExperimentVariant(experimentKey: string, variant: string) {
  if (!canUseBrowserStorage()) {
    return;
  }
  const assignments = readStoredAssignments();
  assignments[experimentKey] = variant;
  try {
    writeStorageItem(assignmentStorageKey, JSON.stringify(assignments));
  } catch {
    return;
  }
}
