import { REST, Routes } from 'discord.js';
import config from './config.json' assert { type: 'json' };
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { clientId, guildId, token } = config;
const commands = [];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Array to hold import promises
const importPromises = commandFolders.flatMap(folder => {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    return commandFiles.map(file => {
        const filePath = path.join(commandsPath, file);
        const fileLink = pathToFileURL(filePath); // Convert path to URL
        return import(fileLink); // Return import promise
    });
});

try {
    // Wait for all import promises to resolve
    const commandModules = await Promise.all(importPromises);

    commandModules.forEach(commandModule => {
        const command = commandModule;
        if ('data' in command && 'execute' in command) {
            command.data.defaultPermission = false;
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command is missing a required "data" or "execute" property.`);
        }
    });

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(token);

    // Deploy commands
    const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
    );
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
    console.error(error);
}
