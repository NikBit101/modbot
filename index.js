// modules
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Sentiment from 'sentiment';
import path from 'node:path';
import fs from 'node:fs';

// custom modules/configs
import { scanURL } from './scanContent.mjs';
import * as regServer from './commands/registration/channel-config.json' assert { type: 'json' };
import * as token from './config.json' assert { type: 'json' };

// assign a client with necessary intents/permissions
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
// construct new sentiment class
const sentiment = new Sentiment();

client.commands = new Collection();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

function getTime() { return new Date().toLocaleString(); }

// Create and deploy a collection of commands
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const fileLink = pathToFileURL(filePath);
		import(fileLink).then(command => {
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}).catch(error => {
			console.error(`Error opening a command from ${filePath}: `, error);
		});
	}
}

async function handleSuspiciousLink(message) {
	// Extract URLs from the message content
	const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
	const regex = new RegExp(expression);
	const urls = message.content.match(regex);
	if (urls) {
		// Check if the url is malicious
		const result = await scanURL(urls);
		if (result === 'high' || result === 'medium') {
			// Inform admins about the suspicious link
			try {
				const channel = message.guild.channels.cache.get(regServer.default['bot-emergency-id']);
				channel.send(`[${getTime()}] [WARNING] Suspicious link detected by ${message.author.tag} in ${message.channel.name}: ${urls[0]}\nThe user has been timed out for 24 hours.`);

				await message.delete();
				await message.member.timeout(24 * 60 * 60 * 1000, 'Sent malicious/suspicious link').then(console.log(`Muted ${message.member}`));
				return;
			} catch (e) { console.error(e); }
		} else if (result === 'low') {
			const channel = message.guild.channels.cache.get(regServer.default['bot-emergency-id']);
			channel.send(`[${getTime()}] [WARNING] mildly suspicious link was detected by ${message.author.tag} in ${message.channel.name}: ${urls[0]}`);
		}
	}
}

// Handle unauthorized user messages
function handleUnauthorizedUser(message) {
	// Ban unauthorized user and inform admins
	console.log(`${message.author.tag} is NOT part of any role, therefore will be deleted from the server.`);
	message.member.ban().then(() => {
		console.log(`[${getTime()}] User ${message.author.tag} [${message.member}] has been banned from the server due to trying to communicate with 0 roles.`);
		// Inform admins through channel
		try {
			const channel = message.guild.channels.cache.get(regServer.default['bot-emergency-id']);
			channel.send(`[${getTime()}] User ${message.author.tag} [${message.member}] has been banned from the server due to trying to communicate with 0 roles.`);
			const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
			channel.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
			message.delete().then(channel.send('Message has been deleted from the channel'));
		} catch (e) { console.error(e); }
	}).catch(error => {
		console.error('Error banning unauthorized user:', error);
	});
}

function handleUnauthorisedMessage(message) {
	/*
	* first check if the message was sent anywhere BUT the '#get-access' channel
	* then check if the message was sent from unauthorised user (i.e. the user with 0 roles assigned)
	* which is the user who bypassed the registration stage
	*/
	if (message.channelId !== regServer.default['get-access-id']) {
		const rolesWithoutEveryone = message.member.roles.cache.filter(role => role.name !== '@everyone');
		if (!rolesWithoutEveryone.size > 0) {
			handleUnauthorizedUser(message);
		}
	}
}

function handleNegativeSentiment(message, result) {
	// Warn admins about negative sentiment message
	try {
		const channel = message.guild.channels.cache.get(regServer.default['bot-emergency-id']);
		channel.send(`\n\n[${getTime()}] Warning! User ${message.author.tag} [${message.member}] has sent an inappropriate message on [${message.channel.name}]`);
		const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
		channel.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
		channel.send(`\n\nThe sentiment analysis showed: \n---\n${JSON.stringify(result, null, 2)}\n---`);
	} catch (e) { console.error(e); }
}

function handleDictionary(message) {
	let badWords = [];
	try {
		const data = fs.readFileSync(path.join(__dirname, 'commands', 'wordDictionary', 'badDictionary.json'));
		badWords = JSON.parse(data);
	} catch (error) {
		console.error('Error loading bad words:', error);
	}

	const containsBadWord = badWords.some(word => message.content.toLowerCase().includes(word.toLowerCase()));
	if (containsBadWord) {
		// Word from custom dictionary was found
		// Warn the admins that a member has sent a negative message on a server
		// Provide report of the sentimental analysis of the message as well
		try {
			const channel = message.guild.channels.cache.get(regServer.default['bot-emergency-id']);
			channel.send(`\n\n[${getTime()}] Warning! User ${message.author.tag} [${message.member}] has sent inappropriate message on [${message.channel.name}] based on custom dictionary.`);
			const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
			channel.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
		} catch (e) { console.error(e); }
	}
}

function handleMessage(message) {
	const result = sentiment.analyze(message.content);
	const sentimentType = result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral';
	if (sentimentType === 'negative') {
		handleNegativeSentiment(message, result);
	} else { handleDictionary(message); }
}

// Once the bot is ready to run
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


client.on('messageCreate', async message => {
	// Ignore messages from bots or empty messages
	if (message.author.bot || !message.content) return;

	handleMessage(message);
	handleUnauthorisedMessage(message);
	await handleSuspiciousLink(message);
});

// When a member tries to interact with the bot through commands (/)
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

// New members joined the server
client.on('guildMemberAdd', (member) => {
	console.log(`[${getTime()}] New member has joined the server!: ${member}`);
	const regChannel = member.guild.channels.cache.find(channel => channel.id === regServer.default['get-access-id']);
	if (regChannel) {
		regChannel.send(`Welcome ${member} to University of Portsmouth Discord Server! Please read the rules and instructions in the #get-access channel to gain access to the server.\n- Type in this command to register yourself: /reg [Your Student ID] [Your first name] [Your last name]`);
	} else {
		console.error('Error: #get-access channel not found or is inaccessible.');
	}
});

client.login(token.default.token);