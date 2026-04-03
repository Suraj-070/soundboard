import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import playCommand from './commands/play.js';
import testPlayCommand from './commands/testplay.js';

dotenv.config();

const commands = [
  playCommand.data.toJSON(),
  testPlayCommand.data.toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ Successfully registered application commands!');
    process.exit(0);
  } catch (error) {
    console.error('Error registering commands:', error);
    process.exit(1);
  }
})();