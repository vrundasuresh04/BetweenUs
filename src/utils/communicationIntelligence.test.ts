import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCommunication } from './communicationIntelligence';

test('Example A: Reassuring reply with explanation and apology', () => {
  const message = "No, nothing like that. I was just busy. Did you take it that way? I'm sorry.";
  const feedback = analyzeCommunication(message, 'sender_review');

  assert.equal(feedback.hasExplanation, true);
  assert.equal(feedback.hasApology, true);
  assert.equal(feedback.hasAcknowledgment, true);
  assert.match(feedback.neutralSummary, /explanation and an apology/i);
  assert.match(feedback.educationalNote, /does not diagnose emotional states/i);
});

test('Example B: Brief reply "Nothing like that. Bye."', () => {
  const message = 'Nothing like that. Bye.';
  const senderFeedback = analyzeCommunication(message, 'sender_review');

  assert.equal(senderFeedback.hasAbruptEnding, true);
  assert.match(senderFeedback.neutralSummary, /brief/i);
  assert.ok(senderFeedback.constructiveSuggestion);
  assert.match(senderFeedback.constructiveSuggestion, /abrupt/i);

  const recipientFeedback = analyzeCommunication(message, 'recipient_insight');
  assert.match(recipientFeedback.neutralSummary, /unresolved/i);
});

test('Never diagnoses toxic or angry labels in outputs', () => {
  const message = 'Whatever. Leave me alone.';
  const feedback = analyzeCommunication(message, 'sender_review');

  const combined = JSON.stringify(feedback).toLowerCase();
  assert.equal(combined.includes('toxic'), false);
  assert.equal(combined.includes('narcissist'), false);
  assert.equal(combined.includes('abusive'), false);
  assert.equal(combined.includes('angry'), false);
});
