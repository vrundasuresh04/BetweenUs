export interface DetectedCue {
  id: string;
  type: 'apology' | 'explanation' | 'acknowledgment' | 'request' | 'brief_closing' | 'inquiry' | 'reassurance' | 'dismissive_tone';
  label: string;
  evidence: string;
  description: string;
}

import type { EmotionInsight } from '../types.ts';

export interface CommunicationFeedback {
  perspective: 'sender_review' | 'recipient_insight';
  wordCount: number;
  hasAbruptEnding: boolean;
  hasApology: boolean;
  hasExplanation: boolean;
  hasAcknowledgment: boolean;
  hasInquiry: boolean;
  detectedCues: DetectedCue[];
  neutralSummary: string;
  constructiveSuggestion?: string;
  educationalNote: string;
  nlpEmotion?: EmotionInsight;
}

// Cues detection patterns
const APOLOGY_PATTERNS = [
  /\b(i'?m\s+(so\s+)?sorry|my\s+apologies|apologize|didn'?t\s+mean\s+to|forgive\s+me)\b/i,
];

const EXPLANATION_PATTERNS = [
  /\b(i\s+was\s+(just\s+)?busy|tied\s+up|running\s+late|at\s+work|stuck\s+in|because|the\s+reason\s+is|had\s+to\s+deal\s+with|swamped)\b/i,
];

const ACKNOWLEDGMENT_PATTERNS = [
  /\b(did\s+you\s+take\s+it\s+that\s+way|i\s+hear\s+you|i\s+understand|i\s+see\s+what\s+you\s+mean|that\s+makes\s+sense|point\s+taken|i\s+get\s+it)\b/i,
];

const INQUIRY_PATTERNS = [
  /\?/,
  /\b(are\s+you|how\s+are\s+you|what\s+do\s+you\s+think|can\s+we|could\s+we|would\s+you)\b/i,
];

const BRIEF_CLOSING_PATTERNS = [
  /^(nothing\s+like\s+that\.?\s*bye\.?)$/i,
  /^((ok|okay|fine|whatever|k|bye|cya|gtg)\.?)$/i,
  /\b(bye|talk\s+later|leaving\s+now|see\s+ya)\b/i,
];

const REASSURANCE_PATTERNS = [
  /\b(nothing\s+like\s+that|not\s+at\s+all|don'?t\s+worry|we'?re\s+good|all\s+good|everything\s+is\s+fine|love\s+you|care\s+about\s+you)\b/i,
];

export function analyzeCommunication(
  text: string,
  perspective: 'sender_review' | 'recipient_insight' = 'sender_review',
  previousPartnerMessage?: string
): CommunicationFeedback {
  const trimmed = (text || '').trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const detectedCues: DetectedCue[] = [];

  // 1. Check Apologies
  for (const pattern of APOLOGY_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      detectedCues.push({
        id: 'cue-apology',
        type: 'apology',
        label: 'Apology / Amends',
        evidence: match[0],
        description: 'Contains language expressing regret or an apology.',
      });
      break;
    }
  }

  // 2. Check Explanations
  for (const pattern of EXPLANATION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      detectedCues.push({
        id: 'cue-explanation',
        type: 'explanation',
        label: 'Contextual Explanation',
        evidence: match[0],
        description: 'Offers factual context explaining the situation or behavior.',
      });
      break;
    }
  }

  // 3. Check Acknowledgments
  for (const pattern of ACKNOWLEDGMENT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      detectedCues.push({
        id: 'cue-acknowledgment',
        type: 'acknowledgment',
        label: 'Active Acknowledgment',
        evidence: match[0],
        description: 'Acknowledges the partner’s perception or feelings.',
      });
      break;
    }
  }

  // 4. Check Reassurance
  for (const pattern of REASSURANCE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      detectedCues.push({
        id: 'cue-reassurance',
        type: 'reassurance',
        label: 'Reassurance',
        evidence: match[0],
        description: 'Signals reassurance against concerns or assumptions.',
      });
      break;
    }
  }

  // 5. Check Inquiries
  for (const pattern of INQUIRY_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      detectedCues.push({
        id: 'cue-inquiry',
        type: 'inquiry',
        label: 'Open Question / Check-in',
        evidence: match[0],
        description: 'Poses a question that invites response or collaborative clarification.',
      });
      break;
    }
  }

  // 6. Check Brief Closing / Abruptness
  let isBriefClosing = false;
  let closingEvidence = '';
  for (const pattern of BRIEF_CLOSING_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      isBriefClosing = true;
      closingEvidence = match[0];
      break;
    }
  }

  const isVeryShort = wordCount <= 5;
  const endsWithByeOrFine = /\b(bye|fine|whatever|k)\b/i.test(trimmed);
  const hasAbruptEnding = isBriefClosing || (isVeryShort && endsWithByeOrFine);

  if (hasAbruptEnding) {
    detectedCues.push({
      id: 'cue-brief-closing',
      type: 'brief_closing',
      label: 'Concise / Closing Statement',
      evidence: closingEvidence || trimmed,
      description: 'The message is very brief and signals an immediate exit from the conversation.',
    });
  }

  const hasApology = detectedCues.some(c => c.type === 'apology');
  const hasExplanation = detectedCues.some(c => c.type === 'explanation');
  const hasAcknowledgment = detectedCues.some(c => c.type === 'acknowledgment');
  const hasInquiry = detectedCues.some(c => c.type === 'inquiry');

  // Build restrained neutral summary
  let neutralSummary = '';
  let constructiveSuggestion: string | undefined = undefined;

  if (hasExplanation && hasApology) {
    neutralSummary = 'This response includes an explanation and an apology. It may help clarify an unintended misunderstanding.';
  } else if (hasExplanation && hasAcknowledgment) {
    neutralSummary = 'This response offers context and acknowledges the other person’s perspective directly.';
  } else if (hasExplanation) {
    neutralSummary = 'This response offers an explanation for what occurred. It provides helpful factual context.';
  } else if (hasApology) {
    neutralSummary = 'This response includes an apology, expressing accountability for how things felt.';
  } else if (hasAbruptEnding) {
    if (perspective === 'sender_review') {
      neutralSummary = 'This message is brief and ends the exchange without further context.';
      constructiveSuggestion = 'This message may sound abrupt without additional context. Would you like to clarify if you are busy or when you can reconnect?';
    } else {
      neutralSummary = 'This response is brief and ends the conversation. Depending on the context, the other person might feel their concern remains unresolved.';
      constructiveSuggestion = 'A brief reply often reflects time pressure rather than disinterest. You can choose to check in gently later.';
    }
  } else if (isVeryShort && !hasInquiry) {
    neutralSummary = 'This response is concise. In digital messaging, short phrases can sometimes be interpreted in different tones depending on prior context.';
    if (perspective === 'sender_review') {
      constructiveSuggestion = 'Consider adding a warm sign-off or brief context if you wish to reassure your partner.';
    }
  } else {
    neutralSummary = 'This message communicates your thought clearly. No unusual conversational friction cues were identified.';
  }

  const educationalNote =
    'BetweenUs notes communication cues for reflection only. It does not diagnose emotional states or judge personal intentions.';

  return {
    perspective,
    wordCount,
    hasAbruptEnding,
    hasApology,
    hasExplanation,
    hasAcknowledgment,
    hasInquiry,
    detectedCues,
    neutralSummary,
    constructiveSuggestion,
    educationalNote,
  };
}
