const fs = require('fs');
const path = require('path');

// Path to the configuration file
const configFilePath = 'git-postman-sync-config.json'

// Object to store user credentials
let userCredentials = { gitApiKey: '', postmanApiKey: '' };

// Function to load credentials from the configuration file
async function loadCredentials(rl = {}) {
    if (fs.existsSync(configFilePath)) {
        const data = fs.readFileSync(configFilePath, 'utf8');
        try {
            const config = JSON.parse(data);
            // Check if the keys are empty, if so, proceed with configuration
            if (config.gitApiKey && config.postmanApiKey) {
                userCredentials = config; // Set the credentials if valid
            } else {
                console.log('Credentials are missing or empty. Please configure them.');
                rl.prompt(); // Show prompt and run configure
                return configureUser(rl); // Run the configure command
            }
        } catch (err) {
            console.log('Error reading or parsing the config file:', err);
            rl.prompt();
            return configureUser(rl); // If there is an error with the file, configure again
        }
    } else {
        console.log('Config file not found. Please configure your credentials.');
        rl.prompt();
        return configureUser(rl); // If file doesn't exist, prompt for credentials
    }
};

// Function to save credentials to the configuration file
async function saveCredentials() {
    fs.writeFileSync(configFilePath, JSON.stringify(userCredentials, null, 2), 'utf8');
};

// Function to handle user configuration (Git and Postman API keys)
async function configureUser(rl = {}) {
    rl.question('Enter your Git API key: ', (gitApiKey) => {
        if (!gitApiKey.trim()) {
            console.log('Git API key cannot be empty. Please try again.');
            return configureUser(rl); // Prompt again for Git API key if input is empty
        }
        userCredentials.gitApiKey = gitApiKey;

        rl.question('Enter your Postman API key: ', (postmanApiKey) => {
            if (!postmanApiKey.trim()) {
                console.log('Postman API key cannot be empty. Please try again.');
                return configureUser(rl); // Prompt again for Postman API key if input is empty
            }
            userCredentials.postmanApiKey = postmanApiKey; // Storing API keys
            saveCredentials(); // Save credentials to the config file
            console.log(`Credentials stored successfully.`);
            rl.prompt(); // Prompt for the next command
        });
    });
};

// Function to display welcome message
async function showWelcomeMessage() {
    console.clear();
    console.log("\n------------- * Git Postman SyncUp Engine * -------------\n");
};

async function showuserCredentials() {
    console.log(userCredentials);
}

// Function to display available commands
async function showHelp() {
    console.log(`
    Available Commands:
    - async: test of async opn.
    - test: Displays the content of the test module.
    - time: Displays the current date and time.
    - clear: Clears the terminal screen.
    - help: Displays this help message.
    - exit: Exits the application (with confirmation).
    - configure: Configures the username and password.
    - check config
    `);
};


module.exports = { saveCredentials, loadCredentials, configureUser, showWelcomeMessage, showHelp, showuserCredentials } 