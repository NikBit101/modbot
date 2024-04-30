import { SlashCommandBuilder } from 'discord.js';
import { openDictionary, writeToDictionary, isAdmin } from './utils.mjs';

export const data = new SlashCommandBuilder()
  .setName('deleteword')
  .setDescription('Delete a word from the custom dictionary of bad words.')
  .addStringOption(option =>
    option.setName('word')
      .setDescription('The word to delete from the custom dictionary.')
      .setRequired(true));
export async function execute(interaction) {
  // First check if member typing the command has 'admin' role
  if (!isAdmin(interaction.member)) { return; }

  const wordToDelete = interaction.options.getString('word');

  try {
    let data = await openDictionary();
    // first check if the provided word actually exists within a dictionary.
    if (!data.includes(wordToDelete)) {
      await interaction.reply(`The word "${wordToDelete}" does not exist inside the custom dictionary.`);
      return;
    }
    // if it does exist, overwrite the dictionary with everything BUT the provided word
    data = data.filter(word => word !== wordToDelete);
    await writeToDictionary(data);

    await interaction.reply(`The word "${wordToDelete}" has been deleted from the custom dictionary.`);
  } catch (error) {
    console.error(error);
    await interaction.reply('There was an error while removing the word to the custom dictionary.');
  }
}