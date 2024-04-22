// modules
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const Sentiment = require('sentiment');
const path = require('node:path');
const fs = require('node:fs');

// custom modules
const regServer = require('./commands/registration/channel-config.json');
const { token } = require('./config.json');

/** FUTURE CONSIDERATION TO INCLUDE IN THE REPORT
 *  add a dictionary as a separate file and allow the bot to check the words based on that,
 *  only if the sentiment.js would not be able to identify a bad word.
 * 	Allow the bot have commands that easily let admins add/edit/delete messages or channels. 
 */

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
const sentiment = new Sentiment();

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Once the bot is ready to run
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// When a member tries to type any message on the server
client.on('messageCreate', message => {
	const filePath = path.join(__dirname, 'commands', 'wordDictionary', 'badDictionary.json');
	let badWords = [];
	try {
		const data = fs.readFileSync(filePath);
		badWords = JSON.parse(data);
	} catch (error) {
		console.error('Error loading bad words:', error);
	}
	console.log(`${message.author.tag} in #${message.channel.name} sent: ${message.content}`);
	const timestamp = new Date().toLocaleString();

	// Ignore messages from the bot itself
	if (message.author.bot || !message.content) return;

	/*
	* first check if the message was sent anywhere BUT the '#get-access' channel
	* then check if the message was sent from unauthorised user (i.e. the user with 0 roles assigned)
	* which is the user who bypassed the registration stage
	*/
	if (message.channelId !== regServer['get-access-id']) {
		const rolesWithoutEveryone = message.member.roles.cache.filter(role => role.name !== '@everyone');
		if (!rolesWithoutEveryone.size > 0) {
			console.log(`${message.author.tag} is NOT part of any role, therefore will be deleted from the server.`);
			message.member.ban();
			console.log(`[${timestamp}] User ${message.author.tag} [${message.member}] has been banned from the server due to trying to communicate with 0 roles.`);

			// inform admins of bot's actions
			const adminRole = message.guild.roles.cache.find(role => role.name === 'admin');
			if (adminRole) {
				const admins = message.guild.members.cache.filter(member => member.roles.cache.has(adminRole.id));
				admins.forEach(admin => {
					admin.send(`[${timestamp}] User ${message.author.tag} [${message.member}] has been banned from the server due to trying to communicate with 0 roles.`);
				});
			} else {
				console.error('Noone under admin role exists.')
			}
			return;
		}
	}

	// Before sentiment analysis, check if a word exists in a custom dictionary
	const containsBadWord = badWords.some(word => message.content.toLowerCase().includes(word.toLowerCase()));
	if (containsBadWord) {
		// Word from custom dictionary was found
		// Warn the admins that a member has sent a negative message on a server
		const adminRole = message.guild.roles.cache.find(role => role.name === 'admin');
		const isAdmin = message.member.roles.cache.has(adminRole?.id);

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
	} else {
		// Perform sentiment analysis
		const result = sentiment.analyze(message.content);
		const sentimentType = result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral';
		if (sentimentType === 'negative') {
			const resultString = JSON.stringify(result, null, 2);
			// Warn the admins that a member has keft a negative message on a server
			const adminRole = message.guild.roles.cache.find(role => role.name === 'admin');
			const isAdmin = message.member.roles.cache.has(adminRole?.id);

			// ensure that admins are exempt from the message check
			if (isAdmin) { return; }
			if (adminRole) {
				const admins = message.guild.members.cache.filter(member => member.roles.cache.has(adminRole.id));
				// Wait 1 second for each message to be processed and sent to admins
				admins.forEach(admin => {
					admin.send(`\n\n[${timestamp}] Warning! User ${message.author.tag} [${message.member}] has sent inappropriate message on [${message.channel.name}]`);
				});
				admins.forEach(admin => {
					// Construct the link to the message
					const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
					admin.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
				});
				admins.forEach(admin => {
					admin.send(`\n\nThe sentimental analysis showed: \n---\n${resultString}\n---`);
				});
			} else {
				console.error('Noone under admin role exists.');
			}
		}
	}
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
	const regChannel = member.guild.channels.cache.find(channel => channel.id === regServer['get-access-id']);
	if (regChannel) {
		regChannel.send(`Welcome ${member} to University of Portsmouth Discord Server! Please read the rules and instructions in the #get-access channel to gain access to the server.\n- Type in this command to register yourself: /reg [Your Student ID] [Your first name] [Your last name]`);
	} else {
		console.error('Error: #get-access channel not found or is inaccessible.');
	}
});

client.login(token);