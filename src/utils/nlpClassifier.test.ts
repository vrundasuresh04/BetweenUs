import test from 'node:test';
import assert from 'node:assert';
import { classifyEmotion } from './nlpClassifier';

test('GoEmotions NLP Classifier - Correctly loads model and scores gratitude', () => {
  const result = classifyEmotion("That was really helpful, thanks!");
  assert.strictEqual(result.topEmotion, 'gratitude');
  assert.ok(result.confidence > 0.5);
  assert.strictEqual(result.isPotentiallyHostileOrDismissive, false);
});

test('GoEmotions NLP Classifier - Detects hostile tone in explicit insults', () => {
  const result = classifyEmotion("You are such an idiot.");
  assert.ok(result.isPotentiallyHostileOrDismissive);
  assert.ok(result.advisoryNote?.includes('irritated') || result.advisoryNote?.includes('dismissive'));
});

test('GoEmotions NLP Classifier - Discloses limitations on sarcastic input', () => {
  // Proves the model is experimental and does NOT reliably catch sarcasm
  const result = classifyEmotion("Yeah right, brilliant idea genius.");
  assert.ok(result.topEmotion !== undefined);
  assert.ok(result.modelStatus.includes('GoEmotions'));
});

test('GoEmotions NLP Classifier - Clean neutral phrasing', () => {
  const result = classifyEmotion("I will be home around 6pm today.");
  assert.strictEqual(result.isPotentiallyHostileOrDismissive, false);
});

test('GoEmotions NLP Classifier - Model metadata, vocabulary and label mapping are verified', async () => {
  const { getModelInfo } = await import('./nlpClassifier');
  const info = getModelInfo();
  assert.ok(info !== null);
  assert.strictEqual(info?.isTrained, true);
  assert.strictEqual(info?.labels.length, 9);
  assert.ok((info?.vocabularySize || 0) > 10000);
  assert.strictEqual(info?.labelMapping['anger'], 0);
  assert.strictEqual(info?.labelMapping['neutral'], 8);
  assert.ok((info?.metrics.accuracy || 0) > 0.50);
});
