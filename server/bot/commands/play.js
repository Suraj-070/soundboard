import { SlashCommandBuilder } from 'discord.js';
import Sound from '../../models/Sound.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a sound in voice channel')
    .addStringOption(option =>
      option
        .setName('sound')
        .setDescription('The sound to play')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    try {
      // Get all sounds
      const sounds = await Sound.find();
      
      // Filter by search query
      const filtered = sounds.filter(sound => 
        sound.name.toLowerCase().includes(focusedValue) ||
        sound.slug.includes(focusedValue) ||
        sound.category.includes(focusedValue)
      );

      // Return max 25 results (Discord limit)
      const choices = filtered.slice(0, 25).map(sound => ({
        name: `${sound.name} [${sound.category}]`,
        value: sound.slug,
      }));

      await interaction.respond(choices);
    } catch (error) {
      console.error('Autocomplete error:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction, bot) {
    try {
      const soundSlug = interaction.options.getString('sound');

      // Find sound by slug
      const sound = await Sound.findOne({ slug: soundSlug });

      if (!sound) {
        return await interaction.reply({
          content: '❌ Sound not found!',
          ephemeral: true,
        });
      }

      // Check if bot is in voice
      if (!bot.connection) {
        return await interaction.reply({
          content: '❌ Bot is not in a voice channel!',
          ephemeral: true,
        });
      }

      // Play the sound
      await interaction.deferReply();
      await bot.playSound(sound.cloudinaryUrl);

      // Increment play count
      sound.playCount += 1;
      await sound.save();

      await interaction.editReply(`🔊 Now playing: **${sound.name}**`);

      console.log(`🔊 Playing sound: ${sound.name} (requested by ${interaction.user.tag})`);
    } catch (error) {
      console.error('Error executing play command:', error);
      
      if (interaction.deferred) {
        await interaction.editReply('❌ Failed to play sound!');
      } else {
        await interaction.reply({
          content: '❌ Failed to play sound!',
          ephemeral: true,
        });
      }
    }
  },
};