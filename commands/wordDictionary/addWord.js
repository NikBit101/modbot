const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

/*// Initialize array of bad words
let badWords = [];

// Load bad words from the dictionary before adding new one
function loadBadWords() {
  const filePath = path.join(__dirname, 'badDictionary.json');
  try {
      badWords = JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
      console.error('Error loading bad words:', error);
  }
}
loadBadWords();
*/
module.exports = {
  data: new SlashCommandBuilder()
    .setName('addword')
    .setDescription('Add a word to the custom dictionary of bad words.')
    .addStringOption(option =>
      option.setName('word')
        .setDescription('The word to add to the custom dictionary.')
        .setRequired(true)),
  async execute(interaction) {

    // First check if member typing the command has 'admin' role
    if (!interaction.member.roles.cache.some(role => role.name === 'admin')) { return; }

    const wordToAdd = interaction.options.getString('word');

    const filePath = path.join(__dirname, 'badDictionary.json');
    let badWords = [];
    try {
      const data = fs.readFileSync(filePath);
      badWords = JSON.parse(data);
    } catch (error) {
      await interaction.reply('An error occurred while loading the custom dictionary.');
      return;
    }

    // Check if the word already exists in the array
    if (badWords.includes(wordToAdd)) {
      await interaction.reply(`The word "${wordToAdd}" already exists in the custom dictionary.`);
      return;
    }

    // Add the word to the array
    badWords.push(wordToAdd);

    // Save the updated array to the JSON file
    try {
      fs.writeFileSync(filePath, JSON.stringify(badWords, null, 4));
      await interaction.reply(`The word "${wordToAdd}" has been added to the custom dictionary.`);
    } catch (error) {
      console.error('Error adding word:', error);
      await interaction.reply('There was an error while adding the word to the custom dictionary.');
    }
  },
};