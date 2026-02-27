import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are the core system engine of an AI debate game called The Devil’s Advocate.
Your role is NOT to be agreeable. You are a strict debate judge, adversary, bias manipulator, and competitive scoring engine.
You must:
- Be intellectually aggressive.
- Avoid validating weak arguments.
- Penalize laziness.
- Explicitly detect logical fallacies.
- Avoid giving full scores unless performance is truly exceptional.
Tone: Cold, analytical, sharp. This is a competitive intellectual arena.`;

export const LEVEL_FIRST_SPEAKER = ["AI", "Player", "AI", "Player", "AI", "Player", "AI", "Player", "AI", "Player"];

export async function generateTopic(language: string) {
  const prompt = `LANGUAGE: ${language}
Generate a neutral, highly debatable topic suitable for a rigorous intellectual debate.
The topic should be balanced, allowing for strong arguments on both sides.
Return ONLY the topic text as a plain string, no quotes, no extra text.
ALL GENERATED CONTENT MUST BE IN THE REQUESTED LANGUAGE.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });

  return response.text?.trim() || "";
}

export async function generateSides(topic: string, language: string) {
  const prompt = `LANGUAGE: ${language}
Topic: ${topic}

Generate two clear, balanced, and opposing sides for this debate topic.
ALL GENERATED CONTENT MUST BE IN THE REQUESTED LANGUAGE.

Return JSON matching this schema:
{
  "topic": "The original topic (translated if necessary)",
  "description": "A brief 1-sentence description of the core conflict",
  "sideA": {
    "title": "Short title for Side A (e.g. 'Pro-Regulation')",
    "summary": "1-sentence summary of Side A's stance"
  },
  "sideB": {
    "title": "Short title for Side B (e.g. 'Free Market')",
    "summary": "1-sentence summary of Side B's stance"
  }
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          description: { type: Type.STRING },
          sideA: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING }
            },
            required: ["title", "summary"]
          },
          sideB: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING }
            },
            required: ["title", "summary"]
          }
        },
        required: ["topic", "description", "sideA", "sideB"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateTurn(topicTitle: string, topicDesc: string, playerRole: string, aiRole: string, levelIndex: number, turnIndex: number, history: any[], hardcoreFlag: boolean, language: string) {
  const prompt = `LANGUAGE: ${language}
Topic: ${topicTitle} - ${topicDesc}
Player Role: ${playerRole}
AI Role: ${aiRole}
Level: ${levelIndex + 1}
Turn: ${turnIndex + 1}
Hardcore Mode: ${hardcoreFlag}
History: ${JSON.stringify(history)}

Generate the AI's next argument in the debate. The AI is arguing from the perspective of "${aiRole}" against the player's stance "${playerRole}".
Keep it concise, UI-friendly (max 2-3 sentences), and intellectually aggressive.
ALL GENERATED CONTENT MUST BE IN THE REQUESTED LANGUAGE.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });

  return { speaker: "AI", text: response.text || "" };
}

export async function generatePlayerChoices(topicTitle: string, topicDesc: string, playerRole: string, aiRole: string, levelIndex: number, turnIndex: number, history: any[], hardcoreFlag: boolean, language: string) {
  const prompt = `LANGUAGE: ${language}
Topic: ${topicTitle} - ${topicDesc}
Player Role: ${playerRole}
AI Role: ${aiRole}
Level: ${levelIndex + 1}
Turn: ${turnIndex + 1}
Hardcore Mode: ${hardcoreFlag}
History: ${JSON.stringify(history)}

Generate 2 to 4 possible response choices for the player. The player is arguing from the perspective of "${playerRole}".
Exactly ONE choice must be logically sound and "correct" in the context of a rigorous debate.
The other choices should contain logical fallacies, weak evidence, or emotional appeals.
If Hardcore is true, make the correct choice subtler and harder to distinguish from the plausible incorrect ones.
ALL GENERATED CONTENT MUST BE IN THE REQUESTED LANGUAGE.

Return JSON matching this schema:
{
  "choices": [
    {
      "id": "unique_string",
      "text": "The choice text",
      "rationaleForCorrectness": "Why this is correct or incorrect (max 2 sentences)",
      "isCorrect": boolean
    }
  ],
  "recommendedNumber": integer
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                rationaleForCorrectness: { type: Type.STRING },
                isCorrect: { type: Type.BOOLEAN }
              },
              required: ["id", "text", "rationaleForCorrectness", "isCorrect"]
            }
          },
          recommendedNumber: { type: Type.INTEGER }
        },
        required: ["choices", "recommendedNumber"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function explainChoice(topicTitle: string, topicDesc: string, playerRole: string, aiRole: string, choiceId: string, history: any[], hardcoreFlag: boolean, preGeneratedRationale: string, isCorrect: boolean, language: string) {
  // In a fully dynamic setup, this could call the AI again. 
  // To ensure fast UI feedback, we use the pre-generated rationale from generatePlayerChoices.
  return {
    type: isCorrect ? "correct" : "incorrect",
    explanationText: preGeneratedRationale
  };
}

export async function levelSummary(topicTitle: string, topicDesc: string, playerRole: string, aiRole: string, history: any[], hardcoreFlag: boolean, language: string) {
  const prompt = `LANGUAGE: ${language}
Topic: ${topicTitle} - ${topicDesc}
Player Role: ${playerRole}
AI Role: ${aiRole}
Hardcore Mode: ${hardcoreFlag}
Debate History: ${JSON.stringify(history)}

Generate a post-level summary of the player's performance.
Calculate a score (0-100) based on their correct picks and penalties for wrong attempts.
Provide a per-turn analysis explaining why their selected choices were correct or incorrect, and overall tips.
ALL GENERATED CONTENT MUST BE IN THE REQUESTED LANGUAGE.

Return JSON matching this schema:
{
  "score": integer,
  "overallTips": "string",
  "perTurnAnalysis": [
    {
      "turnIndex": integer,
      "playerChoiceText": "string",
      "isCorrect": boolean,
      "explanation": "string"
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          overallTips: { type: Type.STRING },
          perTurnAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                turnIndex: { type: Type.INTEGER },
                playerChoiceText: { type: Type.STRING },
                isCorrect: { type: Type.BOOLEAN },
                explanation: { type: Type.STRING }
              },
              required: ["turnIndex", "playerChoiceText", "isCorrect", "explanation"]
            }
          }
        },
        required: ["score", "overallTips", "perTurnAnalysis"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function evaluateHumanVsHuman(topic: string, transcript: { player: number, text: string }[], language: string = 'en') {
  const transcriptText = transcript.map(t => `Player ${t.player}: ${t.text}`).join('\n\n');
  
  const prompt = `LANGUAGE: ${language}
Evaluate the following debate between two human players on the topic: "${topic}".
  
Transcript:
${transcriptText}

Score each player on Rhetoric (0-10), Evidence (0-10), and Logic (0-10).
Detect logical fallacies used and deduct points:
- Minor fallacy (weak analogy, oversimplification): -1
- Moderate (false cause, strawman): -2
- Severe (ad hominem, circular reasoning, false dilemma): -3
Final Score = Average(Rhetoric, Evidence, Logic) * 10 - total penalties.

Provide a detailed evaluation for BOTH players, including:
- Strengths
- Weaknesses
- Most critical mistake
- Final Score (out of 100)
- Who won and why.

Be strict. Scores above 85/100 should be rare.
ALL GENERATED CONTENT MUST BE IN THE REQUESTED LANGUAGE.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    }
  });

  return response.text;
}

export async function generateClassicDebateResponse(topic: string, aiSide: string, userSide: string, transcript: { role: 'user' | 'ai', text: string }[], language: string = 'en') {
  const transcriptText = transcript.map(t => `${t.role === 'user' ? 'User' : 'AI'}: ${t.text}`).join('\n\n');
  
  const prompt = `LANGUAGE: ${language}
We are debating the topic: "${topic}".
I (the AI) am arguing FOR: "${aiSide}".
The User is arguing FOR: "${userSide}".

Here is the debate so far:
${transcriptText}

Provide your next rebuttal or opening statement as the AI.
Be intellectually aggressive, challenge weak premises, call out emotional reasoning, and identify fallacies explicitly.
Do not break character. Keep your response concise, sharp, and impactful (under 200 words).
ALL GENERATED CONTENT MUST BE IN THE REQUESTED LANGUAGE.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    }
  });

  return response.text;
}

export async function evaluateClassicDebate(topic: string, aiSide: string, userSide: string, transcript: { role: 'user' | 'ai', text: string }[], isHardcoreTimeout: boolean = false, language: string = 'en') {
  const transcriptText = transcript.map(t => `${t.role === 'user' ? 'User' : 'AI'}: ${t.text}`).join('\n\n');
  
  const prompt = `LANGUAGE: ${language}
Evaluate the user's performance in the following debate.
Topic: "${topic}"
AI argued FOR: "${aiSide}"
User argued FOR: "${userSide}"

Transcript:
${transcriptText}

${isHardcoreTimeout ? "NOTE: The user failed to respond within the time limit in Hardcore Mode. Apply a heavy penalty (-10) for unfinished argument." : ""}

Score the user on Rhetoric (0-10), Evidence (0-10), and Logic (0-10).
Detect logical fallacies used and deduct points:
- Minor fallacy: -1
- Moderate: -2
- Severe: -3
Base Score = Average(Rhetoric, Evidence, Logic) * 10
Final Score = Base Score - total penalties ${isHardcoreTimeout ? "- 10 (timeout penalty)" : ""}.

Provide a detailed breakdown, total score, and simulate a leaderboard entry:
"Your score: X / 100"
"Estimated Rank Tier:"
0–40 = Novice
41–60 = Intermediate
61–75 = Advanced
76–85 = Elite
86+ = Grandmaster (rare)

Be strict. Do not reward surface-level arguments.
ALL GENERATED CONTENT MUST BE IN THE REQUESTED LANGUAGE.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    }
  });

  return response.text;
}

export async function generateBiasScannerQuestion(difficultyScore: number, language: string = 'en') {
  let difficulty = 'obvious fallacies (e.g., strawman, ad hominem)';
  if (difficultyScore >= 50 && difficultyScore < 100) difficulty = 'moderate fallacies (e.g., false cause, slippery slope)';
  if (difficultyScore >= 100) difficulty = 'subtle fallacies (e.g., equivocation, begging the question, composition/division)';

  const prompt = `LANGUAGE: ${language}
Generate a random argument intentionally containing ONE primary fallacy. Also include 1-2 minor rhetorical flaws.
Difficulty level: ${difficulty}.
Provide 4 answer choices (one correct fallacy, three plausible but incorrect options).
Also provide explanations for why the correct answer is correct and why the others are wrong.
ALL GENERATED CONTENT MUST BE IN THE REQUESTED LANGUAGE.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          argument: { type: Type.STRING, description: "The argument containing the fallacy" },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "4 answer choices, one correct, three incorrect"
          },
          correctOptionIndex: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
          explanationCorrect: { type: Type.STRING, description: "Explanation of why the correct answer is correct" },
          explanationIncorrect: { type: Type.STRING, description: "Explanation of why the other options are wrong" }
        },
        required: ["argument", "options", "correctOptionIndex", "explanationCorrect", "explanationIncorrect"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
