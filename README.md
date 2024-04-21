# ModBot

ModBot is an automated moderation bot designed for the University of Portsmouth Discord Server to tackle the manual work of solving or detecting problems within the server.

## Features

- **User Registration**: Allows new users to register by providing their student ID, first name, and last name. The bot automatically assigns them a nickname and role based on their registration information.
- **Sentiment Analysis**: Utilizes sentiment analysis to identify and flag negative messages for review by server administrators.
- **Custom Bad Word Filtering**: Automatically detects and filters out messages containing offensive language based on a customizable list of bad words.
- **Channel Management**: Provides commands to manage channels, including creating and deleting channels.

## Getting Started

To get started with ModBot, follow these steps:

1. **Clone the Repository**: Clone this repository to your local machine using the following command in terminal:
```git clone https://github.com/your-username/modbot.git```


2. **Install Dependencies**: Navigate to the project directory and install the required dependencies using npm:
    ```
      cd modbot
      npm i discord.js
      npm i sentiment.js
    ```

3. **Configure the Bot**:
- Create a `config.json` file in the project root directory and add your bot token:
  ```json
  {
    "clientId": "YOUR_BOT_ID",
    "guildId": "YOUR_SERVER_ID",
    "token": "YOUR_DISCORD_BOT_TOKEN"
  }
  ```
- Configure other settings such as role names, channel IDs, etc., as needed.

- Additionally, create a `channel-config.json` file in the `commands/registration` folder path and add your channel's token for registration:
  ```json
  {
    "get-access-id": "YOUR_SERVER_CHANNEL_TOKEN"
  }
  ```

4. **Run the Bot**: Start the bot by running the following command in terminal:
```npm start```


5. **(Optional) Deploy Slash Commands**: If you make changes to slash commands, you can deploy them using the following command in terminal:
```node deploy_commands.js```

  Do note that the command ```npm start``` already does that for you.


6. **Invite the Bot to Your Server**: Generate an invite link for your bot within developer's portal and add it to your Discord server with the necessary permissions.

## Usage

Once the bot is running and configured, users can interact with it using various commands:

- **/addword**: Add a word to the custom dictionary of bad words ('admin' role only).
- **/deleteword**: Remove a word from the custom dictionary of bad words ('admin' role only).
- **/reg**: Register your student information to access the server. (only new members within '#get-access' channel)

For detailed information on available commands and their usage, refer to the bot's help command or documentation.

## Support

If you encounter any issues or have questions about ModBot, feel free to open an issue on the GitHub repository.

## License

This project is licensed under the [ISC License](LICENSE).