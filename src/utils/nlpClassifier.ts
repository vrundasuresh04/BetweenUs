/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

export interface EmotionClassificationResult {
  topEmotion: string;
  confidence: number;
  probabilities: Record<string, number>;
  isPotentiallyHostileOrDismissive: boolean;
  advisoryNote?: string;
  modelStatus: string;
}

interface ModelArtifact {
  version: string;
  architecture: string;
  labels: string[];
  vocabulary: Record<string, number>;
  idf: number[];
  weights: Record<string, number[]>;
  biases: Record<string, number>;
  metrics: {
    accuracy: number;
    macro_f1: number;
  };
}

let loadedModel: ModelArtifact | null = null;

function loadModel(): ModelArtifact | null {
  if (loadedModel) return loadedModel;

  const artifactPath = path.resolve(process.cwd(), 'results/nlp_model_artifact.json');
  if (fs.existsSync(artifactPath)) {
    try {
      const raw = fs.readFileSync(artifactPath, 'utf-8');
      loadedModel = JSON.parse(raw);
      return loadedModel;
    } catch (e) {
      console.error('Failed to parse NLP model artifact:', e);
      return null;
    }
  }
  return null;
}

function tokenize(text: string): string[] {
  const matches = (text.toLowerCase().match(/\b[a-z0-9']+\b/g) || []);
  const unigrams = matches;
  const bigrams: string[] = [];
  for (let i = 0; i < matches.length - 1; i++) {
    bigrams.push(`${matches[i]} ${matches[i + 1]}`);
  }
  return [...unigrams, ...bigrams];
}

const HOSTILE_OR_DISMISSIVE_EMOTIONS = new Set(['anger', 'annoyance', 'disapproval', 'disgust']);

/**
 * Classifies the emotional valence of input text using the trained GoEmotions model artifact.
 * Employs conservative thresholding and strictly non-diagnostic phrasing.
 */
export function classifyEmotion(text: string): EmotionClassificationResult {
  const model = loadModel();

  if (!model) {
    return {
      topEmotion: 'neutral',
      confidence: 0,
      probabilities: {},
      isPotentiallyHostileOrDismissive: false,
      modelStatus: 'Model artifact not loaded',
    };
  }

  const tokens = tokenize(text);
  const tf: Record<number, number> = {};

  for (const tok of tokens) {
    const idx = model.vocabulary[tok];
    if (idx !== undefined) {
      tf[idx] = (tf[idx] || 0) + 1;
    }
  }

  // Calculate TF-IDF with L2 norm
  const tfidfEntries: [number, number][] = [];
  let sumSq = 0;

  for (const [idxStr, count] of Object.entries(tf)) {
    const idx = Number(idxStr);
    const val = count * (model.idf[idx] || 1.0);
    tfidfEntries.push([idx, val]);
    sumSq += val * val;
  }

  const norm = Math.sqrt(sumSq);
  const xVector: [number, number][] = norm > 1e-9 
    ? tfidfEntries.map(([idx, val]) => [idx, val / norm])
    : [];

  // Dot product per class + bias
  const logits: number[] = [];
  for (const label of model.labels) {
    const wVec = model.weights[label];
    const b = model.biases[label] || 0;
    let dot = b;
    if (wVec) {
      for (const [idx, val] of xVector) {
        dot += (wVec[idx] || 0) * val;
      }
    }
    logits.push(Math.max(-20, Math.min(20, dot)));
  }

  // Softmax
  const maxZ = Math.max(...logits);
  const expZ = logits.map((z) => Math.exp(z - maxZ));
  const sumExp = expZ.reduce((a, b) => a + b, 0);
  const probsArray = expZ.map((ez) => ez / sumExp);

  const probabilities: Record<string, number> = {};
  let topEmotion = model.labels[0];
  let topProb = -1;

  model.labels.forEach((label, i) => {
    const p = Math.round(probsArray[i] * 1000) / 1000;
    probabilities[label] = p;
    if (p > topProb) {
      topProb = p;
      topEmotion = label;
    }
  });

  // Calculate aggregate hostile/dismissive probability
  const hostileProb = Array.from(HOSTILE_OR_DISMISSIVE_EMOTIONS)
    .reduce((sum, emo) => sum + (probabilities[emo] || 0), 0);

  // A conservative flag: either top emotion is hostile with confidence >= 0.35, or combined hostile probability >= 0.45
  const isPotentiallyHostileOrDismissive = 
    (HOSTILE_OR_DISMISSIVE_EMOTIONS.has(topEmotion) && topProb >= 0.35) ||
    hostileProb >= 0.45;

  let advisoryNote: string | undefined = undefined;
  if (isPotentiallyHostileOrDismissive) {
    advisoryNote = `This phrasing may carry an irritated or dismissive tone (${topEmotion}: ${Math.round(topProb * 100)}%). Consider whether a brief check-in would prevent unintended hurt.`;
  }

  return {
    topEmotion,
    confidence: Math.round(topProb * 100) / 100,
    probabilities,
    isPotentiallyHostileOrDismissive,
    advisoryNote,
    modelStatus: `GoEmotions 9-Class Linear Baseline (Test Accuracy: ${(model.metrics.accuracy * 100).toFixed(1)}%)`,
  };
}

export function getModelInfo() {
  const model = loadModel();
  if (!model) return null;
  return {
    version: model.version,
    architecture: model.architecture,
    labels: model.labels,
    labelMapping: (model as any).label_mapping,
    vocabularySize: Object.keys(model.vocabulary).length,
    metrics: model.metrics,
    isTrained: true,
  };
}
