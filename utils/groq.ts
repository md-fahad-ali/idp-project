import { ILesson } from '../types';

const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a specialized AI for generating educational test questions. Your task is to:
1. Analyze the given lesson content
2. Generate multiple-choice questions that test understanding of key concepts
3. Return questions in a specific JSON format
4. Keep explanations clear and educational
5. Generate 3-5 questions per lesson
6. If content is too long, focus on main concepts

Output format must be exactly:
{
  "questions": [
    {
      "id": number,
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": number (0-3),
      "explanation": "string"
    }
  ]
}`;

export async function generateQuestionsFromLessons(lessons: ILesson[]): Promise<any> {
  try {
    // Prepare lesson content for the prompt
    const lessonContent = lessons.map(lesson => ({
      title: lesson.title,
      content: lesson.content
    }));

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: `Generate test questions based on these lessons: ${JSON.stringify(lessonContent)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    try {
      // Parse the response to ensure it's valid JSON
      const questions = JSON.parse(data.choices[0].message.content);
      return questions;
    } catch (e) {
      console.error('Error parsing questions:', e);
      return { questions: [] };
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    return { questions: [] };
  }
} 