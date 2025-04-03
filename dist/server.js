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
const leaderboardRoute_1 = __importDefault(require("./routes/leaderboardRoute"));
const testRoute_1 = __importDefault(require("./routes/testRoute"));
const userRoute_1 = __importDefault(require("./routes/userRoute"));
const ffRoute_1 = __importDefault(require("./routes/ffRoute"));
const activityRoute_1 = __importDefault(require("./routes/activityRoute"));
const challengeRoute_1 = __importDefault(require("./routes/challengeRoute"));
const bodyParser = __importStar(require("body-parser"));
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
    server.use((req, res, next) => {
        console.log('\n=== New Request ===');
        console.log(`${req.method} ${req.url}`);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('==================\n');
        next();
    });
    // Middleware
    server.use(bodyParser.json());
    server.use(express.json());
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
        // Add new socket event for checking room status
        socket.on('check_room_status', (userId) => {
            const isInRoom = isUserInActiveRoom(userId);
            socket.emit('room_status_response', { isInRoom });
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
                    User_1.default.findById(challengerId).catch(() => null),
                    User_1.default.findById(challengedId).catch(() => null),
                    Course_1.default.findById(courseId).catch(() => null)
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
                        lessons: mockCourse.lessons.map((lesson) => ({
                            title: lesson.title,
                            content: '', // No content in mock data
                            keyPoints: [] // No key points in mock data
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
                // Get 5 random questions for this course
                let courseQuestions = course.lessons
                    .flatMap((lesson) => lesson.tests || [])
                    .flatMap((test) => test.questions || []);
                // If no questions are available, generate them using AI
                if (courseQuestions.length === 0) {
                    const courseContent = {
                        title: course.title,
                        lessons: course.lessons.map((lesson) => ({
                            title: lesson.title,
                            content: lesson.content,
                            keyPoints: lesson.keyPoints
                        }))
                    };
                    courseQuestions = await (0, ai_quiz_generator_1.generateQuestionsForCourse)(courseContent);
                }
                // Randomly select 5 questions (or fewer if not enough)
                const selectedQuestions = courseQuestions
                    .sort(() => 0.5 - Math.random())
                    .slice(0, Math.min(5, courseQuestions.length))
                    .map((q) => ({
                    ...q,
                    id: (0, uuid_1.v4)() // Assign unique ID to each question
                }));
                if (selectedQuestions.length === 0) {
                    socket.emit('challenge_room_error', 'No questions available for this course');
                    return;
                }
                // Create room with unique ID
                const roomId = (0, uuid_1.v4)();
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
            // Start the challenge
            startChallenge(challengeId);
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
        socket.on('leave_room', ({ roomId, userId, isChallenger }) => {
            // Find the room where this user is participating
            const room = Object.values(challengeRooms).find(room => (room.challengerId === userId || room.challengedId === userId) &&
                (room.status === 'pending' || room.status === 'active'));
            if (room) {
                // Get both user IDs
                const challengerId = room.challengerId;
                const challengedId = room.challengedId;
                // Store room ID before deletion for cleanup
                const roomToDelete = room.roomId;
                // Get socket IDs for both users
                const challengerSocketId = userSocketMap[challengerId];
                const challengedSocketId = userSocketMap[challengedId];
                // Notify both users that the game has ended
                if (challengerSocketId) {
                    // Remove user from room first
                    io.sockets.sockets.get(challengerSocketId)?.leave(roomToDelete);
                    io.to(challengerSocketId).emit('challenge_status_update', {
                        isInChallenge: false,
                        challengeId: null,
                        opponentId: null
                    });
                }
                if (challengedSocketId) {
                    // Remove user from room first
                    io.sockets.sockets.get(challengedSocketId)?.leave(roomToDelete);
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
                // Mark the room as completed
                room.status = 'completed';
                // Clean up the specific room only
                delete challengeRooms[roomToDelete];
                // Update only these two users' activity status
                try {
                    UserActivity_1.default.updateMany({ userId: { $in: [challengerId, challengedId] } }, {
                        $set: {
                            isInChallenge: false,
                            challengeId: null,
                            opponentId: null,
                            lastActive: new Date() // Update last active time
                        }
                    });
                    // Log cleanup for debugging
                    console.log(`Successfully cleaned up room ${roomToDelete} for users ${challengerId} and ${challengedId}`);
                }
                catch (error) {
                    console.error('Error updating user activity status:', error);
                }
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
            challengedId: room.challengedId,
            courseId: room.courseId,
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
                options: currentQuestion.options
            },
            timeLimit: 30, // 30 seconds per question
            questionNumber: room.currentQuestionIndex + 1,
            totalQuestions: room.questions.length
        });
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
