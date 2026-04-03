import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus, 
  entersState,
  StreamType,
  NoSubscriberBehavior
} from '@discordjs/voice';
import playCommand from './commands/play.js';
import testPlayCommand from './commands/testplay.js';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DiscordBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
      ],
    });

    this.connection = null;
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });
    this.isReady = false;
    this.guildId = process.env.DISCORD_GUILD_ID;
    this.voiceChannelId = process.env.DISCORD_VOICE_CHANNEL_ID;

    // Store commands
    this.commands = new Collection();
    this.commands.set(playCommand.data.name, playCommand);
    this.commands.set(testPlayCommand.data.name, testPlayCommand);

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.once('ready', () => {
      console.log(`✅ Discord bot logged in as ${this.client.user.tag}`);
      this.isReady = true;
      this.joinVoiceChannel();
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });

    // Handle slash commands
    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isCommand()) {
        const command = this.commands.get(interaction.commandName);
        if (!command) return;

        try {
          await command.execute(interaction, this);
        } catch (error) {
          console.error('Command execution error:', error);
        }
      } else if (interaction.isAutocomplete()) {
        const command = this.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;

        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error('Autocomplete error:', error);
        }
      }
    });

    // Player event handlers
    this.player.on(AudioPlayerStatus.Playing, () => {
      console.log('🔊 Audio player is playing');
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      console.log('⏸️ Audio player is idle');
    });

    this.player.on('error', (error) => {
      console.error('Audio player error:', error);
    });

    this.player.on('stateChange', (oldState, newState) => {
      console.log(`Player state: ${oldState.status} -> ${newState.status}`);
    });
  }

  async login() {
    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('Failed to login to Discord:', error);
      throw error;
    }
  }

  async joinVoiceChannel() {
    if (!this.guildId || !this.voiceChannelId) {
      console.error('❌ Missing DISCORD_GUILD_ID or DISCORD_VOICE_CHANNEL_ID in .env');
      return;
    }

    try {
      this.connection = joinVoiceChannel({
        channelId: this.voiceChannelId,
        guildId: this.guildId,
        adapterCreator: this.client.guilds.cache.get(this.guildId).voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      // CRITICAL: Subscribe player BEFORE any events
      const subscription = this.connection.subscribe(this.player);
      
      // Store subscription to prevent garbage collection
      this.subscription = subscription;

      // Handle connection state changes
      this.connection.on(VoiceConnectionStatus.Ready, () => {
        console.log('✅ Voice connection is ready');
      });

      this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        console.log('⚠️ Voice connection disconnected, attempting to reconnect...');
        try {
          await Promise.race([
            entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
          // Seems to be reconnecting to a new channel - ignore disconnect
        } catch (error) {
          // Seems to be a real disconnect - destroy and rejoin
          this.connection.destroy();
          setTimeout(() => this.joinVoiceChannel(), 5000);
        }
      });

      this.connection.on('error', (error) => {
        console.error('Voice connection error:', error);
      });

      this.connection.on('stateChange', (oldState, newState) => {
        console.log(`Connection state: ${oldState.status} -> ${newState.status}`);
      });

      console.log(`🎤 Joined voice channel: ${this.voiceChannelId}`);
    } catch (error) {
      console.error('Failed to join voice channel:', error);
      // Retry after 10 seconds
      setTimeout(() => this.joinVoiceChannel(), 10000);
    }
  }

  async playSound(url) {
    if (!this.connection) {
      throw new Error('Not connected to voice channel');
    }

    try {
      console.log(`🎵 Attempting to play: ${url}`);
      
      // Download file first
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFile = path.join(tempDir, `sound_${Date.now()}.mp3`);
      
      await this.downloadFile(url, tempFile);
      console.log(`📥 Downloaded to: ${tempFile}`);
      
      const resource = createAudioResource(tempFile, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
      
      resource.volume.setVolume(1.0);
      
      this.player.play(resource);
      
      console.log('✅ Audio resource created and sent to player');
      
      // Clean up temp file after playback
      this.player.once(AudioPlayerStatus.Idle, () => {
        try {
          fs.unlinkSync(tempFile);
          console.log('🗑️ Cleaned up temp file');
        } catch (err) {
          console.error('Failed to delete temp file:', err);
        }
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to play sound:', error);
      throw error;
    }
  }

  downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
  }

  getGuild() {
    return this.client.guilds.cache.get(this.guildId);
  }
}

export default DiscordBot;