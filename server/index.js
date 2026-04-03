import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import DiscordBot from './bot/index.js';
import { setupSocketHandlers } from './socket.js';
import soundsRouter from './routes/sounds.js';
import authRouter, { sessionMiddleware } from './routes/auth.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(sessionMiddleware);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Initialize Discord bot
const bot = new DiscordBot();

// Setup Socket.IO handlers
setupSocketHandlers(io, bot);

// API Routes
app.use('/auth', authRouter);
app.use('/api/sounds', soundsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    bot: bot.isReady ? 'connected' : 'disconnected',
    voice: bot.connection ? 'connected' : 'disconnected',
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Soundboard API is running!' });
});

// Start server and bot
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Login Discord bot
    await bot.login();
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  if (bot.connection) {
    bot.connection.destroy();
  }
  
  if (bot.client) {
    await bot.client.destroy();
  }
  
  await mongoose.connection.close();
  httpServer.close();
  
  process.exit(0);
});