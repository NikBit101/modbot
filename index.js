// modules
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const Sentiment = require('sentiment');
const path = require('node:path');
const fs = require('node:fs');

// custom modules
const regServer = require('./commands/registration/channel-config.json');
const { token } = require('./config.json');

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

// Handle unauthorized user messages
function handleUnauthorizedUser(message) {
  // Ban unauthorized user and inform admins
  console.log(`${message.author.tag} is NOT part of any role, therefore will be deleted from the server.`);
  message.member.ban().then(() => {
    const timestamp = new Date().toLocaleString();
    console.log(`[${timestamp}] User ${message.author.tag} [${message.member}] has been banned from the server due to trying to communicate with 0 roles.`);
    // Inform admins
    const adminRole = message.guild.roles.cache.find(role => role.name === 'Server Admin');
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
	// Ignore messages from bots or empty messages
  if (message.author.bot || !message.content) return;

	/*
	* first check if the message was sent anywhere BUT the '#get-access' channel
	* then check if the message was sent from unauthorised user (i.e. the user with 0 roles assigned)
	* which is the user who bypassed the registration stage
	*/
	if (message.channelId !== regServer['get-access-id']) {
    const rolesWithoutEveryone = message.member.roles.cache.filter(role => role.name !== '@everyone');
    if (!rolesWithoutEveryone.size > 0) {
      handleUnauthorizedUser(message);
    }
  }
}

function handleNegativeSentiment(message, result) {
  // Warn admins about negative sentiment message
  const adminRole = message.guild.roles.cache.find(role => role.name === 'Server Admin');
  const isAdmin = message.member.roles.cache.has(adminRole?.id);

  // Ensure that admins are exempt from the message check
  if (!isAdmin) {
    const admins = message.guild.members.cache.filter(member => member.roles.cache.has(adminRole.id));
    admins.forEach(admin => {
      admin.send(`\n\n[${new Date().toLocaleString()}] Warning! User ${message.author.tag} [${message.member}] has sent an inappropriate message on [${message.channel.name}]`);
      const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
      admin.send(`\n\nMessage content: \n---\n${message.content} [${messageLink}]\n---`);
      admin.send(`\n\nThe sentiment analysis showed: \n---\n${JSON.stringify(result, null, 2)}\n---`);
    });
		return;
  }
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
		const adminRole = message.guild.roles.cache.find(role => role.name === 'Server Admin');
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
	}
}

function handleMessage(message) {
	// Ignore message from the bot or blank message
	if (message.author.bot || !message.content) return;

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


client.on('messageCreate', message => {
	handleMessage(message);
	handleUnauthorisedMessage(message);
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