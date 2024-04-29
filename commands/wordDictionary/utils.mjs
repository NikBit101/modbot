import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

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

export function isAdmin(member) {
  return member.roles.cache.some(role => role.name === 'admin');
}