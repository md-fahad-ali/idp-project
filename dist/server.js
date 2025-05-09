"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const http_1 = require("http");
const next = __importStar(require("next"));
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
const LoginRoute_1 = __importDefault(require("./routes/LoginRoute"));
const signupRoute_1 = __importDefault(require("./routes/signupRoute"));
const logoutRoute_1 = __importDefault(require("./routes/logoutRoute"));
const protectedRoute_1 = __importDefault(require("./routes/protectedRoute"));
const refreshRoute_1 = __importDefault(require("./routes/refreshRoute"));
const meRoute_1 = __importDefault(require("./routes/meRoute"));
const courseRoute_1 = __importDefault(require("./routes/courseRoute"));
const publicCourseRoute_1 = __importDefault(require("./routes/publicCourseRoute"));
const leaderboardRoute_1 = __importDefault(require("./routes/leaderboardRoute"));
const testRoute_1 = __importDefault(require("./routes/testRoute"));
const userRoute_1 = __importDefault(require("./routes/userRoute"));
const ffRoute_1 = __importDefault(require("./routes/ffRoute"));
const activityRoute_1 = __importDefault(require("./routes/activityRoute"));
const challengeRoute_1 = __importDefault(require("./routes/challengeRoute"));
const db_1 = __importDefault(require("./routes/db")); // Import the db module
const cookieParser = __importStar(require("cookie-parser"));
const cors = __importStar(require("cors"));
const authMiddleware_1 = __importDefault(require("./lib/authMiddleware")); // Import the configured passport instance
const User_1 = __importDefault(require("./models/User"));
const TestResult_1 = __importDefault(require("./models/TestResult"));
const Course_1 = __importDefault(require("./models/Course"));
const UserActivity_1 = __importDefault(require("./models/UserActivity"));
const ai_quiz_generator_1 = require("./ai-quiz-generator");
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next.default({ dev });
const handle = nextApp.getRequestHandler();
const challengeRooms = {};
// Socket user mapping
const userSocketMap = {};
const socketUserMap = {};
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
    server.use(express.json()); // Use express.json() instead of bodyParser
    server.use(cookieParser.default());
    // CORS configuration
    server.use(cors.default({
        origin: ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Authorization'],
    }));
    // Initialize Passport
    server.use(authMiddleware_1.default.initialize());
    // Check database connection
    try {
        await (0, db_1.default)();
        console.log("✅ Database connected successfully");
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        // For development, we'll continue even if database connection fails
        if (process.env.NODE_ENV === 'production') {
            console.error("Database connection is required in production. Exiting.");
            process.exit(1);
        }
        else {
            console.warn("Continuing without database connection for development purposes.");
        }
    }
    // API Routes with error handling
    server.use("/api/auth/signup", signupRoute_1.default);
    server.use("/api/auth/login", LoginRoute_1.default);
    server.use("/api/auth/logout", logoutRoute_1.default);
    server.use("/api/auth/refresh", refreshRoute_1.default);
    server.use("/api/protected", protectedRoute_1.default);
    server.use("/api/auth/me", meRoute_1.default);
    server.use("/api/course", courseRoute_1.default);
    server.use("/api/public/courses", publicCourseRoute_1.default);
    server.use("/api/leaderboard", leaderboardRoute_1.default);
    server.use("/api/test", testRoute_1.default);
    server.use("/api/user", userRoute_1.default);
    server.use("/api/find_friends", ffRoute_1.default);
    server.use("/api/activity", activityRoute_1.default);
    server.use("/api/challenge", challengeRoute_1.default);
    // Handle all other routes with Next.js
    server.all("*", (req, res) => {
        // console.log('Fallback route hit:', req.url);
        return handle(req, res);
    });
    const httpServer = (0, http_1.createServer)(server);
    // Set up Socket.IO
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: ['http://localhost:3000'],
            credentials: true,
        },
    });
    // Helper function to check if a user is in any active room
    const isUserInActiveRoom = (userId) => {
        return Object.values(challengeRooms).some(room => (room.challengerId === userId || room.challengedId === userId) &&
            (room.status === 'pending' || room.status === 'active'));
    };
    // Socket.io middleware to handle connections
    io.on('connection', async (socket) => {
        console.log('New socket connection:', socket.id);
        // Add debug logging for all events
        const originalOn = socket.on;
        socket.on = function (event, callback) {
            console.log(`[DEBUG] Registering handler for event: ${event}`);
            return originalOn.call(this, event, (...args) => {
                console.log(`[DEBUG] Event received: ${event}`, args);
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
        socket.on('check_room_status', (userId) => {
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
            }
            catch (error) {
                console.error('Error checking room status:', error);
                // Always respond even on error
                socket.emit('room_status_response', { isInRoom: false });
            }
        });
        // User identifies themselves (usually after login)
        socket.on('identify', async ({ userId }) => {
            if (!userId)
                return;
            console.log(`User ${userId} identified on socket ${socket.id}`);
            // Update user-socket mapping
            userSocketMap[userId] = socket.id;
            socketUserMap[socket.id] = userId;
            // Check if user is in any room and send room data
            const userRoom = Object.values(challengeRooms).find(room => (room.challengerId === userId || room.challengedId === userId) &&
                (room.status === 'pending' || room.status === 'active'));
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
                await UserActivity_1.default.findOneAndUpdate({ userId }, {
                    userId,
                    isActive: true,
                    lastActive: new Date()
                }, { upsert: true });
            }
            catch (error) {
                console.error('Error updating user activity:', error);
            }
        });
        // Create challenge room
        socket.on('create_challenge', async (data) => {
            try {
                const { challengerId, challengedId, courseId } = data;
                // Find relevant data
                const [challenger, challenged, course] = await Promise.all([
                    User_1.default.findById(challengerId),
                    User_1.default.findById(challengedId),
                    Course_1.default.findById(courseId).populate('lessons')
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
                        lessons: mockCourse.lessons.map((lesson) => ({
                            title: lesson.title,
                            content: lesson.content || '',
                            keyPoints: lesson.keyPoints || []
                        }))
                    };
                    const generatedQuestions = await (0, ai_quiz_generator_1.generateQuestionsForCourse)(mockCourseContent);
                    if (generatedQuestions.length === 0) {
                        socket.emit('challenge_room_error', 'Failed to generate questions');
                        return;
                    }
                    // Create room with unique ID
                    const roomId = (0, uuid_1.v4)();
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
                // For real courses, we'll defer question generation until accept_challenge
                // This ensures we have both users ready before spending time on generation
                // Create room with unique ID
                const roomId = (0, uuid_1.v4)();
                // Create challenge room (without questions for now)
                challengeRooms[roomId] = {
                    roomId,
                    challengerId: challenger._id.toString(),
                    challengerName: `${challenger.firstName} ${challenger.lastName}`,
                    challengedId: challenged._id.toString(),
                    challengedName: `${challenged.firstName} ${challenged.lastName}`,
                    courseId: String(course._id),
                    courseName: course.title,
                    questions: [], // We'll generate these when the challenge is accepted
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
                socket.emit('challenge_room_created', roomId);
            }
            catch (error) {
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
            // If we don't have questions yet, generate them now that both users are ready
            if (!room.questions || room.questions.length === 0) {
                console.log('No questions found, generating from course content...');
                // Fetch the latest course data to ensure we have current content
                Course_1.default.findById(room.courseId)
                    .then(async (course) => {
                    if (!course) {
                        console.error('Course not found for question generation');
                        socket.emit('challenge_error', 'Failed to load course content for questions');
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
                    // Generate questions from the actual course content
                    const generatedQuestions = await (0, ai_quiz_generator_1.generateQuestionsForCourse)(courseContent);
                    if (generatedQuestions.length === 0) {
                        socket.emit('challenge_error', 'Failed to generate questions from course content');
                        return;
                    }
                    // Update the room with the generated questions
                    room.questions = generatedQuestions.map(q => ({
                        ...q,
                        id: (0, uuid_1.v4)() // Assign unique ID to each question
                    }));
                    console.log(`Generated ${room.questions.length} questions from course content`);
                    // Start the challenge with the new questions
                    startChallenge(challengeId);
                })
                    .catch(error => {
                    console.error('Error generating questions from course:', error);
                    socket.emit('challenge_error', 'Failed to prepare questions');
                });
            }
            else {
                // Start the challenge with existing questions
                startChallenge(challengeId);
            }
        });
        // Decline challenge
        socket.on('decline_challenge', ({ challengeId, userId }) => {
            const room = challengeRooms[challengeId];
            if (!room)
                return;
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
                    }
                    else {
                        // Challenge is complete, calculate final results
                        endChallenge(roomId);
                    }
                }
            }
            catch (error) {
                console.error('Error submitting answer:', error);
                socket.emit('answer_error', 'Server error');
            }
        });
        // Handle user leaving the room
        socket.on('leave_room', async (data) => {
            console.log("🔴 LEAVE_ROOM EVENT RECEIVED with data:", data);
            try {
                // Extract parameters, using defaults if missing
                const roomId = data?.roomId;
                const userId = data?.userId;
                const isChallenger = data?.isChallenger;
                const customMessage = data?.customMessage || "Player has left the game.";
                console.log("🔴 Processed leave_room parameters:", { roomId, userId, isChallenger, customMessage });
                // Continue only if we have userId
                if (!userId) {
                    console.error("🔴 Missing userId in leave_room event");
                    return;
                }
                // Find the room where this user is participating
                const room = Object.values(challengeRooms).find(room => (room.challengerId === userId || room.challengedId === userId) &&
                    (room.status === 'pending' || room.status === 'active'));
                console.log("🔴 Found room for user:", room ? room.roomId : "No room found");
                if (room) {
                    // Get both user IDs
                    const challengerId = room.challengerId;
                    const challengedId = room.challengedId;
                    // Determine which user is leaving and which is the opponent
                    const isUserChallenger = userId === challengerId;
                    const opponentId = isUserChallenger ? challengedId : challengerId;
                    const leavingUserName = isUserChallenger ? room.challengerName : room.challengedName;
                    const opponentSocketId = userSocketMap[opponentId];
                    console.log(`🔴 User ${userId} (${leavingUserName}) is leaving, opponent is ${opponentId}`);
                    console.log(`🔴 Opponent socket ID: ${opponentSocketId}`);
                    // Store room ID before deletion for cleanup
                    const roomToDelete = room.roomId;
                    // Get socket IDs for both users (needed for notifications)
                    const challengerSocketId = userSocketMap[challengerId];
                    const challengedSocketId = userSocketMap[challengedId];
                    // Send a single notification to the opponent
                    if (opponentSocketId) {
                        console.log(`🔴 Sending opponent_left notification to ${opponentId}`);
                        io.to(opponentSocketId).emit('opponent_left', {
                            roomId: room.roomId,
                            userId,
                            userName: leavingUserName,
                            customMessage
                        });
                    }
                    // First, update database to ensure users are marked as not in challenge
                    await UserActivity_1.default.updateMany({ userId: { $in: [challengerId, challengedId] } }, {
                        $set: {
                            isInChallenge: false,
                            challengeId: null,
                            opponentId: null,
                            lastActive: new Date()
                        }
                    });
                    // Then handle socket cleanup and notifications
                    if (challengerSocketId) {
                        const challengerSocket = io.sockets.sockets.get(challengerSocketId);
                        if (challengerSocket) {
                            challengerSocket.leave(roomToDelete);
                        }
                        io.to(challengerSocketId).emit('challenge_status_update', {
                            isInChallenge: false,
                            challengeId: null,
                            opponentId: null
                        });
                    }
                    if (challengedSocketId) {
                        const challengedSocket = io.sockets.sockets.get(challengedSocketId);
                        if (challengedSocket) {
                            challengedSocket.leave(roomToDelete);
                        }
                        io.to(challengedSocketId).emit('challenge_status_update', {
                            isInChallenge: false,
                            challengeId: null,
                            opponentId: null
                        });
                    }
                    // Mark the room as completed and remove it
                    room.status = 'completed';
                    delete challengeRooms[roomToDelete];
                    console.log(`🔴 Successfully cleaned up room ${roomToDelete}`);
                }
            }
            catch (error) {
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
                    await UserActivity_1.default.findOneAndUpdate({ userId }, {
                        $set: {
                            isActive: true,
                            lastActive: new Date()
                        }
                    }, { upsert: true });
                }
                catch (error) {
                    console.error('Error updating user activity on reconnect:', error);
                }
            }
        });
        // Join challenge room (used by challenger and challenged)
        socket.on('join_challenge', ({ roomId, userId }) => {
            try {
                console.log(`User ${userId} joining challenge room ${roomId}`);
                const room = challengeRooms[roomId];
                if (!room) {
                    socket.emit('challenge_error', 'Challenge room not found');
                    return;
                }
                // Check if user is authorized to join this room
                if (room.challengerId !== userId && room.challengedId !== userId) {
                    socket.emit('challenge_error', 'Not authorized to join this challenge');
                    return;
                }
                // Join the socket room
                socket.join(roomId);
                // Send room data to the user
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
                console.log(`User ${userId} joined challenge room ${roomId}`);
                // If the room is already active, send the current question
                if (room.status === 'active' && room.currentQuestionIndex < room.questions.length) {
                    const currentQuestion = room.questions[room.currentQuestionIndex];
                    socket.emit('new_question', {
                        question: {
                            id: currentQuestion.id,
                            text: currentQuestion.text,
                            options: currentQuestion.options,
                            topic: currentQuestion.topic || room.courseName
                        },
                        timeLimit: 30,
                        questionNumber: room.currentQuestionIndex + 1,
                        totalQuestions: room.questions.length,
                        courseName: room.courseName
                    });
                }
            }
            catch (error) {
                console.error('Error joining challenge room:', error);
                socket.emit('challenge_error', 'Server error joining challenge room');
            }
        });
    });
    // Helper function to start a challenge
    const startChallenge = (roomId) => {
        const room = challengeRooms[roomId];
        if (!room)
            return;
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
    const sendNextQuestion = (roomId) => {
        const room = challengeRooms[roomId];
        if (!room || room.currentQuestionIndex >= room.questions.length)
            return;
        const currentQuestion = room.questions[room.currentQuestionIndex];
        // Emit the question without the correct answer
        io.to(roomId).emit('new_question', {
            question: {
                id: currentQuestion.id,
                text: currentQuestion.text,
                options: currentQuestion.options,
                topic: currentQuestion.topic || room.courseName, // Include topic if available
            },
            timeLimit: 30, // 30 seconds per question
            questionNumber: room.currentQuestionIndex + 1,
            totalQuestions: room.questions.length,
            // Include course context to remind users what content this is from
            courseName: room.courseName
        });
        // Log question sending to verify it's working
        console.log(`Sending question ${room.currentQuestionIndex + 1} of ${room.questions.length} to room ${roomId}`);
    };
    // Helper function to end a challenge
    const endChallenge = async (roomId) => {
        const room = challengeRooms[roomId];
        if (!room)
            return;
        room.status = 'completed';
        // Determine winner
        const challengerScore = room.userScores[room.challengerId].score;
        const challengedScore = room.userScores[room.challengedId].score;
        let winnerId;
        let winnerName;
        if (challengerScore > challengedScore) {
            winnerId = room.challengerId;
            winnerName = room.challengerName;
        }
        else if (challengedScore > challengerScore) {
            winnerId = room.challengedId;
            winnerName = room.challengedName;
        }
        else {
            // In case of a tie, winner is the one who completed faster
            const challengerTime = room.userScores[room.challengerId].timeSpent;
            const challengedTime = room.userScores[room.challengedId].timeSpent;
            if (challengerTime < challengedTime) {
                winnerId = room.challengerId;
                winnerName = room.challengerName;
            }
            else {
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
        // Enhanced to force client-side cleanup
        io.to(roomId).emit('challenge_status_update', {
            isInChallenge: false,
            challengeId: null,
            opponentId: null
        });
        // Store results in database for both users
        try {
            await TestResult_1.default.create({
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
            await TestResult_1.default.create({
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
        }
        catch (error) {
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
    .catch((err) => {
    console.error("Error during app preparation:", err);
});
