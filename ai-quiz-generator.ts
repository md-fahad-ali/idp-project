import { v4 as uuidv4 } from 'uuid';
import { Groq } from 'groq-sdk';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  topic?: string;
  difficulty?: string;
  hasCodeExample?: boolean;
}

export interface CourseContent {
  title: string;
  lessons: {
    title: string;
    content?: string;
    keyPoints?: string[];
  }[];
}

/**
 * Generates quiz questions using Groq AI based on course content
 */
export async function generateQuestionsForCourse(
  courseContent: CourseContent,
  numQuestions: number = 5
): Promise<Question[]> {
  console.log("======= QUIZ GENERATION STARTED =======");
  
  // Check if API key exists
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("Missing GROQ_API_KEY. Cannot generate questions.");
    return [];
  }
  
  try {
    // Initialize Groq client
    const groq = new Groq({ apiKey });
    
    // Extract lesson content
    const lessonsText = courseContent.lessons
      .map(lesson => `LESSON: ${lesson.title}\n${lesson.content || ''}\nKEY POINTS: ${(lesson.keyPoints || []).join(', ')}`)
      .join('\n\n');
    
    // Determine content type (simple)
    const isProgramming = courseContent.title.toLowerCase().includes('code') || 
                          courseContent.title.toLowerCase().includes('programming') ||
                          courseContent.title.toLowerCase().includes('javascript') ||
                          courseContent.title.toLowerCase().includes('python');
    
    // Create prompt
    const prompt = `
    Create ${numQuestions} multiple-choice quiz questions based on this course content:
    
    COURSE: ${courseContent.title}
    ${lessonsText}
    
    Each question must have exactly 4 options (A, B, C, D) and one correct answer.
    Only include questions about topics covered in the course content.
    
    Return your response as a JSON array in this format:
    [
      {
        "text": "Question text goes here?",
        "options": ["First option", "Second option", "Third option", "Fourth option"],
        "correctAnswer": "The correct option text exactly as written in options",
        "topic": "Topic name",
        "difficulty": "EASY, MEDIUM or HARD"
      }
    ]
    `;
    
    console.log("Making API request...");
    
    // Make API request
    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: "You are an expert quiz creator. Return ONLY a JSON array with quiz questions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
    
    // Get content
    const content = response.choices[0].message.content || '';
    
    // Print the complete response
    console.log("======= AI RESPONSE =======");
    console.log(content);
    console.log("==========================");
    
    // Just return an empty array 
    // This way we ensure the function doesn't crash
    // The AI's response is already printed
    return [];
  } catch (error) {
    // Ensure we still print the error but don't crash
    console.log("Error:", error instanceof Error ? error.message : String(error));
    return [];
  }
}