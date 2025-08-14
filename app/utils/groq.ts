import Groq from "groq-sdk";
import { ILesson, Question } from '../../types';
import { QuestionDifficulty } from "../types/index";
import { v4 as uuidv4 } from 'uuid';

// Require API key explicitly (no hardcoded fallbacks)
const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
if (!API_KEY) {
  throw new Error('AI_QUIZ_GENERATION_FAILED: Missing NEXT_PUBLIC_GROQ_API_KEY');
}

// Create the SDK client or fail fast (no mock client)
let groq: Groq;
try {
  groq = new Groq({ 
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true
  });
} catch (error) {
  console.error('Failed to initialize Groq client:', error);
  throw new Error('AI_QUIZ_GENERATION_FAILED: Client initialization failed');
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
      "timeLimit": number (time in seconds)
    }
  ]
}

Rules:
1. Generate 3-5 questions per lesson
2. Each question must have exactly 4 options
3. correctAnswer must be 0-3 (index of correct option)
4. Keep explanations clear and concise
5. Focus on key concepts if content is long
6. Set appropriate difficulty levels:
   - easy: basic recall questions
   - medium: understanding and application
   - hard: analysis and complex concepts
7. Set appropriate time limits:
   - easy: 30-45 seconds
   - medium: 45-60 seconds
   - hard: 60-90 seconds
8. Adjust time based on question length and complexity
9. Ensure response is valid JSON`;

export async function generateQuestionsFromLessons(lessons: ILesson[]): Promise<any> {
  // Check if we have lessons to work with
  if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
    throw new Error('AI_QUIZ_GENERATION_FAILED: No lessons provided');
  }
  
  try {
    // Prepare lesson content for the prompt
    const lessonContent = lessons.map(lesson => ({
      title: lesson.title || 'Untitled Lesson',
      content: lesson.content || 'No content available'
    }));

    console.log(`Generating questions for ${lessonContent.length} lessons`);
    
    try {
      // Add per-call randomness and optional code-question requirement
      const nonce = uuidv4();
      const styles = ['conceptual', 'practical', 'tricky', 'scenario-based', 'code-focused', 'analogy-driven'];
      const style = styles[Math.floor(Math.random() * styles.length)];
      const rawText = lessonContent.map(l => `${l.title}\n${l.content}`).join('\n\n');
      // Detect presence of code in lesson text
      const hasCode = /```|\b(function|class|const|let|var)\b|=>|console\.|import\s+|export\s+|<[^>]+>/m.test(rawText);
      // Extract fenced code blocks if present
      const codeBlocks = Array.from(rawText.matchAll(/```[a-zA-Z0-9]*\n[\s\S]*?```/g)).map(m => m[0]).slice(0, 3);
      // If no fenced blocks, heuristically extract short code-like lines
      const heuristicCode = !codeBlocks.length
        ? rawText.split('\n').filter(l => /;\s*$|=>|\b(function|class|const|let|var)\b|console\./.test(l)).slice(0, 8)
        : [];
      const codeContext = codeBlocks.length ? codeBlocks.join('\n\n') : heuristicCode.join('\n');
      const wantCodeQ = hasCode; // now mandatory: include at least one code-based question when code exists
      console.log('QuestionGen meta:', { nonce, style, wantCodeQ, hasCode, codeBlocks: codeBlocks.length });

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: `Create diverse multiple-choice questions based on these lessons. Return ONLY valid JSON as per the schema.

Variability requirements:
- Every run must produce different questions. Change wording, focus, and order each time.
- Style: ${style}
- Nonce: ${nonce}
- Please dont ask question from outside the provided content 
${wantCodeQ ? '- Include at least ONE code-based question that directly references the provided code. Prefer real identifiers and behaviors from the code.' : ''}

Lessons:
${JSON.stringify(lessonContent)}

${hasCode ? `Code Snippets (for reference; use them to craft at least one question):\n${codeContext}` : ''}`
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.95,
        top_p: 0.9,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      
      if (!content) {
        console.error('No content in API response');
        throw new Error('AI_QUIZ_GENERATION_FAILED: Empty response');
      }

      return parseQuestionsFromJson(content);
    } catch (apiError) {
      console.error('API error in groq.chat.completions.create:', apiError);
      throw new Error('AI_QUIZ_GENERATION_FAILED: API error');
    }
  } catch (error) {
    console.error('Error in generateQuestionsFromLessons:', error);
    throw error instanceof Error ? error : new Error('AI_QUIZ_GENERATION_FAILED');
  }
}

// Extract the JSON parsing into its own function for cleaner code
function parseQuestionsFromJson(content: string): { questions: Question[] } {
  try {
    // Clean and prepare the JSON string
    let jsonStr = content;
    
    // Remove any markdown code block markers
    jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '');
    
    // Remove any leading/trailing whitespace
    jsonStr = jsonStr.trim();
    
    // Try to extract JSON if it's still not clean
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    // Clean up any malformed options arrays (remove extra spaces at start of strings)
    jsonStr = jsonStr.replace(/"(\s+)"/g, '"');
    
    console.log('Parsing JSON from response');
    
    // Parse the JSON
    const questions = JSON.parse(jsonStr);
    
    // Validate the structure
    if (!questions.questions || !Array.isArray(questions.questions)) {
      console.error('Invalid questions structure:', questions);
      throw new Error('AI_QUIZ_GENERATION_FAILED: Invalid JSON structure');
    }

    // Clean and validate each question
    const validQuestions = questions.questions
      .map((q: any) => ({
        ...q,
        // Clean up options array - trim each option
        options: Array.isArray(q.options) 
          ? q.options.map((opt: string) => typeof opt === 'string' ? opt.trim() : opt)
          : q.options
      }))
      .filter((q: any): q is Question => 
        q.id && 
        typeof q.question === 'string' &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((opt: any) => typeof opt === 'string') &&
        typeof q.correctAnswer === 'number' &&
        q.correctAnswer >= 0 &&
        q.correctAnswer <= 3 &&
        typeof q.explanation === 'string' &&
        isValidDifficulty(q.difficulty) &&
        typeof q.timeLimit === 'number' &&
        q.timeLimit >= 30 &&
        q.timeLimit <= 90
      );

    if (validQuestions.length === 0) {
      console.error('No valid questions after filtering');
      console.error('Original questions:', questions.questions);
      throw new Error('AI_QUIZ_GENERATION_FAILED: No valid questions');
    }

    return { questions: validQuestions };
  } catch (e) {
    console.error('Error parsing questions JSON:', e);
    console.error('Raw content:', content);
    throw new Error('AI_QUIZ_GENERATION_FAILED: Parse error');
  }
}

function isValidDifficulty(difficulty: any): difficulty is QuestionDifficulty {
  return ['easy', 'medium', 'hard'].includes(difficulty);
} 