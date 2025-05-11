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
      return generateFallbackQuestions(courseContent, numQuestions);
    }
    
    // Create Groq client
    const groq = new Groq({ apiKey });
    
    // Extract lesson content in simple format
    const lessonsText = courseContent.lessons
      .map(lesson => `Lesson: ${lesson.title}\nContent: ${lesson.content || ''}`)
      .join('\n\n');
    
    // Create a simple prompt
    const prompt = `
    Create ${numQuestions} multiple-choice quiz questions based on this course:
    
    COURSE TITLE: ${courseContent.title}
    COURSE CONTENT:
    ${lessonsText}
    
    Each question must have:
    - A clear question text
    - Exactly 4 answer options
    - One correct answer
    
    Format as JSON array:
    [
      {
        "text": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "The correct option exactly as written in options"
      }
    ]
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
      temperature: 0.7,
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
        const fallbackQuestions = generateFallbackQuestions(courseContent, numQuestions - formattedQuestions.length);
        return [...formattedQuestions, ...fallbackQuestions];
      }
      
      return formattedQuestions;
    } catch (error) {
      console.log("Failed to parse AI response:", error instanceof Error ? error.message : String(error));
      // Return fallback questions
      return generateFallbackQuestions(courseContent, numQuestions);
    }
  } catch (error) {
    console.log("Error:", error instanceof Error ? error.message : String(error));
    // Return fallback questions
    return generateFallbackQuestions(courseContent, numQuestions);
  }
}

/**
 * Generate fallback questions when AI generation fails
 */
function generateFallbackQuestions(courseContent: CourseContent, count: number = 5): Question[] {
  console.log(`Generating ${count} fallback questions`);
  const questions: Question[] = [];
  
  // Add a general course question
  questions.push({
    id: uuidv4(),
    text: `What is the main topic of the ${courseContent.title} course?`,
    options: [
      `Understanding ${courseContent.title} fundamentals`,
      `Advanced ${courseContent.title} applications`,
      `${courseContent.title} history and development`,
      `${courseContent.title} troubleshooting`
    ],
    correctAnswer: `Understanding ${courseContent.title} fundamentals`,
    topic: 'General',
    difficulty: 'EASY',
    hasCodeExample: false
  });
  
  // Add lesson-specific questions
  let lessonIndex = 0;
  
  while (questions.length < count && lessonIndex < courseContent.lessons.length) {
    const lesson = courseContent.lessons[lessonIndex];
    
    questions.push({
      id: uuidv4(),
      text: `What is taught in the "${lesson.title}" lesson?`,
      options: [
        `The core concepts of ${lesson.title}`,
        `The history of ${lesson.title}`,
        `Advanced applications of ${lesson.title}`,
        `${lesson.title} in practice`
      ],
      correctAnswer: `The core concepts of ${lesson.title}`,
      topic: lesson.title,
      difficulty: 'EASY',
      hasCodeExample: false
    });
    
    lessonIndex++;
  }
  
  // If we still need more questions, add generic ones
  const genericQuestions = [
    {
      text: "Which learning approach is most effective for this course?",
      options: [
        "Practice and hands-on exercises",
        "Memorization of facts",
        "Skimming through material quickly",
        "Watching videos only"
      ],
      correctAnswer: "Practice and hands-on exercises"
    },
    {
      text: "What should you do if you get stuck on a concept?",
      options: [
        "Review the material and try again",
        "Skip it entirely",
        "Assume it's not important",
        "Change to a different course"
      ],
      correctAnswer: "Review the material and try again"
    },
    {
      text: "How can you apply knowledge from this course?",
      options: [
        "Through practical projects",
        "By teaching others",
        "In professional settings",
        "All of the above"
      ],
      correctAnswer: "All of the above"
    }
  ];
  
  // Add generic questions if needed
  let genericIndex = 0;
  while (questions.length < count && genericIndex < genericQuestions.length) {
    questions.push({
      id: uuidv4(),
      text: genericQuestions[genericIndex].text,
      options: genericQuestions[genericIndex].options,
      correctAnswer: genericQuestions[genericIndex].correctAnswer,
      topic: 'General',
      difficulty: 'EASY',
      hasCodeExample: false
    });
    
    genericIndex++;
  }
  
  // If we still don't have enough, duplicate with variations
  while (questions.length < count) {
    const originalQuestion = questions[0];
    
    questions.push({
      id: uuidv4(),
      text: `IMPORTANT: ${originalQuestion.text}`,
      options: originalQuestion.options,
      correctAnswer: originalQuestion.correctAnswer,
      topic: originalQuestion.topic,
      difficulty: originalQuestion.difficulty,
      hasCodeExample: originalQuestion.hasCodeExample
    });
  }
  
  console.log(`Generated ${questions.length} fallback questions`);
  return questions;
} 