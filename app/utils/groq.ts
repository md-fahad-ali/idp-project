import Groq from "groq-sdk";
import { ILesson, Question } from '../../types';
import { QuestionDifficulty } from "../types/index";

// Add fallback key handling
const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
if (!API_KEY) {
  console.warn('NEXT_PUBLIC_GROQ_API_KEY is not defined in environment variables, using mock data');
}

// Create the SDK client with proper error handling
let groq: Groq;
try {
  groq = new Groq({ 
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true
  });
} catch (error) {
  console.error('Failed to initialize Groq client:', error);
  // Create a dummy client that will return mock data if API doesn't work
  groq = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ 
            message: { 
              content: JSON.stringify({
                questions: [
                  {
                    id: 1,
                    question: "What happened to the API connection?",
                    options: ["Connection error", "API key issue", "Rate limiting", "Service unavailable"],
                    correctAnswer: 0,
                    explanation: "There was an error connecting to the AI service to generate questions.",
                    difficulty: "medium",
                    timeLimit: 45
                  }
                ]
              })
            }
          }]
        })
      }
    }
  } as unknown as Groq;
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
    console.warn('No lessons provided to generate questions from');
    return { questions: [] };
  }
  
  try {
    // Prepare lesson content for the prompt
    const lessonContent = lessons.map(lesson => ({
      title: lesson.title || 'Untitled Lesson',
      content: lesson.content || 'No content available'
    }));

    console.log(`Generating questions for ${lessonContent.length} lessons`);
    
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: `Generate test questions based on these lessons. Remember to return ONLY valid JSON: ${JSON.stringify(lessonContent)}`
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      
      if (!content) {
        console.error('No content in API response');
        return { questions: [] };
      }

      return parseQuestionsFromJson(content);
    } catch (apiError) {
      console.error('API error in groq.chat.completions.create:', apiError);
      // Fall back to mock data
      return { 
        questions: [
          {
            id: 1,
            question: "There was an error generating questions. What might be the cause?",
            options: ["API key issue", "Network error", "Server unavailable", "Rate limit exceeded"],
            correctAnswer: 0,
            explanation: "The AI service encountered an error while generating questions.",
            difficulty: "medium",
            timeLimit: 45
          }
        ]
      };
    }
  } catch (error) {
    console.error('Error in generateQuestionsFromLessons:', error);
    return { questions: [] };
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
      return { questions: [] };
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
    }

    return { questions: validQuestions };
  } catch (e) {
    console.error('Error parsing questions JSON:', e);
    console.error('Raw content:', content);
    return { questions: [] };
  }
}

function isValidDifficulty(difficulty: any): difficulty is QuestionDifficulty {
  return ['easy', 'medium', 'hard'].includes(difficulty);
} 