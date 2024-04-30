import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

// This modular function will attempt to open 'badDictionary.json' and parse the data back in JSON format
export async function openDictionary() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dictPath = path.join(__dirname, 'badDictionary.json');
    const data = fs.readFileSync(dictPath);
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error opening dictionary: ${error}`);
    await interaction.reply('An error occurred while loading the custom dictionary.');
    return;
  }
}

// This modular function will attempt to write the contents from 'badArr' parameter into 'badDictionary.json' 
export async function writeToDictionary(badArr) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dictPath = path.join(__dirname, 'badDictionary.json');
    fs.writeFileSync(dictPath, JSON.stringify(badArr, null, 4));
  } catch (error) {
    console.error('Error writing to dictionary:', error);
    await interaction.reply('There was an error while adding the word to the custom dictionary.');
  }
}

// This modular function checks if the provided 'member' parameter contains an 'admin' role
export function isAdmin(member) {
  return member.roles.cache.some(role => role.name === 'admin');
}