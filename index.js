const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const regServer = require('./commands/registration/channel-config.json');
const Sentiment = require('sentiment');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
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

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on('messageCreate', message => {
	console.log(`${message.author.tag} in #${message.channel.name} sent: ${message.content}`);
	
	// Ignore messages from the bot itself
	if (message.author.bot) return;
	console.log(message.guild.members.fetch('896492823669522503'));
	/*
	* first check if the message was sent anywhere BUT the '#get-access' channel
	* then check if the message was sent from unauthorised user (i.e. the user with 0 roles assigned)
	* which is the user who bypassed the registration stage
	*/
	if (message.channelId !== regServer['get-access-id']) {
		const rolesWithoutEveryone = message.member.roles.cache.filter(role => role.name !== '@everyone');
		if (!rolesWithoutEveryone.size > 0) {
			console.log(`${message.author.tag} is NOT part of any role, therefore will be deleted from the server.`);
			const timestamp = new Date().toLocaleString();
			//message.member.ban();
			//console.log(`[${timestamp}] User ${message.author.tag} [${message.member}] has been banned from the server due to trying to communicate with 0 roles.`);
			
			// inform admins of its actions
			/*const adminRole = message.guild.roles.cache.find(role => role.name === 'admin'); // Replace 'Admin' with the name of your admin role
                    if (adminRole) {
                        const admins = adminRole.members;
                        admins.forEach(admin => {*/
												message.guild.members.fetch('896492823669522503')
												.then(adminManage => {
													const ad = adminManage.get('896492823669522503');
													if (ad){ 
														ad.send(`[${timestamp}] User ${message.member.user.tag} has been kicked from the server.`);
													}
													//);
													else {
														console.error("Admin role not found.");
													}
												})
			return;
		}
	}

	// Perform sentiment analysis
	const result = sentiment.analyze(message.content);
	const sentimentType = result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral';
	console.log(result);

	// Respond based on sentiment
	message.channel.send(`The sentiment of the message is ${sentimentType}.`);
});

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


client.login(token);