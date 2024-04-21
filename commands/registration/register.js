const { SlashCommandBuilder } = require('discord.js');
const db = require('./database.json');
const channelID = require('./channel-config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reg')
		.setDescription('Register your student information to access the server.')
		.addIntegerOption(option =>
			option.setName('student_id')
				.setDescription('Your student ID')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('firstname')
				.setDescription('Your first name')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('surname')
				.setDescription('Your Last name')
				.setRequired(true)),
	async execute(interaction) {
		// Check if the command was typed in only from 'get-access' channel
		if (interaction.channelId != channelID['get-access-id']) { return; }

		const student_id = interaction.options.getInteger('student_id');
		const firstname = interaction.options.getString('firstname');
		const surname = interaction.options.getString('surname');
		const student = db.students.find(student => student.student_id === student_id);
		if (!student) {
			return await interaction.reply('Invalid UP number. Please check your information and try again.');
		}

		if (student.student_name.toLowerCase() !== firstname.toLowerCase() || student.student_surname.toLowerCase() !== surname.toLowerCase()) {
			return await interaction.reply('Name and UP numbers are mismatched.');
		}

		// Make sure there is no duplicated up numbers and/or name
		const guild = interaction.guild;
		await guild.members.fetch();
		const existingMember = guild.members.cache.find(member => {
			const memberNickname = member.nickname ? member.nickname.toLowerCase() : null;
			if (memberNickname !== null) {
				return memberNickname === `${firstname.toLowerCase()} ${surname.toLowerCase().charAt(0)} / up${student_id}`;
			}
		});

		if (existingMember) {
			return await interaction.reply('A member with the same student number or name already exists.');
		}

		// Construct the new nickname
		const newNickname = `${student.student_name} ${student.student_surname.charAt(0)} / up${student.student_id}`;

		const role = interaction.guild.roles.cache.find(role => role.name === 'student');
		if (!role) {
			return await interaction.reply('The "student" role does not exist.');
		}

		// Change user's nickname and assign the role
		try {
			await interaction.member.setNickname(newNickname);
			await interaction.member.roles.add(role);
		} catch (error) {
			console.error('Failed to update nickname or assign the role: ', error);
			await interaction.reply('Failed to update nickname or assign the role.');
			return;
		}

		await interaction.reply('Registration successful!');
	},
};
