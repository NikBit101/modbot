// modules
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Sentiment from 'sentiment';
import path from 'node:path';
import fs from 'node:fs';

// custom modules
import { scanURL } from './scanContent.mjs';
import * as regServer from './commands/registration/channel-config.json' assert { type: 'json' };
import * as token from './config.json' assert { type: 'json' };

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
const sentiment = new Sentiment();

client.commands = new Collection();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

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

async function handleSuspiciousLinkOrFile(message) {
	// Regular expression to extract URLs from a string
	const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
	// Extract URLs from the message content
	const regex = new RegExp(expression);
	const urls = message.content.match(regex);
	if (urls) {
		// Check if the result is malicious
		const result = await scanURL(urls);

		const adminRole = message.guild.roles.cache.find(role => role.name === 'admin');
		if (result === 'high' || result === 'medium') {
			// Inform admins about the suspicious link
			try {
			const channel = message.guild.channels.cache.get(regServer.default['bot-emergency-id']);
			channel.send(`[WARNING] Suspicious link detected by ${message.author.tag} in ${message.channel.name}: ${urls[0]}\nThe user has been timed out for 24 hours.`);
			//if (adminRole) {
				// warn through the channel
				
				const admins = message.guild.members.cache.filter(member => member.roles.cache.has(adminRole.id));
				admins.forEach(admin => {
				try {
					admin.send(`[WARNING] Suspicious link detected by ${message.author.tag} in ${message.channel.name}: ${urls[0]}\nThe user has been timed out for 24 hours.`);
				} catch (error) {
					console.error('Error sending message to admin:', error);
				}
			});
			// } else {
				//console.error('No one under admin role exists.');
				// }
				
				await message.delete();
				await message.member.timeout(24 * 60 * 60 * 1000, 'Sent malicious/suspicious link').then(console.log(`Muted ${message.member}`));
				return;
			} catch (e) { console.error(e); }
		} else if (result === 'low') {
			if (adminRole) {
				const admins = message.guild.members.cache.filter(member => member.roles.cache.has(adminRole.id));
				admins.forEach(admin => {
					admin.send(`[WARNING] mildly suspicious link was detected by ${message.author.tag} in ${message.channel.name}: ${urls[0]}`);
				});
			} else {
				console.error('No one under admin role exists.');
			}
		}
	}
}

// Handle unauthorized user messages
function handleUnauthorizedUser(message) {
	// Ban unauthorized user and inform admins
	console.log(`${message.author.tag} is NOT part of any role, therefore will be deleted from the server.`);
	message.member.ban().then(() => {
		const timestamp = new Date().toLocaleString();
		console.log(`[${timestamp}] User ${message.author.tag} [${message.member}] has been banned from the server due to trying to communicate with 0 roles.`);

		// Inform admins through channel
		try {
			const channel = message.guild.channels.cache.get(regServer.default['bot-emergency-id']);
			channel.send(`[${timestamp}] User ${message.author.tag} [${message.member}] has been banned from the server due to trying to communicate with 0 roles.`);
			const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
			channel.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
			message.delete().then(channel.send('Message has been deleted from the channel'));
		} catch (e) { console.error(e); }

		// Inform admins through DM
		const adminRole = message.guild.roles.cache.find(role => role.name === 'admin');
		if (adminRole) {
			const admins = message.guild.members.cache.filter(member => member.roles.cache.has(adminRole.id));
			admins.forEach(admin => {
				admin.send(`[${timestamp}] User ${message.author.tag} [${message.member}] has been banned from the server due to trying to communicate with 0 roles.`);
			});
		} else {
			console.error('No one under admin role exists.');
		}
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
	const adminRole = message.guild.roles.cache.find(role => role.name === 'admin');
	//const isAdmin = message.member.roles.cache.has(adminRole?.id);
	//console.log(adminRole);
	// Ensure that admins are exempt from the message check
	//if (!isAdmin) {
	try {
		const channel = message.guild.channels.cache.get(regServer.default['bot-emergency-id']);
		channel.send(`\n\n[${new Date().toLocaleString()}] Warning! User ${message.author.tag} [${message.member}] has sent an inappropriate message on [${message.channel.name}]`);
		const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
		channel.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
		channel.send(`\n\nThe sentiment analysis showed: \n---\n${JSON.stringify(result, null, 2)}\n---`);
	} catch (e) { console.error(e); }

	if (adminRole) {
		//message.guild.members.cache.filter(member => console.log(member.roles.cache));
		const admins = message.guild.members.cache.filter(member => member.roles.cache.has(adminRole.id));
		//console.log(admins);
		admins.forEach(admin => {
			admin.send(`\n\n[${new Date().toLocaleString()}] Warning! User ${message.author.tag} [${message.member}] has sent an inappropriate message on [${message.channel.name}]`);
			const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
			admin.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
			admin.send(`\n\nThe sentiment analysis showed: \n---\n${JSON.stringify(result, null, 2)}\n---`);
		});
		return;
	}
	// }
}

function handleDictionary(message) {
	let badWords = [];
	try {
		const data = fs.readFileSync(path.join(__dirname, 'commands', 'wordDictionary', 'badDictionary.json'));
		badWords = JSON.parse(data);
	} catch (error) {
		console.error('Error loading bad words:', error);
	}
	console.log(`${message.author.tag} in #${message.channel.name} sent: ${message.content}`);
	const timestamp = new Date().toLocaleString();

	const containsBadWord = badWords.some(word => message.content.toLowerCase().includes(word.toLowerCase()));
	if (containsBadWord) {
		// Word from custom dictionary was found
		// Warn the admins that a member has sent a negative message on a server
		const adminRole = message.guild.roles.cache.find(role => role.name === 'admin');
		const isAdmin = message.member.roles.cache.has(adminRole?.id);

		try {
			const channel = message.guild.channels.cache.get(regServer.default['bot-emergency-id']);
			channel.send(`\n\n[${timestamp}] Warning! User ${message.author.tag} [${message.member}] has sent inappropriate message on [${message.channel.name}] based on custom dictionary.`);
			const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
			channel.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
		} catch (e) { console.error(e); }

		// ensure that admins are exempt from the message check
		if (isAdmin) { return; }
		if (adminRole) {
			const admins = message.guild.members.cache.filter(member => member.roles.cache.has(adminRole.id));
			// Wait 1 second for each message to be processed and sent to admins
			admins.forEach(admin => {
				admin.send(`\n\n[${timestamp}] Warning! User ${message.author.tag} [${message.member}] has sent inappropriate message on [${message.channel.name}] based on custom dictionary.`);
				const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
				admin.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
			});
			return;
		} else {
			console.error('Noone under admin role exists.')
			return;
		}
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
	await handleSuspiciousLinkOrFile(message);
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
	console.log(`New member has joined the server!: ${member}`);
	const regChannel = member.guild.channels.cache.find(channel => channel.id === regServer.default['get-access-id']);
	if (regChannel) {
		regChannel.send(`Welcome ${member} to University of Portsmouth Discord Server! Please read the rules and instructions in the #get-access channel to gain access to the server.\n- Type in this command to register yourself: /reg [Your Student ID] [Your first name] [Your last name]`);
	} else {
		console.error('Error: #get-access channel not found or is inaccessible.');
	}
});

client.login(token.default.token);