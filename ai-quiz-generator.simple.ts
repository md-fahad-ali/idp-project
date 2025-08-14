import { v4 as uuidv4 } from 'uuid';
import { Groq } from 'groq-sdk';

// Simple interface for questions
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  difficulty: string;
  hasCodeExample: boolean;
}

// Course content interface
export interface CourseContent {
  title: string;
  lessons: {
    title: string;
    content?: string;
    keyPoints?: string[];
  }[];
}

/**
 * Super simplified function to generate quiz questions
 * No regex, no complex parsing, just basic functionality
 */
export async function generateQuestionsForCourse(
  courseContent: CourseContent,
  numQuestions: number = 5
): Promise<Question[]> {
  console.log("Starting question generation");
  
  try {
    // Check if API key exists
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.log("Missing GROQ API key");
      throw new Error('AI_QUIZ_GENERATION_FAILED: Missing GROQ_API_KEY');
    }
    
    // Create Groq client
    const groq = new Groq({ apiKey });
    
    // Extract lesson content in simple format
    const lessonsText = courseContent.lessons
      .map(lesson => `Lesson: ${lesson.title}\nContent: ${lesson.content || ''}`)
      .join('\n\n');

    // Add per-call randomness to encourage diverse outputs
    const nonce = uuidv4();
    const styles = ['conceptual', 'practical', 'tricky', 'scenario-based', 'code-focused', 'analogy-driven'];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const hasCode = /```|\bfunction\b|console\.|<[^>]+>|;\s*$/m.test(lessonsText);
    const wantCodeQ = hasCode && Math.random() < 0.6; // ~60% of the time include a code-based question when code exists
    
    // Prompt with explicit variability + optional code-question requirement
    const prompt = `
    Create ${numQuestions} multiple-choice questions based on the course content below.
    Return ONLY a JSON array. Each item must include keys: "text", "options" (exactly 4 strings), and "correctAnswer" (one of the options).

    Requirements for variability:
    - Every run must produce different questions. Change wording, focus, and order each time.
    - Style: ${style}
    - Nonce: ${nonce}
    ${wantCodeQ ? '- Include at least ONE code-based question if possible (referencing provided code snippets).' : ''}

    Course Content:
    ${lessonsText}
    `;
    
    // Make API request
    console.log("Sending API request");
    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: "You are a quiz creator. Return ONLY a JSON array with questions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.85,
      max_tokens: 2000
    });
    
    // Print response
    const content = response.choices[0].message.content || '';
    console.log("AI RESPONSE:");
    console.log(content);
    
    try {
      // Try to parse JSON from the AI response
      let questions;
      try {
        // First try direct JSON parsing
        questions = JSON.parse(content);
        
        // Log the successfully parsed questions
        console.log("Successfully parsed questions:", questions);
      } catch (error) {
        // If direct parsing fails, try to extract JSON array from the text
        const startIndex = content.indexOf('[');
        const endIndex = content.lastIndexOf(']') + 1;
        
        if (startIndex >= 0 && endIndex > startIndex) {
          const jsonStr = content.substring(startIndex, endIndex);
          try {
            questions = JSON.parse(jsonStr);
            console.log("Extracted and parsed questions:", questions);
          } catch (extractError) {
            console.log("Failed to parse extracted JSON:", extractError);
            throw new Error('Could not parse extracted JSON');
          }
        } else {
          throw new Error('Could not extract JSON from response');
        }
      }
      
      // Ensure questions is an array
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Questions not in expected format');
      }
      
      // Add IDs and set missing properties
      // Make sure each question is properly formatted for the ChallengeQuiz component
      const formattedQuestions = questions.map(q => ({
        id: uuidv4(),
        text: q.text,
        options: q.options || ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: q.correctAnswer || q.options?.[0] || '',
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'EASY',
        hasCodeExample: q.hasCodeExample || q.text.includes('```') || false
      }));
      
      console.log("Final formatted questions:", formattedQuestions);
      
      // Ensure we always return the requested number of questions
      if (formattedQuestions.length < numQuestions) {
        throw new Error('AI_QUIZ_GENERATION_FAILED: Insufficient questions');
      }
      
      return formattedQuestions;
    } catch (error) {
      console.log("Failed to parse AI response:", error instanceof Error ? error.message : String(error));
      // Bubble up so UI can show error
      throw new Error('AI_QUIZ_GENERATION_FAILED: Parse error');
    }
  } catch (error) {
    console.log("Error:", error instanceof Error ? error.message : String(error));
    // Bubble up so UI can show error
    throw new Error('AI_QUIZ_GENERATION_FAILED');
  }
}

 