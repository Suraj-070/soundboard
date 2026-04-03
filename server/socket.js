import Sound from './models/Sound.js';

export function setupSocketHandlers(io, bot) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle play-sound event from dashboard
    socket.on('play-sound', async (data) => {
      try {
        const { soundId } = data;
        
        // Find sound in database
        const sound = await Sound.findById(soundId);
        if (!sound) {
          socket.emit('error', { message: 'Sound not found' });
          return;
        }

        // Play sound through Discord bot
        await bot.playSound(sound.cloudinaryUrl);

        // Increment play count
        sound.playCount += 1;
        await sound.save();

        // Broadcast to all connected clients
        io.emit('now-playing', {
          soundId: sound._id,
          name: sound.name,
          category: sound.category,
          playedAt: new Date(),
        });

        console.log(`🔊 Playing sound: ${sound.name}`);
      } catch (error) {
        console.error('Error playing sound:', error);
        socket.emit('error', { message: 'Failed to play sound' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}