"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuestionsForCourse = generateQuestionsForCourse;
const uuid_1 = require("uuid");
const groq_sdk_1 = require("groq-sdk");
/**
 * Generates quiz questions using Groq AI based on course content
 */
async function generateQuestionsForCourse(courseContent, numQuestions = 5) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.warn('No GROQ_API_KEY found, using fallback questions');
            return generateFallbackQuestions(courseContent);
        }
        // Check if we have actual content to work with
        const hasContent = courseContent.lessons.some(lesson => lesson.content && lesson.content.trim().length > 0);
        if (!hasContent) {
            console.warn('No substantial course content found for AI question generation');
            return generateFallbackQuestions(courseContent);
        }
        const groq = new groq_sdk_1.Groq({ apiKey });
        // Create a more detailed and structured prompt that emphasizes using content directly
        const prompt = `Generate ${numQuestions} multiple-choice quiz questions that are STRICTLY based on the specific content provided below for the "${courseContent.title}" course.

Course Content:
${courseContent.lessons.map(lesson => `
TOPIC: ${lesson.title}
${lesson.content ? `CONTENT: ${lesson.content}` : ''}
${lesson.keyPoints ? `KEY POINTS: ${lesson.keyPoints.join(', ')}` : ''}
`).join('\n')}

STRICT REQUIREMENTS:
1. Questions MUST be directly extracted from the course content text provided above
2. Do NOT generate questions about topics not explicitly covered in the content
3. Use actual terminology, concepts, and examples mentioned in the content
4. Provide exactly 4 options (A, B, C, D) for each question
5. Ensure one clear correct answer that appears in the content
6. Make incorrect options plausible but clearly wrong based on the content
7. For each question, include a content_reference field with the exact text from the course that answers the question

Format the response as a JSON array with this structure:
[
  {
    "text": "Question text that directly references the content?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option that is correct",
    "topic": "Related lesson title",
    "content_reference": "The exact text from the course content that answers this question"
  }
]`;
        const response = await groq.chat.completions.create({
            model: "llama3-8b-8192",
            messages: [
                {
                    role: "system",
                    content: "You are an expert educational quiz creator who ONLY creates questions directly from provided content. Never invent information not present in the content. Always refer to specific parts of the provided text."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.5, // Lower temperature for more precise adherence to content
            max_tokens: 1500
        });
        const content = response.choices[0].message.content || '';
        let questions;
        try {
            questions = JSON.parse(content);
        }
        catch (e) {
            const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
            if (jsonMatch) {
                questions = JSON.parse(jsonMatch[0]);
            }
            else {
                throw new Error('Failed to parse AI response as JSON');
            }
        }
        return questions.map((q) => ({
            id: (0, uuid_1.v4)(),
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            topic: q.topic || ''
        }));
    }
    catch (error) {
        console.error('Error generating AI questions:', error);
        return generateFallbackQuestions(courseContent);
    }
}
/**
 * Generate fallback questions if AI service fails
 */
function generateFallbackQuestions(courseContent) {
    const questions = [];
    // Generate a question about the overall course
    questions.push({
        id: (0, uuid_1.v4)(),
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
            const question = {
                id: (0, uuid_1.v4)(),
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
