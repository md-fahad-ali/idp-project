import * as express from 'express';
import { Request, Response } from 'express';
import { createServer } from 'http';
import * as next from 'next';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import LoginRoute from './routes/LoginRoute';
import signupRoute from './routes/signupRoute';
import logoutRoute from './routes/logoutRoute';
import protectedRoute from './routes/protectedRoute';
import refreshRoute from './routes/refreshRoute';
import meRoute from './routes/meRoute';
import courseRoute from './routes/courseRoute';
import publicCourseRoute from './routes/publicCourseRoute';
import leaderboardRoute from './routes/leaderboardRoute';
import testRoute from './routes/testRoute';
import userRoute from './routes/userRoute';
import ffRoute from './routes/ffRoute';
import activityRoute from './routes/activityRoute';
import challengeRoute from './routes/challengeRoute';
import connectDB from './routes/db'; // Import the db module
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import passport from './lib/authMiddleware'; // Import the configured passport instance
import User from './models/User';
import TestResult from './models/TestResult';
import Course from './models/Course';
import UserActivity from './models/UserActivity';
import { generateQuestionsForCourse } from './ai-quiz-generator.simple';


const dev = process.env.NODE_ENV !== 'production';
const nextApp = next.default({ dev });
const handle = nextApp.getRequestHandler();

// User Answer interface
interface UserAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  timeSpent: number;
  pointsEarned?: number;
  answerLetter?: string;
}

// Challenge rooms storage
interface ChallengeRoom {
  roomId: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  courseId: string;
  courseName: string;
  questions: any[];
  currentQuestionIndex: number;
  userScores: {
    [userId: string]: {
      score: number;
      timeSpent: number;
      answers: UserAnswer[]; // Now uses the proper interface
    };
  };
  status: 'pending' | 'active' | 'completed' | 'pending_cleanup';
  createdAt: number;
  isRecovered?: boolean;
  disconnectedUser?: string;
  disconnectTime?: number;
  cleanupTime?: number;
}

// Define interface for CourseContent
interface CourseContent {
  title: string;
  lessons: {
    title: string;
    content?: string;
    keyPoints?: string[];
  }[];
}

const challengeRooms: { [roomId: string]: ChallengeRoom } = {};

// Socket user mapping
const userSocketMap: { [userId: string]: string } = {};
const socketUserMap: { [socketId: string]: string } = {};

nextApp
  .prepare()
  .then(async () => {
    const server = express.default();

    // Debug middleware to log all requests (moved to top)
    // server.use((req, res, next) => {
    //   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    //   if (req.method === 'POST') {
    //     console.log('Request headers:', req.headers);
    //     console.log('Request body:', req.body);
    //   }
    //   next();
    // });

    // Middleware
    server.use(express.json());  // Use express.json() instead of bodyParser
    server.use(cookieParser.default());

    // CORS configuration with support for Render domains
    const corsOrigins = ['http://localhost:3000'];
    
    // In production, add Render domain
    if (process.env.NODE_ENV === 'production') {
      // Support any Render domain including custom domains
      corsOrigins.push(process.env.RENDER_EXTERNAL_URL || '');
      
      // Add support for custom domains if configured
      if (process.env.CUSTOM_DOMAIN) {
        corsOrigins.push(`https://${process.env.CUSTOM_DOMAIN}`);
      }
    }
    
    server.use(
      cors.default({
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Authorization'],
      })
    );

    // Initialize Passport
    server.use(passport.initialize());

    // Health check endpoint for Render
    server.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok', message: 'Server is running' });
    });

    // Check database connection
    try {
      await connectDB();
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      // For development, we'll continue even if database connection fails
      if (process.env.NODE_ENV === 'production') {
        console.error("Database connection is required in production. Exiting.");
        process.exit(1);
      } else {
        console.warn("Continuing without database connection for development purposes.");
      }
    }

    // API Routes with error handling
    server.use("/api/auth/signup", signupRoute);
    server.use("/api/auth/login", LoginRoute);
    server.use("/api/auth/logout", logoutRoute);
    server.use("/api/auth/refresh", refreshRoute);
    server.use("/api/protected", protectedRoute);
    server.use("/api/auth/me", meRoute);
    server.use("/api/course", courseRoute);
    server.use("/api/public/courses", publicCourseRoute);
    server.use("/api/leaderboard", leaderboardRoute);
    server.use("/api/test", testRoute);
    server.use("/api/user", userRoute);
    server.use("/api/find_friends", ffRoute);
    server.use("/api/activity", activityRoute);
    server.use("/api/challenge", challengeRoute);


    // Handle all other routes with Next.js
    server.all("*", (req: Request, res: Response) => {
      // console.log('Fallback route hit:', req.url);
      return handle(req, res);
    });

    const httpServer = createServer(server);
    
    // Set up Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true,
      },
    });
    
    // Helper function to check if a user is in any active room
    const isUserInActiveRoom = (userId: string): boolean => {
      return Object.values(challengeRooms).some(room => 
        (room.challengerId === userId || room.challengedId === userId) && 
        (room.status === 'pending' || room.status === 'active')
      );
    };
    
    // Socket.io middleware to handle connections
    io.on('connection', async (socket) => {
      console.log('New socket connection:', socket.id);
      
      // Add debug logging for all events
      const originalOn = socket.on;
      socket.on = function(event: string, callback: Function) {
        console.log(`[DEBUG] Registering handler for event: ${event}`);
        return originalOn.call(this, event, (...args: any[]) => {
          // console.log(`[DEBUG] Event received: ${event}`, args);
          return callback.apply(this, args);
        });
      };
      
      // Add a ping test handler to debug socket issues
      socket.on('ping_test', (data) => {
        console.log('🔍 PING TEST RECEIVED:', data);
        // Send a pong response back to confirm bidirectional communication
        socket.emit('pong_response', { 
          received: true, 
          timestamp: Date.now(),
          originalMessage: data
        });
      });
      
      // Add new socket event for checking room status
      socket.on('check_room_status', (userId: string) => {
        if (!userId) {
          console.log('Received check_room_status with no userId');
          socket.emit('room_status_response', { isInRoom: false });
          return;
        }
        
        try {
          // console.log(`Checking room status for user ${userId}`);
          const isInRoom = isUserInActiveRoom(userId);
          // console.log(`User ${userId} is${isInRoom ? '' : ' not'} in an active room`);
          socket.emit('room_status_response', { isInRoom });
        } catch (error) {
          console.error('Error checking room status:', error);
          // Always respond even on error
          socket.emit('room_status_response', { isInRoom: false });
        }
      });
      
      // User identifies themselves (usually after login)
      socket.on('identify', async ({ userId }) => {
        if (!userId) return;
        
        console.log(`User ${userId} identified on socket ${socket.id}`);
        
        // Update user-socket mapping
        userSocketMap[userId] = socket.id;
        socketUserMap[socket.id] = userId;

        // Check if user is in any room and send room data
        const userRoom = Object.values(challengeRooms).find(room => 
          (room.challengerId === userId || room.challengedId === userId) &&
          (room.status === 'pending' || room.status === 'active')
        );

        if (userRoom) {
          const roomData = {
            challenger: {
              id: userRoom.challengerId,
              name: userRoom.challengerName,
              avatarUrl: undefined
            },
            challenged: {
              id: userRoom.challengedId,
              name: userRoom.challengedName,
              avatarUrl: undefined
            }
          };
          socket.emit('room_data', roomData);
        }
        
        // Update user activity status
        try {
          const currentTime = new Date();
          
          // Update UserActivity model
          await UserActivity.findOneAndUpdate(
            { userId },
            { 
              userId,
              isActive: true,
              lastActive: currentTime
            },
            { upsert: true }
          );
          
          // Also update User's lastActive field
          await User.findByIdAndUpdate(
            userId,
            { lastActive: currentTime },
            { new: true }
          );
        } catch (error) {
          console.error('Error updating user activity:', error);
        }
      });
      
      // Create challenge room
      socket.on('create_challenge', async (data) => {
        try {
          const { challengerId, challengedId, courseId } = data;
          
          // Find relevant data
          const [challenger, challenged, course] = await Promise.all([
            User.findById(challengerId),
            User.findById(challengedId),
            Course.findById(courseId).populate('lessons')
          ]);
          
          if (!challenger || !challenged || !course) {
            console.warn('Creating challenge with missing data', { challenger, challenged, course });
            
            // For development, create mock data if needed
            const mockChallenger = challenger || { 
              _id: challengerId,
              firstName: 'Challenger',
              lastName: 'User'
            };
            
            const mockChallenged = challenged || {
              _id: challengedId,
              firstName: 'Challenged',
              lastName: 'User'
            };
            
            const mockCourse = course || {
              _id: courseId,
              title: 'Mock Course',
              lessons: [
                { title: 'Introduction', content: 'This is an introduction to the course.', keyPoints: ['Learn basics'] },
                { title: 'Basic Concepts', content: 'These are the basic concepts of the course.', keyPoints: ['Understand fundamentals'] },
                { title: 'Advanced Topics', content: 'These are advanced topics for the course.', keyPoints: ['Master advanced techniques'] }
              ]
            };
            
            // Generate questions using lesson content from mock course
            const mockCourseContent = {
              title: mockCourse.title,
              lessons: mockCourse.lessons.map((lesson: any) => ({
                title: lesson.title,
                content: lesson.content || '',
                keyPoints: lesson.keyPoints || []
              }))
            };
            const generatedQuestions = await generateQuestionsForCourse(mockCourseContent);
            
            if (generatedQuestions.length === 0) {
              socket.emit('challenge_room_error', 'Failed to generate questions');
              return;
            }
            
            // Create room with unique ID
            const roomId = uuidv4();
            
            // Create challenge room
            challengeRooms[roomId] = {
              roomId,
              challengerId: mockChallenger._id.toString(),
              challengerName: `${mockChallenger.firstName} ${mockChallenger.lastName}`,
              challengedId: mockChallenged._id.toString(),
              challengedName: `${mockChallenged.firstName} ${mockChallenged.lastName}`,
              courseId: mockCourse._id.toString(),
              courseName: mockCourse.title,
              questions: generatedQuestions,
              currentQuestionIndex: 0,
              userScores: {
                [challengerId]: { score: 0, timeSpent: 0, answers: [] },
                [challengedId]: { score: 0, timeSpent: 0, answers: [] }
              },
              status: 'pending',
              createdAt: Date.now()
            };
            
            console.log(`Challenge room ${roomId} created with mock data`);
            
            // Notify the challenged user
            const challengedSocketId = userSocketMap[challengedId];
            if (challengedSocketId) {
              io.to(challengedSocketId).emit('challenge_received', {
                challengeId: roomId,
                challengerId: mockChallenger._id.toString(),
                challengerName: `${mockChallenger.firstName} ${mockChallenger.lastName}`,
                challengedId: mockChallenged._id.toString(),
                challengedName: `${mockChallenged.firstName} ${mockChallenged.lastName}`,
                courseId: mockCourse._id.toString(),
                courseName: mockCourse.title,
                timestamp: Date.now()
              });
            }
            
            socket.emit('room_created', { roomId });
            return;
          }
          
          // For real courses, defer question generation until accept_challenge
          // Create room with unique ID
          const roomId = uuidv4();
          
          // Create challenge room (without questions for now)
          challengeRooms[roomId] = {
            roomId,
            challengerId: challenger._id.toString(),
            challengerName: `${challenger.firstName} ${challenger.lastName}`,
            challengedId: challenged._id.toString(),
            challengedName: `${challenged.firstName} ${challenged.lastName}`,
            courseId: String(course._id),
            courseName: course.title,
            questions: [],  // We'll generate these when the challenge is accepted
            currentQuestionIndex: 0,
            userScores: {
              [challengerId]: { score: 0, timeSpent: 0, answers: [] },
              [challengedId]: { score: 0, timeSpent: 0, answers: [] }
            },
            status: 'pending',
            createdAt: Date.now()
          };
          
          console.log(`Challenge room ${roomId} created (questions will be generated on accept)`);
          
          // Notify the challenged user
          const challengedSocketId = userSocketMap[challengedId];
          if (challengedSocketId) {
            io.to(challengedSocketId).emit('challenge_received', {
              challengeId: roomId,
              challengerId: challenger._id.toString(),
              challengerName: `${challenger.firstName} ${challenger.lastName}`,
              challengedId: challenged._id.toString(),
              challengedName: `${challenged.firstName} ${challenged.lastName}`,
              courseId: String(course._id),
              courseName: course.title,
              timestamp: Date.now()
            });
          }
          
          socket.emit('room_created', { roomId });
        } catch (error) {
          console.error('Error in create_challenge handler:', error);
          socket.emit('challenge_room_error', 'Server error');
        }
      });

      // Add handler for challenge_request event
      socket.on('challenge_request', (data) => {
        console.log('challenge_request event received:', data);
        try {
          const { challengerId, challengerName, challengedId, challengedName, courseId, courseName, roomId } = data;
          
          // Make sure we have the minimum required data
          if (!challengerId || !challengedId || !roomId) {
            console.error('Missing required data for challenge_request');
            return;
          }
          
          // Find the socket for the challenged user
          const challengedSocketId = userSocketMap[challengedId];
          if (challengedSocketId) {
            // Forward the challenge notification to the challenged user
            console.log(`Forwarding challenge request to user ${challengedId}`);
            io.to(challengedSocketId).emit('challenge_received', {
              challengeId: roomId,
              challengerId,
              challengerName,
              challengedId,
              challengedName,
              courseId,
              courseName,
              timestamp: Date.now()
            });
          } else {
            console.warn(`No socket found for challenged user ${challengedId}`);
            socket.emit('challenge_room_error', 'Challenged user is not online');
          }
        } catch (error) {
          console.error('Error in challenge_request handler:', error);
        }
      });
      
      // Add handler for create_challenge_room that maps to create_challenge
      socket.on('create_challenge_room', async (data) => {
        console.log('create_challenge_room event received, redirecting to create_challenge handler:', data);
        try {
          // Instead of emitting an event, we need to duplicate the create_challenge logic
          const { challengerId, challengedId, courseId } = data;
          
          // Check if a pending challenge with the same challengerId and challengedId already exists
          const existingChallenge = Object.values(challengeRooms).find(room => 
            room.challengerId === challengerId && 
            room.challengedId === challengedId && 
            room.status === 'pending'
          );
          
          if (existingChallenge) {
            console.log(`Duplicate challenge detected: User ${challengerId} already has a pending challenge with ${challengedId}`, existingChallenge);
            socket.emit('duplicate_challenge', { 
              message: 'You already have a pending challenge with this user', 
              existingChallengeId: existingChallenge.roomId 
            });
            return;
          }
          
          // Find relevant data
          const [challenger, challenged, course] = await Promise.all([
            User.findById(challengerId),
            User.findById(challengedId),
            Course.findById(courseId).populate('lessons')
          ]);
          
          if (!challenger || !challenged || !course) {
            console.warn('Creating challenge with missing data', { challenger, challenged, course });
            
            // For development, create mock data if needed
            const mockChallenger = challenger || { 
              _id: challengerId,
              firstName: 'Challenger',
              lastName: 'User'
            };
            
            const mockChallenged = challenged || {
              _id: challengedId,
              firstName: 'Challenged',
              lastName: 'User'
            };
            
            const mockCourse = course || {
              _id: courseId,
              title: 'Mock Course',
              lessons: [
                { title: 'Introduction', content: 'This is an introduction to the course.', keyPoints: ['Learn basics'] },
                { title: 'Basic Concepts', content: 'These are the basic concepts of the course.', keyPoints: ['Understand fundamentals'] },
                { title: 'Advanced Topics', content: 'These are advanced topics for the course.', keyPoints: ['Master advanced techniques'] }
              ]
            };
            
            // Generate questions using lesson content from mock course
            const mockCourseContent = {
              title: mockCourse.title,
              lessons: mockCourse.lessons.map((lesson: any) => ({
                title: lesson.title,
                content: lesson.content || '',
                keyPoints: lesson.keyPoints || []
              }))
            };
            const generatedQuestions = await generateQuestionsForCourse(mockCourseContent);
            
            if (generatedQuestions.length === 0) {
              socket.emit('challenge_room_error', 'Failed to generate questions');
              return;
            }
            
            // Create room with unique ID
            const roomId = uuidv4();
            
            // Create challenge room
            challengeRooms[roomId] = {
              roomId,
              challengerId: mockChallenger._id.toString(),
              challengerName: `${mockChallenger.firstName} ${mockChallenger.lastName}`,
              challengedId: mockChallenged._id.toString(),
              challengedName: `${mockChallenged.firstName} ${mockChallenged.lastName}`,
              courseId: mockCourse._id.toString(),
              courseName: mockCourse.title,
              questions: generatedQuestions,
              currentQuestionIndex: 0,
              userScores: {
                [challengerId]: { score: 0, timeSpent: 0, answers: [] },
                [challengedId]: { score: 0, timeSpent: 0, answers: [] }
              },
              status: 'pending',
              createdAt: Date.now()
            };
            
            console.log(`Challenge room ${roomId} created with mock data`);
            
            // Notify the challenged user
            const challengedSocketId = userSocketMap[challengedId];
            if (challengedSocketId) {
              io.to(challengedSocketId).emit('challenge_received', {
                challengeId: roomId,
                challengerId: mockChallenger._id.toString(),
                challengerName: `${mockChallenger.firstName} ${mockChallenger.lastName}`,
                challengedId: mockChallenged._id.toString(),
                challengedName: `${mockChallenged.firstName} ${mockChallenged.lastName}`,
                courseId: mockCourse._id.toString(),
                courseName: mockCourse.title,
                timestamp: Date.now()
              });
            }
            
            socket.emit('room_created', { roomId });
            return;
          }
          
          // For real courses, defer question generation until accept_challenge
          // Create room with unique ID
          const roomId = uuidv4();
          
          // Create challenge room (without questions for now)
          challengeRooms[roomId] = {
            roomId,
            challengerId: challenger._id.toString(),
            challengerName: `${challenger.firstName} ${challenger.lastName}`,
            challengedId: challenged._id.toString(),
            challengedName: `${challenged.firstName} ${challenged.lastName}`,
            courseId: String(course._id),
            courseName: course.title,
            questions: [],  // We'll generate these when the challenge is accepted
            currentQuestionIndex: 0,
            userScores: {
              [challengerId]: { score: 0, timeSpent: 0, answers: [] },
              [challengedId]: { score: 0, timeSpent: 0, answers: [] }
            },
            status: 'pending',
            createdAt: Date.now()
          };
          
          console.log(`Challenge room ${roomId} created (questions will be generated on accept)`);
          
          // Notify the challenged user
          const challengedSocketId = userSocketMap[challengedId];
          if (challengedSocketId) {
            io.to(challengedSocketId).emit('challenge_received', {
              challengeId: roomId,
              challengerId: challenger._id.toString(),
              challengerName: `${challenger.firstName} ${challenger.lastName}`,
              challengedId: challenged._id.toString(),
              challengedName: `${challenged.firstName} ${challenged.lastName}`,
              courseId: String(course._id),
              courseName: course.title,
              timestamp: Date.now()
            });
          }
          
          socket.emit('room_created', { roomId });
        } catch (error) {
          console.error('Error in create_challenge_room handler:', error);
          socket.emit('challenge_room_error', 'Server error');
        }
      });
      
      // Accept challenge
      socket.on('accept_challenge', ({ challengeId, userId }) => {
        const room = challengeRooms[challengeId];
        
        if (!room) {
          socket.emit('challenge_error', 'Challenge room not found');
          return;
        }
        
        if (room.challengedId !== userId) {
          socket.emit('challenge_error', 'Not authorized to accept this challenge');
          return;
        }
        
        console.log(`User ${userId} accepted challenge ${challengeId}`);
        
        // Handle room joining logic for the challenged user (current socket)
        socket.join(challengeId);
        console.log(`Challenged user ${userId} joined socket room ${challengeId}`);
        
        // Handle room joining for the challenger
        const challengerSocketId = userSocketMap[room.challengerId];
        if (challengerSocketId) {
          console.log(`Attempting to add challenger ${room.challengerId} (socket ${challengerSocketId}) to room ${challengeId}`);
          
          // Notify challenger that challenge was accepted
          io.to(challengerSocketId).emit('challenge_accepted', { roomId: challengeId });
          
          // Get challenger's socket and join them to the room
          const challengerSocket = io.sockets.sockets.get(challengerSocketId);
          if (challengerSocket) {
            challengerSocket.join(challengeId);
            console.log(`Challenger ${room.challengerId} joined socket room ${challengeId}`);
          } else {
            console.warn(`Could not find socket for challenger ${room.challengerId}`);
          }
        } else {
          console.warn(`No socket found for challenger ${room.challengerId}`);
        }
        
        // Update the room status to active
        room.status = 'active';
        
        // IMPORTANT: Immediately start the challenge with a "preparing questions" state
        // This allows users to enter the room immediately
        io.to(challengeId).emit('challenge_started', {
          roomId: challengeId,
          challengerId: room.challengerId,
          challengerName: room.challengerName,
          challengedId: room.challengedId,
          challengedName: room.challengedName,
          courseId: room.courseId,
          courseName: room.courseName,
          preparingQuestions: true // Signal that questions are being prepared
        });
        
        // If we don't have questions yet, generate them in the background
        if (!room.questions || room.questions.length === 0) {
          console.log('No questions found, generating from course content in background...');
          
          // Emit a waiting message to the room
          io.to(challengeId).emit('system_message', { 
            type: 'preparing_questions',
            message: 'Preparing questions...'
          });
          
          // Fetch the latest course data in the background
          Course.findById(room.courseId)
            .then(async (course) => {
              if (!course) {
                console.error('Course not found for question generation');
                io.to(challengeId).emit('challenge_error', 'Failed to load course content for questions');
                return;
              }
              
              // Prepare comprehensive course content with all lesson data
              const courseContent = {
                title: course.title,
                lessons: course.lessons.map((lesson) => ({
                  title: lesson.title,
                  content: lesson.content || '',
                  keyPoints: Array.isArray(lesson.points) ? lesson.points.map(String) : []
                }))
              };
              
              try {
                // Generate questions from the actual course content
                const generatedQuestions = await generateQuestionsForCourse(courseContent as CourseContent);
                
                if (generatedQuestions.length === 0) {
                  io.to(challengeId).emit('challenge_error', 'Failed to generate questions from course content');
                  return;
                }
                
                // Log the generated questions for debugging
                console.log('Successfully generated AI questions:');
                generatedQuestions.forEach((q, i) => {
                  console.log(`Question ${i+1}: ${q.difficulty || 'UNKNOWN'} - Topic: ${q.topic || 'General'} - Has code: ${q.hasCodeExample || false}`);
                  // Log a preview of each question
                  console.log(`  Text: ${q.text.substring(0, 100)}${q.text.length > 100 ? '...' : ''}`);
                });
                
                // Update the room with the generated questions
                room.questions = generatedQuestions.map(q => ({
                  ...q
                  // Keep the original ID from the generator and don't override with a new UUID
                  // The generator already assigns proper UUIDs
                }));
                
                console.log(`Generated ${room.questions.length} questions from course content`);
                
                // Now that questions are ready, send the first question to start the actual quiz
                sendNextQuestion(challengeId);
              } catch (error) {
                console.error('Error generating questions:', error);
                io.to(challengeId).emit('challenge_error', 'Failed to generate questions');
              }
            })
            .catch(error => {
              console.error('Error loading course for question generation:', error);
              io.to(challengeId).emit('challenge_error', 'Failed to prepare questions');
            });
        } else {
          // Start the challenge with existing questions
          sendNextQuestion(challengeId);
        }
      });
      
      // Decline challenge
      socket.on('decline_challenge', ({ challengeId, userId }) => {
        const room = challengeRooms[challengeId];
        
        if (!room) return;
        
        // Get decliner's name
        const isChallenger = room.challengerId === userId;
        const declinerId = userId;
        const declinerName = isChallenger ? room.challengerName : room.challengedName;
        
        // Notify the other user that the challenge was declined
        const notifyUserId = isChallenger ? room.challengedId : room.challengerId;
        const notifySocketId = userSocketMap[notifyUserId];
        
        if (notifySocketId) {
          io.to(notifySocketId).emit('challenge_declined', { 
            challengeId,
            declinerId,
            declinerName
          });
        }
        
        // Also notify the decliner for UI update
        io.to(socket.id).emit('challenge_declined', {
          challengeId,
          declinerId,
          declinerName
        });
        
        console.log(`Challenge ${challengeId} declined by ${declinerName}. Room deleted.`);
        
        // Delete the room
        delete challengeRooms[challengeId];
      });
      
      // Handle socket.io submit_answer event
      socket.on('submit_answer', ({ roomId, userId, questionId, answer, timeSpent, answerLetter }) => {
        try {
          const room = challengeRooms[roomId];
          if (!room) {
            socket.emit('answer_error', 'Room not found');
            return;
          }
          
          const currentQuestion = room.questions[room.currentQuestionIndex];
          if (currentQuestion.id !== questionId) {
            socket.emit('answer_error', 'Invalid question ID');
            return;
          }
          
          // Record the answer
          if (!room.userScores[userId].answers) {
            room.userScores[userId].answers = [];
          }
          
          // Check if the answer is correct - compare both formats
          // First, check if answer text matches exactly
          let isCorrect = currentQuestion.correctAnswer === answer;
          
          // If not, check if the answer letter (A, B, C, D) matches
          if (!isCorrect && answerLetter) {
            isCorrect = currentQuestion.correctAnswer === answerLetter;
          }
          
          // Also check if the answer text contains the correct answer (for flexibility)
          if (!isCorrect && typeof currentQuestion.correctAnswer === 'string') {
            const correctAnswerText = currentQuestion.options.find(
              (option: string, index: number) => String.fromCharCode(65 + index) === currentQuestion.correctAnswer
            );
            
            if (correctAnswerText && answer === correctAnswerText) {
              isCorrect = true;
            }
          }
          
          console.log(`[DEBUG] Answer submission: userId=${userId}, answer=${answer}, answerLetter=${answerLetter}, correctAnswer=${currentQuestion.correctAnswer}, isCorrect=${isCorrect}`);
          
          // Award points: 10 for correct answer, 0 for incorrect
          // Can adjust scoring algorithm as needed
          const pointsEarned = isCorrect ? 10 : 0;
          
          // Record the answer details
          room.userScores[userId].answers.push({
            questionId,
            answer,
            correct: isCorrect,
            timeSpent,
            pointsEarned,
            answerLetter
          } as UserAnswer); // Type assertion to bypass type check
          
          // Update total score and time spent
          room.userScores[userId].score += pointsEarned;
          room.userScores[userId].timeSpent += timeSpent;
          
          // Get user name based on userId
          const userName = userId === room.challengerId ? room.challengerName : room.challengedName;
          
          // Broadcast answer to all users in the room
          io.to(roomId).emit('user_answer', {
            userId,
            userName,
            answer,
            isCorrect
          });
          
          // Broadcast score update to all users in the room
          io.to(roomId).emit('score_broadcast', {
            roomId, 
            userId, 
            userName,
            score: room.userScores[userId].score,
            isCorrect,
            correctAnswer: isCorrect ? null : currentQuestion.correctAnswer
          });
          
          // Check if both users have answered
          const allUsersAnswered = [room.challengerId, room.challengedId].every(uid => {
            return room.userScores[uid]?.answers && 
                   room.userScores[uid].answers.some(a => a.questionId === questionId);
          });
          
          if (allUsersAnswered) {
            // Get all user answers for this question
            const userAnswers = [room.challengerId, room.challengedId].map(uid => {
              const answer = room.userScores[uid].answers.find(a => a.questionId === questionId);
              return {
                userId: uid,
                userName: uid === room.challengerId ? room.challengerName : room.challengedName,
                answer: answer?.answer === 'timeout' ? 'Time Out' : answer?.answer || 'No answer',
                isCorrect: answer?.correct
              };
            });
            
            // Include current scores in the both_answered event
            const scores = {
              [room.challengerId]: room.userScores[room.challengerId].score,
              [room.challengedId]: room.userScores[room.challengedId].score
            };
            
            // Notify both users that both have answered with all answers
            io.to(roomId).emit('both_answered', { 
              scores, 
              correctAnswer: currentQuestion.correctAnswer,
              userAnswers 
            });
            
            // Move to the next question or end the challenge
            room.currentQuestionIndex++;
            
            if (room.currentQuestionIndex < room.questions.length) {
              // Send the next question after a longer delay (5 seconds) to give users time to see answers
              setTimeout(() => sendNextQuestion(roomId), 5000);
            } else {
              // Challenge is complete, calculate final results
              endChallenge(roomId);
            }
          }
        } catch (error) {
          console.error('Error submitting answer:', error);
          socket.emit('answer_error', 'Server error');
        }
      });
      
      // Handle broadcast_score event for real-time score updates
      socket.on('broadcast_score', ({ roomId, userId, userName, score, isCorrect, questionId }) => {
        try {
          console.log(`[DEBUG] Broadcasting score update: ${userName} scored ${score} points`);
          
          // Get the room to validate the request
          const room = challengeRooms[roomId];
          if (!room) {
            console.error(`[ERROR] Room ${roomId} not found for score broadcast`);
            return;
          }
          
          // Validate that the user belongs to this room
          if (room.challengerId !== userId && room.challengedId !== userId) {
            console.error(`[ERROR] User ${userId} not authorized for score broadcast in room ${roomId}`);
            return;
          }
          
          // Update the score in the room data - This is important for score accumulation
          if (room.userScores[userId]) {
            // Since the client is sending the total score, we'll use that value
            // This ensures scores are accumulated properly across questions
            room.userScores[userId].score = score;
          }
          
          // Broadcast the score to everyone in the room except the sender
          socket.to(roomId).emit('score_broadcast', {
            roomId,
            userId,
            userName,
            score,
            isCorrect,
            questionId
          });
          
          console.log(`[DEBUG] Score broadcast sent for ${userName} (${score} points)`);
        } catch (error) {
          console.error('Error broadcasting score:', error);
        }
      });
      
      // Handle leave room event - triggered when user manually leaves
      socket.on('leave_room', async ({ roomId, userId, isChallenger, customMessage }) => {
        try {
          console.log(`🔴 LEAVE_ROOM EVENT RECEIVED with data:`, {
            roomId, userId, isChallenger, customMessage
          });
          
          console.log(`🔴 Processed leave_room parameters:`, {
            roomId, userId, isChallenger, customMessage
          });
          
          // First, check if the user is actually in the specified room
          const room = challengeRooms[roomId];
          
          // If no room with ID exists, log it but don't take action
          if (!room) {
            console.log(`🔴 Found room for user: No room found with ID ${roomId}`);
            
            // Inform the client that the room doesn't exist anymore
            socket.emit('room_not_found', { 
              roomId, 
              message: 'The challenge room no longer exists.' 
            });
            
            return;
          }
          
          // Check if user actually belongs to this room
          const isUserInRoom = room.challengerId === userId || room.challengedId === userId;
          
          if (!isUserInRoom) {
            console.log(`🔴 User ${userId} is not in room ${roomId}`);
            socket.emit('leave_room_error', { 
              message: 'You are not a member of this room.'
            });
            return;
          }
          
          // Get the opponent's ID and socket
          const opponentId = room.challengerId === userId ? room.challengedId : room.challengerId;
          const opponentSocketId = userSocketMap[opponentId];
          
          // Get the user's name
          const userName = room.challengerId === userId ? room.challengerName : room.challengedName;
          
          console.log(`🔴 User ${userName} (${userId}) is leaving room ${roomId}`);
          
          // Make user leave the socket.io room
          socket.leave(roomId);
          
          // Notify everyone in the room (just the opponent now) that this user left
          io.to(roomId).emit('opponent_left', {
            roomId,
            userId,
            userName,
            customMessage: customMessage || `${userName} has left the challenge.`
          });
          
          // Also emit a leave_room event for backward compatibility
          io.to(roomId).emit('leave_room', {
            roomId,
            userId,
            userName
          });
          
          // Don't immediately delete the room - mark it for cleanup in 1 minute
          // This gives clients time to process the leave event
          room.status = 'pending_cleanup';
          room.cleanupTime = Date.now();
          
          console.log(`🔴 Room ${roomId} marked for cleanup in 1 minute`);
          
          // Schedule room cleanup
          setTimeout(() => {
            // Only delete the room if it's still marked for cleanup
            if (challengeRooms[roomId] && challengeRooms[roomId].status === 'pending_cleanup') {
              console.log(`🔴 Cleaning up room ${roomId} after leave`);
              delete challengeRooms[roomId];
            }
          }, 60000); // 1 minute delay
          
          // Acknowledge to the client that they've left
          socket.emit('leave_confirmed', { 
            roomId,
            success: true
          });
        } catch (error) {
          console.error('Error in leave_room handler:', error);
          socket.emit('leave_room_error', { message: 'Failed to leave room properly' });
        }
      });

      // Handle socket disconnection
      socket.on('disconnect', async () => {
        console.log('Socket disconnected:', socket.id);
        
        const userId = socketUserMap[socket.id];
        if (userId) {
          // Find any active room that this user is part of
          const userRoom = Object.values(challengeRooms).find(room => 
            (room.challengerId === userId || room.challengedId === userId) &&
            (room.status === 'active')
          );
          
          if (userRoom) {
            console.log(`User ${userId} disconnected while in active room ${userRoom.roomId}. NOT auto-leaving room - waiting for reconnect.`);
            
            // Don't auto-leave the room on disconnect - only mark the user as potentially disconnected
            // This allows time for reconnection
            
            // Mark the room as having a temporarily disconnected user
            userRoom.disconnectedUser = userId;
            userRoom.disconnectTime = Date.now();
            
            // Check back in 2 minutes to see if the user returned
            setTimeout(() => {
              // Only if the user is still marked as disconnected after 2 minutes
              if (userRoom.disconnectedUser === userId && 
                  userRoom.disconnectTime && 
                  (Date.now() - userRoom.disconnectTime > 120000)) {
                
                // Then consider them truly gone and handle as if they left
                console.log(`User ${userId} did not reconnect to room ${userRoom.roomId} within 2 minutes. Now handling as a leave.`);
                
                // Get user name and opponent ID
                const isChallenger = userRoom.challengerId === userId;
                const userName = isChallenger ? userRoom.challengerName : userRoom.challengedName;
                const opponentId = isChallenger ? userRoom.challengedId : userRoom.challengerId;
                const opponentSocketId = userSocketMap[opponentId];
                
                // Notify opponent if they're still connected
                if (opponentSocketId) {
                  io.to(opponentSocketId).emit('opponent_left', {
                    roomId: userRoom.roomId,
                    userId,
                    userName,
                    message: `${userName} disconnected and didn't return.`
                  });
                }
                
                // Only mark room as completed if 2 minutes passed with no reconnect
                userRoom.status = 'completed';
              }
            }, 120000); // 2 minutes
          }
          
          // Only remove the mapping on disconnect, don't mark user as inactive yet
          // Users might reconnect if it's a temporary disconnection
          delete userSocketMap[userId];
          delete socketUserMap[socket.id];
        }
      });

      // Handle socket reconnection
      socket.on('reconnect', async () => {
        console.log('Socket reconnected:', socket.id);
        const userId = socketUserMap[socket.id];
        if (userId) {
          try {
            // Update user activity status
                await UserActivity.findOneAndUpdate(
                  { userId },
              { 
                $set: { 
                  isActive: true,
                  lastActive: new Date()
                }
              },
              { upsert: true }
            );
            } catch (error) {
            console.error('Error updating user activity on reconnect:', error);
            }
        }
      });

      // Join a challenge room
      socket.on('join_challenge', ({ roomId, userId }) => {
        try {
          console.log(`User ${userId} requesting to join challenge room ${roomId}`);
          
          // Validate the room exists
          let room = challengeRooms[roomId];
          if (!room) {
            console.error(`Room ${roomId} not found - attempting to restore from storage`);
            
            // Get the existing room info from any client-side data
            const clientRoomInfo = {
              roomId: roomId,
              userId: userId,
              timestamp: Date.now()
            };
            
            // Create a placeholder room to allow joining
            challengeRooms[roomId] = {
              roomId,
              challengerId: userId, // We don't know if this is the challenger or challenged
              challengerName: 'Player 1',
              challengedId: 'unknown',
              challengedName: 'Player 2',
              courseId: 'javascript', // Default course
              courseName: 'JavaScript',
              questions: [],  // We'll generate these when the challenge is started
              currentQuestionIndex: 0,
              userScores: {
                [userId]: { score: 0, timeSpent: 0, answers: [] }
              },
              status: 'pending',
              createdAt: Date.now(),
              isRecovered: true // Mark this as a recovered room
            };
            
            room = challengeRooms[roomId];
            
            console.log(`Created recovery room ${roomId} for user ${userId}`);
            
            // Emit a message to the user
            socket.emit('system_message', { 
              type: 'room_recovery',
              message: 'Room was not found. A new session has been created.'
            });
          }
          
          // Join the socket.io room
          socket.join(roomId);
          console.log(`User ${userId} joined socket room ${roomId}`);
          
          // Send confirmation back to client
          socket.emit('join_challenge_confirm', { success: true });
          
          // If this is a recovered room, update user info
          if (room.isRecovered) {
            // If this is a second user joining, update the room data
            if (room.challengerId === userId) {
              // This is the same user who created the recovery room
            } else if (room.challengedId === 'unknown') {
              // This is a new user, update as challenged
              room.challengedId = userId;
              room.challengedName = 'Player 2';
              
              // Add the second user's score tracking
              room.userScores[userId] = { score: 0, timeSpent: 0, answers: [] };
            }
          }
          
          // Keep track of this user's connection in the room
          const userRole = userId === room.challengerId ? 'challenger' : 'challenged';
          
          // Send room data to the user who just joined
          socket.emit('room_data', {
            challenger: {
              id: room.challengerId,
              name: room.challengerName
            },
            challenged: {
              id: room.challengedId,
              name: room.challengedName
            }
          });
          
          console.log(`Sent room data to user ${userId}`);
        } catch (error) {
          console.error('Error joining challenge room:', error);
          socket.emit('join_challenge_confirm', { success: false, error: 'Server error' });
        }
      });

      // Add handler for starting a challenge
      socket.on('start_challenge', ({ roomId }) => {
        try {
          console.log(`Received start_challenge event for room ${roomId}`);
          
          // Validate the room exists
          const room = challengeRooms[roomId];
          if (!room) {
            console.error(`Room ${roomId} not found for start_challenge`);
            socket.emit('challenge_error', 'Room not found');
            return;
          }
          
          // Call the startChallenge function
          console.log(`Starting challenge for room ${roomId}`);
          startChallenge(roomId);
        } catch (error) {
          console.error('Error in start_challenge handler:', error);
          socket.emit('challenge_error', 'Failed to start challenge');
        }
      });

      // Handle request for challenge results
      socket.on('request_challenge_results', ({ roomId }) => {
        // Find the room data (active or completed)
        const room = challengeRooms[roomId];
        
        if (!room) {
          console.log(`No room data found for roomId: ${roomId}`);
          socket.emit('challenge_error', 'Room not found');
          return;
        }
        
        // If the room is still active, return current scores
        if (room.status === 'active') {
          const challengerScore = room.userScores[room.challengerId].score;
          const challengedScore = room.userScores[room.challengedId].score;
          
          let winnerId, winnerName;
          
          // Determine current leader
          if (challengerScore > challengedScore) {
            winnerId = room.challengerId;
            winnerName = room.challengerName;
          } else if (challengedScore > challengerScore) {
            winnerId = room.challengedId;
            winnerName = room.challengedName;
          } else {
            winnerId = 'tie';
            winnerName = 'Tie';
          }
          
          // Send current results
          socket.emit('challenge_results', {
            roomId,
            challengerId: room.challengerId,
            challengerName: room.challengerName,
            challengerScore,
            challengerTimeSpent: room.userScores[room.challengerId].timeSpent,
            challengedId: room.challengedId,
            challengedName: room.challengedName,
            challengedScore,
            challengedTimeSpent: room.userScores[room.challengedId].timeSpent,
            winnerId,
            winnerName
          });
        } else if (room.status === 'completed') {
          // Room is already completed, send final results
          const challengerScore = room.userScores[room.challengerId].score;
          const challengedScore = room.userScores[room.challengedId].score;
          
          let winnerId, winnerName;
          
          if (challengerScore > challengedScore) {
            winnerId = room.challengerId;
            winnerName = room.challengerName;
          } else if (challengedScore > challengerScore) {
            winnerId = room.challengedId;
            winnerName = room.challengedName;
          } else {
            // If tied on score, compare completion time
            const challengerTime = room.userScores[room.challengerId].timeSpent;
            const challengedTime = room.userScores[room.challengedId].timeSpent;
            
            if (challengerTime < challengedTime) {
              winnerId = room.challengerId;
              winnerName = room.challengerName;
            } else {
              winnerId = room.challengedId;
              winnerName = room.challengedName;
            }
          }
          
          socket.emit('challenge_results', {
            roomId,
            challengerId: room.challengerId,
            challengerName: room.challengerName,
            challengerScore,
            challengerTimeSpent: room.userScores[room.challengerId].timeSpent,
            challengedId: room.challengedId,
            challengedName: room.challengedName,
            challengedScore,
            challengedTimeSpent: room.userScores[room.challengedId].timeSpent,
            winnerId,
            winnerName
          });
        } else {
          socket.emit('challenge_error', 'Room status is invalid');
        }
      });
    });
    
    // Start a challenge: update status to active and send the first question
    const startChallenge = (roomId: string) => {
      const room = challengeRooms[roomId];
      if (!room) {
        console.error(`Room ${roomId} not found`);
        return;
      }
      
      console.log(`Starting challenge in room ${roomId}`);
      
      // Verify both players are actually in the socket room before starting
      const getSocketsInRoom = async () => {
        try {
          // Get all sockets in this room
          const sockets = await io.in(roomId).fetchSockets();
          console.log(`Found ${sockets.length} sockets in room ${roomId}`);
          
          // If we don't have exactly 2 users, wait and retry
          if (sockets.length < 2) {
            console.log(`Not enough players (${sockets.length}/2) in room, waiting for players to join...`);
            
            // Emit a waiting message to the room
            io.to(roomId).emit('system_message', { 
              type: 'waiting_for_players',
              message: 'Waiting for both players to join...'
            });
            
            // Wait 3 seconds and try again
            setTimeout(() => startChallenge(roomId), 3000);
            return;
          }
          
          // At this point, we have both players connected
          // Update room status and notify users
      room.status = 'active';
      
      // Notify both users that challenge has started
      io.to(roomId).emit('challenge_started', {
        roomId,
        challengerId: room.challengerId,
        challengerName: room.challengerName,
        challengedId: room.challengedId,
        challengedName: room.challengedName,
        courseId: room.courseId,
        courseName: room.courseName,
        questionNumber: 1,
        totalQuestions: room.questions.length
      });
      
          // Send first question only after confirming both players are connected
      sendNextQuestion(roomId);
        } catch (error) {
          console.error('Error checking room participants:', error);
          
          // Try again after delay
          setTimeout(() => startChallenge(roomId), 3000);
        }
      };
      
      // Start the process of checking for players
      getSocketsInRoom();
    };
    
    // Function to send the next question to all users in a room
    const sendNextQuestion = (roomId: string) => {
      try {
        const room = challengeRooms[roomId];
        if (!room) {
          console.error(`Room ${roomId} not found`);
          return;
        }
        
        // Check if questions are available
        if (!room.questions || room.questions.length === 0) {
          console.log(`No questions available for room ${roomId} yet. Will retry when questions are ready.`);
          
          // Notify users of the delay
          io.to(roomId).emit('system_message', { 
            type: 'preparing_questions',
            message: 'Still preparing your questions...'
          });
          
          // Try again in 2 seconds
          setTimeout(() => sendNextQuestion(roomId), 2000);
          return;
        }
        
        // Get the next question
        const nextQuestion = room.questions[room.currentQuestionIndex];
        
        // Validate question has all required fields
        if (!nextQuestion || !nextQuestion.text || !Array.isArray(nextQuestion.options) || !nextQuestion.correctAnswer) {
          console.error(`Invalid question at index ${room.currentQuestionIndex}:`, nextQuestion);
          
          // Handle the invalid question situation
          // If this is the first question, generate a simple fallback question
          const fallbackQuestion = {
            id: uuidv4(),
            text: `What is the main topic of the "${room.courseName}" course?`,
            options: [
              `Understanding ${room.courseName} fundamentals`,
              `Advanced ${room.courseName} applications`,
              `${room.courseName} history and development`,
              `${room.courseName} in practice`
            ],
            correctAnswer: `Understanding ${room.courseName} fundamentals`,
            topic: 'General'
          };
          
          // Replace the invalid question with fallback
          room.questions[room.currentQuestionIndex] = fallbackQuestion;
          
          // Use the fallback question
          console.log(`Using fallback question at index ${room.currentQuestionIndex}`);
        }
        
        // Get the question (either original or fallback)
        const questionToSend = room.questions[room.currentQuestionIndex];
        
        // Calculate the question number and total
        const questionNumber = room.currentQuestionIndex + 1;
        const totalQuestions = Math.min(room.questions.length, 5);
        
        // Log the question being sent with details
        console.log(`[DEBUG] Sending question ${questionNumber}/${totalQuestions} to room ${roomId}`);
        
        // Send the new question to all users in the room
        // Include total questions count and current question number
        const timeLimit = 15; // Reduced time limit to 15 seconds for better experience
        io.to(roomId).emit('new_question', {
          question: questionToSend,
          timeLimit,
          questionNumber,
          totalQuestions,
          courseName: room.courseName
        });
      
        // Set up timer synchronization
        let remainingTime = timeLimit;
        const timerInterval = setInterval(() => {
          remainingTime--;
          
          // Send time sync every second to ensure consistent countdown
          io.to(roomId).emit('time_sync', { 
            timeLeft: remainingTime,
            questionNumber,
            totalQuestions
          });
          
          // When time is up, check if all users answered
          if (remainingTime <= 0) {
            clearInterval(timerInterval);
            
            // Check if all users answered this question
            const allAnswered = [room.challengerId, room.challengedId].every(uid => {
              return room.userScores[uid]?.answers && 
                     room.userScores[uid].answers.some(a => a.questionId === questionToSend.id);
            });
            
            // If not all users answered, handle timeout
            if (!allAnswered) {
              // For each user that didn't answer, record a timeout answer
              [room.challengerId, room.challengedId].forEach(uid => {
                const hasAnswered = room.userScores[uid]?.answers && 
                                   room.userScores[uid].answers.some(a => a.questionId === questionToSend.id);
                
                if (!hasAnswered) {
                  // Record timeout answer
                  if (!room.userScores[uid].answers) {
                    room.userScores[uid].answers = [];
                  }
                  
                  room.userScores[uid].answers.push({
                    questionId: questionToSend.id,
                    answer: 'timeout',
                    correct: false,
                    timeSpent: timeLimit,
                    pointsEarned: 0,
                    answerLetter: ''
                  } as UserAnswer); // Type assertion to bypass type check
                  
                  // Emit user answer for timeout
                  io.to(roomId).emit('user_answer', {
                    userId: uid,
                    userName: uid === room.challengerId ? room.challengerName : room.challengedName,
                    answer: 'Time Out',
                    isCorrect: false
                  });
                }
              });
              
              // Get all user answers for this question
              const userAnswers = [room.challengerId, room.challengedId].map(uid => {
                const answer = room.userScores[uid].answers.find(a => a.questionId === questionToSend.id);
                return {
                  userId: uid,
                  userName: uid === room.challengerId ? room.challengerName : room.challengedName,
                  answer: answer?.answer === 'timeout' ? 'Time Out' : answer?.answer || 'No answer',
                  isCorrect: answer?.correct
                };
              });
              
              // Notify both users of answers and include question details
              io.to(roomId).emit('both_answered', { 
                scores: {
                  [room.challengerId]: room.userScores[room.challengerId].score,
                  [room.challengedId]: room.userScores[room.challengedId].score
                }, 
                correctAnswer: questionToSend.correctAnswer,
                userAnswers,
                questionNumber, // Send the current question number
                totalQuestions
              });
              
              // Move to the next question
              room.currentQuestionIndex++;
              
              if (room.currentQuestionIndex < Math.min(room.questions.length, 5)) {
                // Send the next question after a delay (reduce to 3 seconds)
                setTimeout(() => sendNextQuestion(roomId), 3000);
              } else {
                // Challenge is complete, calculate final results
                endChallenge(roomId);
              }
            }
          }
        }, 1000);
      } catch (error) {
        console.error('Error sending next question:', error);
      }
    };
    
    // Helper function to end a challenge
    const endChallenge = async (roomId: string) => {
      const room = challengeRooms[roomId];
      if (!room) return;
      
      room.status = 'completed';
      
      // Determine winner
      const challengerScore = room.userScores[room.challengerId].score;
      const challengedScore = room.userScores[room.challengedId].score;
      
      let winnerId: string;
      let winnerName: string;
      let tiebreakerId: string | null = null; // ID of the user who won by completing faster in a tie
      let badgeAwarded: string | null = null; // Track which badge was awarded
      let isTie = false;
      
      if (challengerScore > challengedScore) {
        winnerId = room.challengerId;
        winnerName = room.challengerName;
        badgeAwarded = 'brained'; // Winner by score gets the brained badge
      } else if (challengedScore > challengerScore) {
        winnerId = room.challengedId;
        winnerName = room.challengedName;
        badgeAwarded = 'brained'; // Winner by score gets the brained badge
      } else {
        // In case of a tie, winner is the one who completed faster
        const challengerTime = room.userScores[room.challengerId].timeSpent;
        const challengedTime = room.userScores[room.challengedId].timeSpent;
        
        isTie = true;
        
        if (challengerTime < challengedTime) {
          winnerId = room.challengerId;
          winnerName = room.challengerName;
          tiebreakerId = room.challengerId; // Challenger won by time in a tie
        } else {
          winnerId = room.challengedId;
          winnerName = room.challengedName;
          tiebreakerId = room.challengedId; // Challenged won by time in a tie
        }
        
        badgeAwarded = 'warrior'; // Tiebreaker winner gets the warrior badge
      }
      
      // Try to award badges to winner and update badge counts
      try {
        // Get user document to update badges
        const winnerUser = await User.findById(winnerId);
        
        if (winnerUser) {
          // Initialize badges object if it doesn't exist
          if (!winnerUser.badges) {
            winnerUser.badges = {};
          }
          
          // Award appropriate badge and increment count
          if (badgeAwarded === 'brained') {
            // Award brained badge (for winning by score)
            winnerUser.badges.brained = (winnerUser.badges.brained || 0) + 1;
            console.log(`Awarded brained badge to ${winnerName}`);
          } else if (badgeAwarded === 'warrior' && tiebreakerId) {
            // Award warrior badge (for winning by time in a tie)
            winnerUser.badges.warrior = (winnerUser.badges.warrior || 0) + 1;
            console.log(`Awarded warrior badge to ${winnerName} for winning by time in a tie`);
          }
          
          // Save the updated user document
          await winnerUser.save();
        }
        
        // Check for all-time best score in this course to award unbeatable badge
        const highestScoreUser = await User.findOne({
          _id: { $in: [room.challengerId, room.challengedId] }
        }).sort({ [`courseProgress.${room.courseId}.highestScore`]: -1 }).limit(1);
        
        if (highestScoreUser) {
          // Get the current highest course score for comparison
          const currentCourseHighScore = await TestResult.findOne({
            courseId: room.courseId
          }).sort({ score: -1 }).limit(1);
          
          const winnerScore = winnerId === room.challengerId ? challengerScore : challengedScore;
          
          // Check if this score is the new all-time best for the course
          if (currentCourseHighScore && winnerScore > currentCourseHighScore.score) {
            if (!highestScoreUser.badges) {
              highestScoreUser.badges = {};
            }
            
            // Award unbeatable badge for best score in the course
            highestScoreUser.badges.unbeatable = (highestScoreUser.badges.unbeatable || 0) + 1;
            console.log(`Awarded unbeatable badge to ${highestScoreUser.firstName} ${highestScoreUser.lastName} for new course high score`);
            
            await highestScoreUser.save();
          }
        }
      } catch (error) {
        console.error("Error awarding badges:", error);
        // Continue with challenge end despite badge error
      }
      
      // Prepare results data
      const resultsData = {
        roomId,
        challengerId: room.challengerId,
        challengerName: room.challengerName,
        challengerScore,
        challengerTimeSpent: room.userScores[room.challengerId].timeSpent,
        challengedId: room.challengedId,
        challengedName: room.challengedName,
        challengedScore,
        challengedTimeSpent: room.userScores[room.challengedId].timeSpent,
        winnerId,
        winnerName,
        courseTitle: room.courseName, // Adding course title for constructing the results URL
        isTie, // Indicate if it was a tie
        tiebreakerId, // Who won by time in a tie
        badgeAwarded, // Which badge was awarded
      };
      
      // Send results to both users
      io.to(roomId).emit('challenge_results', resultsData);
      
      // Send a message to store results in localStorage for persistence
      io.to(roomId).emit('store_challenge_results', resultsData);
      
      // NEW: Send a force redirect event to both users
      io.to(roomId).emit('force_redirect_to_results', {
        url: `/course/${room.courseName}/challenge-result?roomId=${roomId}`,
        roomId: roomId
      });
      
      console.log(`🎯 Sending forced redirect to results page for room ${roomId} with course ${room.courseName}`);
      
      // Add a delay before sending the status update to ensure the results are processed first
      setTimeout(() => {
      // Enhanced to force client-side cleanup
      io.to(roomId).emit('challenge_status_update', {
        isInChallenge: false, 
        challengeId: null,
        opponentId: null
      });
      }, 2000); // 2 second delay
      
      // Store results in database for both users
      try {
        await TestResult.create({
          userId: room.challengerId,
          courseId: room.courseId,
          score: (challengerScore / (room.questions.length * 10)) * 100, // Convert to percentage
          totalQuestions: room.questions.length,
          correctAnswers: room.userScores[room.challengerId].answers.filter(a => a.correct).length,
          timeSpent: room.userScores[room.challengerId].timeSpent,
          points: challengerScore,
          completedAt: new Date(),
          isChallenge: true,
          challengeId: roomId,
          opponentId: room.challengedId
        });
        
        await TestResult.create({
          userId: room.challengedId,
          courseId: room.courseId,
          score: (challengedScore / (room.questions.length * 10)) * 100, // Convert to percentage
          totalQuestions: room.questions.length,
          correctAnswers: room.userScores[room.challengedId].answers.filter(a => a.correct).length,
          timeSpent: room.userScores[room.challengedId].timeSpent,
          points: challengedScore,
          completedAt: new Date(),
          isChallenge: true,
          challengeId: roomId,
          opponentId: room.challengerId
        });
        
        console.log(`Challenge results saved for room ${roomId}`);
      } catch (error) {
        console.error('Error saving challenge results:', error);
        // Continue with the flow even if database save fails
        // This ensures users still get their results in the UI
        console.warn(`Challenge results not saved to database for room ${roomId}`);
      }
      
      // Clean up room data (after a delay to ensure results are delivered)
      setTimeout(() => {
        delete challengeRooms[roomId];
      }, 60000); // Keep for 1 minute then delete
    };

    httpServer.listen(3000, () => {
      console.log("🚀 Custom server listening on http://localhost:3000");
    });
  })
  .catch((err: Error) => {
    console.error("Error during app preparation:", err);
  });

// This is just to trigger a TypeScript rebuild - remove if not needed
export {};
