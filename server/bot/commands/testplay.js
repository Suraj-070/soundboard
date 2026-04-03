import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('testplay')
    .setDescription('Test audio playback with a known URL'),

  async execute(interaction, bot) {
    try {
      await interaction.deferReply();
      
      // Use a guaranteed working test audio file
      const testUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      
      await bot.playSound(testUrl);
      await interaction.editReply('🔊 Playing test audio (30 seconds)');
    } catch (error) {
      console.error('Test play error:', error);
      await interaction.editReply('❌ Failed to play test audio');
    }
  },
};