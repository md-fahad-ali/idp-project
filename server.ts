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
import leaderboardRoute from './routes/leaderboardRoute';
import testRoute from './routes/testRoute';
import userRoute from './routes/userRoute';
import ffRoute from './routes/ffRoute';
import activityRoute from './routes/activityRoute';
import challengeRoute from './routes/challengeRoute';
import * as bodyParser from 'body-parser';
import connectDB from './routes/db'; // Import the db module
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import passport from './lib/authMiddleware'; // Import the configured passport instance
import User from './models/User';
import TestResult from './models/TestResult';
import Course from './models/Course';
import UserActivity from './models/UserActivity';
import { generateQuestionsForCourse } from './ai-quiz-generator';
import axios from 'axios';
import { Groq } from 'groq-sdk';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next.default({ dev });
const handle = nextApp.getRequestHandler();

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
      answers: {
        questionId: string;
        answer: string;
        correct: boolean;
        timeSpent: number;
        pointsEarned?: number;
      }[];
    };
  };
  status: 'pending' | 'active' | 'completed';
  createdAt: number;
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
    server.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      if (req.method === 'POST') {
        console.log('Request headers:', req.headers);
        console.log('Request body:', req.body);
      }
      next();
    });

    // Middleware
    server.use(express.json());  // Use express.json() instead of bodyParser
    server.use(cookieParser.default());

    // CORS configuration
    server.use(
      cors.default({
        origin: ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Authorization'],
      })
    );

    // Initialize Passport
    server.use(passport.initialize());

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
      
      // Add new socket event for checking room status
      socket.on('check_room_status', (userId: string) => {
        if (!userId) {
          console.log('Received check_room_status with no userId');
          socket.emit('room_status_response', { isInRoom: false });
          return;
        }
        
        try {
          console.log(`Checking room status for user ${userId}`);
          const isInRoom = isUserInActiveRoom(userId);
          console.log(`User ${userId} is${isInRoom ? '' : ' not'} in an active room`);
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
          await UserActivity.findOneAndUpdate(
            { userId },
            { 
              userId,
              isActive: true,
              lastActive: new Date()
            },
            { upsert: true }
          );
        } catch (error) {
          console.error('Error updating user activity:', error);
        }
      });
      
      // Create challenge room
      socket.on('create_challenge', async (data) => {
        try {
          const { challengerId, challengedId, courseId } = data;
          
          if (!challengerId || !challengedId || !courseId) {
            socket.emit('challenge_room_error', 'Missing required data');
            return;
          }
          
          // Check if either user is already in a room
          if (isUserInActiveRoom(challengerId)) {
            socket.emit('challenge_room_error', 'You are already in an active challenge');
            return;
          }

          if (isUserInActiveRoom(challengedId)) {
            socket.emit('challenge_room_error', 'This player is already in an active challenge');
            return;
          }
          
          // Verify both users exist
          const [challenger, challenged, course] = await Promise.all([
            User.findById(challengerId).catch(() => null),
            User.findById(challengedId).catch(() => null),
            Course.findById(courseId).catch(() => null)
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
                { title: 'Introduction' },
                { title: 'Basic Concepts' },
                { title: 'Advanced Topics' }
              ]
            };
            
            // Generate questions using lesson titles from mock course
            const mockCourseContent = {
              title: mockCourse.title,
              lessons: mockCourse.lessons.map((lesson: any) => ({
                title: lesson.title,
                content: '',  // No content in mock data
                keyPoints: []  // No key points in mock data
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
            
            socket.emit('challenge_room_created', roomId);
            return;
          }
          
          // Get 5 random questions for this course
          let courseQuestions = course.lessons
            .flatMap((lesson: any) => lesson.tests || [])
            .flatMap((test: any) => test.questions || []);
            
          // If no questions are available, generate them using AI
          if (courseQuestions.length === 0) {
            const courseContent = {
              title: course.title,
              lessons: course.lessons.map((lesson: any) => ({
                title: lesson.title,
                content: lesson.content,
                keyPoints: lesson.keyPoints
              }))
            };
            courseQuestions = await generateQuestionsForCourse(courseContent);
          }
            
          // Randomly select 5 questions (or fewer if not enough)
          const selectedQuestions = courseQuestions
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.min(5, courseQuestions.length))
            .map((q: any) => ({
              ...q,
              id: uuidv4() // Assign unique ID to each question
            }));
          
          if (selectedQuestions.length === 0) {
            socket.emit('challenge_room_error', 'No questions available for this course');
            return;
          }
          
          // Create room with unique ID
          const roomId = uuidv4();
          
          // Create challenge room
          challengeRooms[roomId] = {
            roomId,
            challengerId: challenger._id.toString(),
            challengerName: `${challenger.firstName} ${challenger.lastName}`,
            challengedId: challenged._id.toString(),
            challengedName: `${challenged.firstName} ${challenged.lastName}`,
            courseId: String(course._id),
            courseName: course.title,
            questions: selectedQuestions,
            currentQuestionIndex: 0,
            userScores: {
              [challengerId]: { score: 0, timeSpent: 0, answers: [] },
              [challengedId]: { score: 0, timeSpent: 0, answers: [] }
            },
            status: 'pending',
            createdAt: Date.now()
          };
          
          console.log(`Challenge room ${roomId} created`);
          
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
          
          socket.emit('challenge_room_created', roomId);
          
        } catch (error) {
          console.error('Error creating challenge room:', error);
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
        
        // Handle room joining logic
        socket.join(challengeId);
        
        const challengerSocketId = userSocketMap[room.challengerId];
        if (challengerSocketId) {
          io.to(challengerSocketId).emit('challenge_accepted', { roomId: challengeId });
          io.sockets.sockets.get(challengerSocketId)?.join(challengeId);
        }
        
        // Start the challenge
        startChallenge(challengeId);
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
      socket.on('submit_answer', ({ roomId, userId, questionId, answer, timeSpent }) => {
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
          
          // Check if the answer is correct
          const isCorrect = currentQuestion.correctAnswer === answer;
          
          // Award points: 10 for correct answer, 0 for incorrect
          // Can adjust scoring algorithm as needed
          const pointsEarned = isCorrect ? 10 : 0;
          
          // Record the answer details
          room.userScores[userId].answers.push({
            questionId,
            answer,
            correct: isCorrect,
            timeSpent,
            pointsEarned
          });
          
          // Update total score and time spent
          room.userScores[userId].score += pointsEarned;
          room.userScores[userId].timeSpent += timeSpent;
          
          // Check if both users have answered
          const allUsersAnswered = [room.challengerId, room.challengedId].every(uid => {
            return room.userScores[uid]?.answers && 
                   room.userScores[uid].answers.some(a => a.questionId === questionId);
          });
          
          if (allUsersAnswered) {
            // Notify both users that both have answered
            io.to(roomId).emit('both_answered');
            
            // Move to the next question or end the challenge
            room.currentQuestionIndex++;
            
            if (room.currentQuestionIndex < room.questions.length) {
              // Send the next question after a short delay
              setTimeout(() => sendNextQuestion(roomId), 2000);
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
      
      // Handle user leaving the room
      socket.on('leave_room', async ({ roomId, userId, isChallenger }) => {
        try {
          // Find the room where this user is participating
          const room = Object.values(challengeRooms).find(room => 
            (room.challengerId === userId || room.challengedId === userId) &&
            (room.status === 'pending' || room.status === 'active')
          );

          if (room) {
            // Get both user IDs
            const challengerId = room.challengerId;
            const challengedId = room.challengedId;

            // Store room ID before deletion for cleanup
            const roomToDelete = room.roomId;

            // Get socket IDs for both users
            const challengerSocketId = userSocketMap[challengerId];
            const challengedSocketId = userSocketMap[challengedId];

            // First, update database to ensure users are marked as not in challenge
            await UserActivity.updateMany(
              { userId: { $in: [challengerId, challengedId] } },
              { 
                $set: { 
                  isInChallenge: false, 
                  challengeId: null, 
                  opponentId: null,
                  lastActive: new Date()
                }
              }
            );

            // Then handle socket cleanup and notifications
            if (challengerSocketId) {
              const challengerSocket = io.sockets.sockets.get(challengerSocketId);
              if (challengerSocket) {
                // Leave the room
                challengerSocket.leave(roomToDelete);
              }
              
              // Notify challenger about game end
              io.to(challengerSocketId).emit('challenge_status_update', {
                isInChallenge: false,
                challengeId: null,
                opponentId: null
              });
            }

            if (challengedSocketId) {
              const challengedSocket = io.sockets.sockets.get(challengedSocketId);
              if (challengedSocket) {
                // Leave the room
                challengedSocket.leave(roomToDelete);
              }
              
              // Notify challenged about game end
              io.to(challengedSocketId).emit('challenge_status_update', {
                isInChallenge: false,
                challengeId: null,
                opponentId: null
              });
            }

            // Also send opponent_left event to the other user
            const otherUserId = isChallenger ? challengedId : challengerId;
            const otherUserSocketId = userSocketMap[otherUserId];
            const leavingUserName = isChallenger ? room.challengerName : room.challengedName;
            
            if (otherUserSocketId) {
              io.to(otherUserSocketId).emit('opponent_left', {
                roomId: room.roomId,
                userId,
                userName: leavingUserName
              });
            }

            // Mark the room as completed and remove it
            room.status = 'completed';
            delete challengeRooms[roomToDelete];

            // Update socket mappings to ensure they're fresh
            [challengerId, challengedId].forEach(uid => {
              const socketId = userSocketMap[uid];
              if (socketId) {
                // Keep the socket connection but update the mapping
                socketUserMap[socketId] = uid;
                userSocketMap[uid] = socketId;
              }
            });

            console.log(`Successfully cleaned up room ${roomToDelete} for users ${challengerId} and ${challengedId}`);
          }
        } catch (error) {
          console.error('Error in leave_room handler:', error);
          socket.emit('challenge_room_error', 'Failed to leave room properly');
        }
      });

      // Handle socket disconnection
      socket.on('disconnect', async () => {
        console.log('Socket disconnected:', socket.id);
        
        const userId = socketUserMap[socket.id];
        if (userId) {
          // Only clean up the mappings, don't mark user as inactive immediately
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
    });
    
    // Helper function to start a challenge
    const startChallenge = (roomId: string) => {
      const room = challengeRooms[roomId];
      if (!room) return;
      
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
      
      // Send first question
      sendNextQuestion(roomId);
    };
    
    // Helper function to send the next question
    const sendNextQuestion = (roomId: string) => {
      const room = challengeRooms[roomId];
      if (!room || room.currentQuestionIndex >= room.questions.length) return;
      
      const currentQuestion = room.questions[room.currentQuestionIndex];
      
      // Emit the question without the correct answer
      io.to(roomId).emit('new_question', {
        question: {
          id: currentQuestion.id,
          text: currentQuestion.text,
          options: currentQuestion.options
        },
        timeLimit: 30, // 30 seconds per question
        questionNumber: room.currentQuestionIndex + 1,
        totalQuestions: room.questions.length
      });
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
      
      if (challengerScore > challengedScore) {
        winnerId = room.challengerId;
        winnerName = room.challengerName;
      } else if (challengedScore > challengerScore) {
        winnerId = room.challengedId;
        winnerName = room.challengedName;
      } else {
        // In case of a tie, winner is the one who completed faster
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
      
      // Send results to both users
      io.to(roomId).emit('challenge_results', {
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
