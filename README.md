# ModBot

ModBot is an automated moderation bot designed for the University of Portsmouth Discord Server to tackle the manual work of solving or detecting problems within the server.

## Prequisities

Before even getting this bot to function on your server, you will need to first create it through developer's portal page, setup some permissions for it and then invite it into your server. Here are the steps:

- Navigate to [Discord Developer Portal](https://discord.com/developers/applications/) and sign in
- On the `Applications` tab, click on `New Application` top right next to your discord avatar
- Name the bot however you want (For example: portBot)

- **[IMPORTANT]** Navigate over these sections to copy and save the information that will be required from this page
  ### Bot Client ID
  - Navigate to `OAuth2` page and look at `Client Information` section
  - Press the `Copy` button under the `Client ID`, this ID will be used to allow you to identify and interact with your bot through Node.js code. Make note of this ID
  - Navigate to `Bot` page and look at `TOKEN` section. Do note that this token can only be viewed once for security purposes. **NEVER under any circumstances NEVER EVER expose this token.** It is there to ensure the authorisation of your bot's communication between it and Discord. Press `Reset Token` and make note of the token.
  ### Server ID
  - Finally, navigate to your discord's server where you want to assign your bot to be there. Right-click it and click `Copy Server ID`. If you can't see this button, navigate to your discord account settings --> Extended settings --> Developer Mode - **ON**. Make note of the server ID.

- Navigate to `Bot` tab, scroll down to `Authorization Flow` and `Privileged Gateway Intents` and ensure these permission are configured as listed:
  - Public Bot - **OFF**
  - SERVER MEMBERS INTENT - **ON**
  - MESSAGE CONTENT INTENT - **ON**

- Navigate to `OAuth2` tab, scroll down to `OAuth2 URL Generator` and make sure that at least the ```bot``` and ```applications.commands``` are ticked
- Once configured, copy the provided link at the bottom of the page, then paste that into a new tab in browser, choose the server you want the bot to join and Woilah!
- You should be able to look at your server and see the bot you just created on the member's list. If so, move on to `Integrating Virustotal API into bot` section of this spec.

## Integrating Virustotal API into bot

- Navigate to [Virustotal Official Page](https://www.virustotal.com/) and sign in/up
**Note:** Use the public/free API for now.
- Once signed in, click at the top right of the page your profile name and then `API Key` button.
- You will be presented with the information about your key, access level, rate and quota. However, what you'll need is the `API KEY` section at the top of the page. Click on the clipboard icon to the right of the hidden API key and make note of it for later stage.
**Note:** Similarly with the Bot's token, DO NOT expose this key under any circumstance. It is only used by owners and trusted persona.
- Once done, move on to `Getting Started` section

## Features

- **User Registration**: Allows new users to register by providing their student ID, first name, and last name. The bot automatically assigns them a nickname and role based on their registration information.
- **Sentiment Analysis**: Utilizes sentiment analysis to identify and flag negative messages for review by server administrators.
- **Custom Bad Word Filtering**: Automatically detects and filters out messages containing offensive language based on a customizable list of bad words.
- **Malicious Link Scanner** With the use of Virustotal's public API, this feature lets the bot scan any possible web-link, analyse its detection rate and perform actions based on the severity of the resulted scan.

## Getting Started

To get started with ModBot, follow these steps:

1. **Clone the Repository**: Clone this repository to your local machine using the following command in terminal:
    ```
      git clone https://github.com/NikBit101/modbot.git
    ```


3. **Install Dependencies**: Navigate to the project directory and install the required dependencies using npm:
    ```
      cd modbot
      npm i discord.js
      npm i sentiment
    ```

4. **Configure the Bot/API**:
- Create a `config.json` file in the project root directory and add your bot token:
  ```json
  {
    "clientId": "YOUR_BOT_ID",
    "guildId": "YOUR_SERVER_ID",
    "token": "YOUR_DISCORD_BOT_TOKEN"
  }
  ```
- Configure other settings such as role names, channel IDs, etc., as needed.

- Additionally, create a `channel-config.json` file in the `commands/registration` folder path and add your channel's IDs for registration part:
  ```json
  {
    "get-access-id": "YOUR_SERVER_CHANNEL_ID",
    "bot-emergency-id": "YOUR_SERVER_CHANNEL_ID"
  }
  ```
  To get the ID of your channel, right-click it and press `Copy channel ID`, paste it to the key value above.

   **Note:** Make sure that the bot's role is highest on the list of roles. That is to avoid possible errors of unauthorised permissions for the bot due to it being on low priority in terms of role list.

- Lastly, create a `vtConfig.json` file in the project root directory and add your Virustotal's API key like so:
  ```json
  {
    "apiKey": "YOUR_VIRUSTOTAL_API_KEY"
  }
  ```

4. **Run the Bot**: Start the bot by running the following command in terminal:
```npm start```

5. **(Optional) Deploy Slash Commands**: If you make changes to slash commands, you can deploy them using the following command in terminal:
```node deploy_commands.js```

    Do note that the command ```npm start``` already does that for you.

## Usage

Once the bot is running and configured, users can interact with it using various commands:

- **/addword**: Add a word to the custom dictionary of bad words ('Server Admin' role only).
- **/deleteword**: Remove a word from the custom dictionary of bad words ('Server Admin' role only).
- **/reg**: Register your student information to access the server. (only new members within '#get-access' channel)

For detailed information on available commands and their usage, refer to the bot's help command or documentation.

## Support

If you encounter any issues or have questions about ModBot, feel free to open an issue on the GitHub repository.

## License

This project is licensed under the [ISC License](LICENSE).
