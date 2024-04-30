import { SlashCommandBuilder } from 'discord.js';
import { openDictionary, writeToDictionary, isAdmin } from './utils.mjs';

async function checkIfExists(interaction, wordsToCheck, wordToAdd) {
  if (wordsToCheck.includes(wordToAdd)) {
    await interaction.reply(`The word "${wordToAdd}" already exists in the custom dictionary.`);
    return true;
  }
  return false;
}

export const data = new SlashCommandBuilder()
  .setName('addword')
  .setDescription('Add a word to the custom dictionary of bad words.')
  .addStringOption(option =>
    option.setName('word')
      .setDescription('The word to add to the custom dictionary.')
      .setRequired(true));

export async function execute(interaction) {

  // First check if member typing the command has 'admin' role
  if (!isAdmin(interaction.member)) { return; }

  const wordToAdd = interaction.options.getString('word');
  let badWords = [];
  try {
    badWords = await openDictionary();
  } catch (e) {
    return await interaction.reply(`An error ocurred while loading the dictionary: ${e.message}`);
  }

  if (await checkIfExists(interaction, badWords, wordToAdd)) { return; }
  // Add the word to the array if it doesn't already exist within the dictionary
  badWords.push(wordToAdd);

  // Save the updated array to the dictionary
  try {
    await writeToDictionary(badWords);
    await interaction.reply(`The word "${wordToAdd}" has been added to the custom dictionary.`);
  } catch (e) {
    return await interaction.reply(`An error ocurred while writing to the dictionary: ${e.message}`);
  }
}