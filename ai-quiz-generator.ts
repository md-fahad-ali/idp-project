import { v4 as uuidv4 } from 'uuid';
import { Groq } from 'groq-sdk';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

interface CourseContent {
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
  try {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.warn('No GROQ_API_KEY found, using fallback questions');
      return generateFallbackQuestions(courseContent);
    }
    
    const groq = new Groq({ apiKey });
    
    // Create a detailed prompt that includes actual course content
    const prompt = `Generate ${numQuestions} multiple-choice quiz questions about the "${courseContent.title}" course.
    
    Course Content:
    ${courseContent.lessons.map(lesson => `
    Topic: ${lesson.title}
    ${lesson.content ? `Content: ${lesson.content}` : ''}
    ${lesson.keyPoints ? `Key Points: ${lesson.keyPoints.join(', ')}` : ''}
    `).join('\n')}
    
    Requirements for each question:
    1. Questions must be directly related to the course content provided above
    2. Create challenging but fair questions that test understanding
    3. Provide exactly 4 options (A, B, C, D)
    4. Ensure one clear correct answer
    5. Make distractors plausible but clearly incorrect
    
    Format the response as a JSON array with this structure:
    [
      {
        "text": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option that is correct",
        "topic": "Related lesson title"
      }
    ]`;
    
    const response = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator who generates precise, content-focused quiz questions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });
    
    const content = response.choices[0].message.content || '';
    let questions;
    
    try {
      questions = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }
    
    return questions.map((q: any) => ({
      id: uuidv4(),
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer
    }));
  } catch (error) {
    console.error('Error generating AI questions:', error);
    return generateFallbackQuestions(courseContent);
  }
}

/**
 * Generate fallback questions if AI service fails
 */
function generateFallbackQuestions(courseContent: CourseContent): Question[] {
  const questions: Question[] = [];
  
  // Generate a question about the overall course
  questions.push({
    id: uuidv4(),
    text: `What is the main focus of the ${courseContent.title} course?`,
    options: [
      `Understanding core concepts of ${courseContent.title}`,
      `Historical development of ${courseContent.title}`,
      `Advanced applications of ${courseContent.title}`,
      `Comparing ${courseContent.title} with alternatives`
    ],
    correctAnswer: `Understanding core concepts of ${courseContent.title}`
  });
  
  // Generate questions from lesson content
  courseContent.lessons.forEach(lesson => {
    if (questions.length < 5) {
      const question: Question = {
        id: uuidv4(),
        text: `Regarding ${lesson.title}, which statement is most accurate?`,
        options: [
          lesson.keyPoints?.[0] || `${lesson.title} is a fundamental concept`,
          `${lesson.title} is an optional topic`,
          `${lesson.title} is only used in specific cases`,
          `${lesson.title} is not part of the core curriculum`
        ],
        correctAnswer: lesson.keyPoints?.[0] || `${lesson.title} is a fundamental concept`
      };
      questions.push(question);
    }
  });
  
  return questions;
} 