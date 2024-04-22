const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function checkIfExists(interaction, wordsToCheck, wordToAdd) {
  console.log(wordsToCheck.includes(wordToAdd));
  if (wordsToCheck.includes(wordToAdd)) {
    await interaction.reply(`The word "${wordToAdd}" already exists in the custom dictionary.`);
    return true;
  }
  return false;
}

async function openDictionary() {
  try {
    const dictPath = path.join(__dirname, 'badDictionary.json');
    const data = fs.readFileSync(dictPath);
    return JSON.parse(data);
  } catch (error) {
    await interaction.reply('An error occurred while loading the custom dictionary.');
    return;
  }
}

async function writeToDictionary(badArr) {
  try {
    const dictPath = path.join(__dirname, 'badDictionary.json');
    fs.writeFileSync(dictPath, JSON.stringify(badArr, null, 4));
  } catch (error) {
    console.error('Error adding word:', error);
    await interaction.reply('There was an error while adding the word to the custom dictionary.');
  }
}

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
    
    let badWords = [];
    try {
      badWords = await openDictionary();
    } catch (e) {
      return await interaction.reply(`An error ocurred while loading the dictionary: ${e.message}`);
    }

    // Add the word to the array if it doesn't already exist within the dictionary
    if (await checkIfExists(interaction, badWords, wordToAdd)) { return; }
    badWords.push(wordToAdd);

    // Save the updated array to the dictionary
    try {
      await writeToDictionary(badWords);
      await interaction.reply(`The word "${wordToAdd}" has been added to the custom dictionary.`);
    } catch (e) {
      return await interaction.reply(`An error ocurred while writing to the dictionary: ${e.message}`);
    }
  },
};