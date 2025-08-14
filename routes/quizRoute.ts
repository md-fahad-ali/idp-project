import express, { Request, Response } from 'express';
import Groq from 'groq-sdk';

const router = express.Router();

// Expect GROQ_API_KEY on the server
const API_KEY = process.env.GROQ_API_KEY || '';
if (!API_KEY) {
  console.error('GROQ_API_KEY is missing. AI generation route will throw on use.');
}

const SYSTEM_PROMPT = `You are a specialized AI for generating educational test questions. Generate multiple-choice questions based on the provided lesson content.

IMPORTANT: Your response must be valid JSON in exactly this format:
{
  "questions": [
    {
      "id": number,
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": number,
      "explanation": "string",
      "difficulty": "easy" | "medium" | "hard",
      "timeLimit": number
    }
  ]
}

Rules:
1. Generate 3-5 questions per lesson
2. Each question must have exactly 4 options
3. correctAnswer must be 0-3 (index of correct option)
4. Keep explanations clear and concise
5. Set difficulty appropriately (easy/medium/hard)
6. Set timeLimit in seconds (30-90) based on complexity
7. Ensure the response is valid JSON only`;

function parseQuestionsFromJson(content: string) {
  let jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];
  const parsed = JSON.parse(jsonStr);
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('AI_QUIZ_GENERATION_FAILED: Invalid JSON structure');
  }
  const valid = parsed.questions.filter((q: any) =>
    q && typeof q.id === 'number' && typeof q.question === 'string' &&
    Array.isArray(q.options) && q.options.length === 4 &&
    q.options.every((o: any) => typeof o === 'string') &&
    typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3 &&
    typeof q.explanation === 'string' &&
    ['easy','medium','hard'].includes(q.difficulty) &&
    typeof q.timeLimit === 'number' && q.timeLimit >= 30 && q.timeLimit <= 90
  );
  if (!valid.length) throw new Error('AI_QUIZ_GENERATION_FAILED: No valid questions');
  return { questions: valid };
}

const generateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lessons, numQuestions } = req.body || {};
    if (!API_KEY) {
      res.status(500).json({ error: 'AI_QUIZ_GENERATION_FAILED: Missing GROQ_API_KEY' });
      return;
    }
    if (!Array.isArray(lessons) || lessons.length === 0) {
      res.status(400).json({ error: 'AI_QUIZ_GENERATION_FAILED: No lessons provided' });
      return;
    }

    const groq = new Groq({ apiKey: API_KEY });

    // Per-call variability + code-awareness
    const nonce = Math.random().toString(36).slice(2);
    const styles = ['conceptual','practical','tricky','scenario-based','code-focused','analogy-driven'];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const rawText = lessons.map((l: any) => `${l.title || 'Untitled'}\n${l.content || ''}`).join('\n\n');
    const hasCode = /```|\b(function|class|const|let|var)\b|=>|console\.|import\s+|export\s+|<[^>]+>/m.test(rawText);
    const codeBlocks = Array.from(rawText.matchAll(/```[a-zA-Z0-9]*\n[\s\S]*?```/g)).map(m => m[0]).slice(0, 3);
    const heuristicCode = !codeBlocks.length ? rawText.split('\n').filter(l => /;\s*$|=>|\b(function|class|const|let|var)\b|console\./.test(l)).slice(0, 8) : [];
    const codeContext = codeBlocks.length ? codeBlocks.join('\n\n') : heuristicCode.join('\n');

    const userContent = `Create diverse multiple-choice questions based on these lessons. Return ONLY valid JSON as per the schema.

Variability requirements:
- Every run must produce different questions. Change wording, focus, and order each time.
- Style: ${style}
- Nonce: ${nonce}
- Please dont ask question from outside the provided content
${hasCode ? '- Include at least ONE code-based question that directly references the provided code. Prefer real identifiers and behaviors from the code.' : ''}
${numQuestions ? `- Aim for a total of ${numQuestions} questions overall.` : ''}

Lessons:\n${JSON.stringify(lessons)}
${hasCode ? `\nCode Snippets (for reference):\n${codeContext}` : ''}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.95,
      top_p: 0.9,
      max_tokens: 2000,
    });

    const content = completion.choices?.[0]?.message?.content || '';
    if (!content) {
      res.status(500).json({ error: 'AI_QUIZ_GENERATION_FAILED: Empty response' });
      return;
    }

    const parsed = parseQuestionsFromJson(content);
    res.status(200).json(parsed);
    return;
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    const message = typeof err?.message === 'string' ? err.message : 'AI_QUIZ_GENERATION_FAILED';
    res.status(500).json({ error: message });
    return;
  }
};

router.post('/generate', generateHandler);

export default router;
