const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deleteword')
    .setDescription('Delete a word from the custom dictionary of bad words.')
    .addStringOption(option =>
      option.setName('word')
        .setDescription('The word to delete from the custom dictionary.')
        .setRequired(true)),
  async execute(interaction) {
    // First check if member typing the command has 'admin' role
    if (!interaction.member.roles.cache.some(role => role.name === 'admin')) { return; }


    const wordToDelete = interaction.options.getString('word');
    const filePath = path.join(__dirname, 'badDictionary.json');


    try {
      let data = JSON.parse(fs.readFileSync(filePath));
      // first check if the provided word actually exists within a dictionary.
      if (!data.includes(wordToDelete)) {
        await interaction.reply(`The word "${wordToDelete}" does not exist inside the custom dictionary.`);
        return;
      }
      // if it does exist, overwrite the dictionary with everything BUT the provided word
      data = data.filter(word => word !== wordToDelete);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
      await interaction.reply(`The word "${wordToDelete}" has been deleted from the custom dictionary.`);
    } catch (error) {
      console.error(error);
      await interaction.reply('There was an error while removing the word to the custom dictionary.');
    }
  }
};