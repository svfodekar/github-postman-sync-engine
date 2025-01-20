const fs = require('fs');
const path = require('path');
const apiOperations = require('./apiOperations');

// Path to the configuration file
const configFilePath = 'git-postman-sync-config.json'

// Object to store user credentials
let userCredentials = { POSTMAN_API_KEY: '', GITHUB_REPO: '', GITHUB_USERNAME: '', GITHUB_TOKEN: '' };

// Function to load credentials from the configuration file
async function loadCredentials(rl = {}) {
    if (fs.existsSync(configFilePath)) {
        const data = fs.readFileSync(configFilePath, 'utf8');
        try {
            const config = JSON.parse(data);
            // Check if the keys are empty, if so, proceed with configuration
            if (config.GITHUB_TOKEN && config.POSTMAN_API_KEY && config.GITHUB_USERNAME && config.GITHUB_REPO) {
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
// Function to handle user configuration (Git and Postman API keys)
async function configureUser(rl = {}) {
    // Helper to get user input with validation
    const getInput = (promptMessage, errorMessage) => {
        return new Promise((resolve) => {
            rl.question(promptMessage, (input) => {
                if (!input.trim()) {
                    console.log(errorMessage);
                    return resolve(getInput(promptMessage, errorMessage)); // Recursive call for invalid input
                }
                resolve(input.trim());
            });
        });
    };

    try {
        // Get user inputs sequentially
        const gitRepo = await getInput(
            'Enter your Git Repository name: ',
            'Git Repository name cannot be empty. Please try again.'
        );
        const gitUsername = await getInput(
            'Enter your Git username: ',
            'Git username cannot be empty. Please try again.'
        );
        const gitToken = await getInput(
            'Enter your Git API token: ',
            'Git API Token cannot be empty. Please try again.'
        );
        const postmanToken = await getInput(
            'Enter your Postman API key: ',
            'Postman API key cannot be empty. Please try again.'
        );

        // Store credentials
        userCredentials = {
            GITHUB_REPO: gitRepo,
            GITHUB_USERNAME: gitUsername,
            GITHUB_TOKEN: gitToken,
            POSTMAN_API_KEY: postmanToken,
        };
        console.log(userCredentials);
        await saveCredentials(userCredentials); // Save credentials to the config file
        console.log('Credentials stored successfully.');
    } catch (error) {
        console.error('An error occurred during configuration:', error.message);
    } finally {
        rl.prompt(); // Prompt for the next command
    }
}


// Function to display welcome message
async function showWelcomeMessage() {
    console.clear();
    console.log("\n----------------------- * Git Postman SyncUp Engine * -------------------------\n");
};

async function showuserCredentials() {
    console.log(userCredentials);
}

// Function to display available commands
async function showHelp() {
    console.log(`
    Available Commands:
    - add config
    - check config
    - git pull <branch-name>
    - git pull hard <branch-name>
    - git push <base-branch> <existing/new-branch-name> "<message>"
    - clear: Clears the terminal screen
    - help
    - exit
    `);
};

async function pullFromGithub(branchName) {
    try {
        if (!branchName || branchName.split(' ').length > 1) {
            console.log('Invalid command! \nCorrect usage: git pull <branch-name>\n');
            return;
        }
        await apiOperations.pullFromGithub(userCredentials, branchName)
        console.log(`Succssfully pulled the all collections from the branch: ${branchName}\n`);
    } catch (e) {
        console.log(`Error while pulling from branch : ${branchName}\n${e}\n`)
    }
}


async function pullHardFromGithub(branchName) {
    try {
        if (!branchName || branchName.split(' ').length > 1) {
            console.log('Invalid command! \nCorrect usage: git pull hard <branch-name>\n');
            return;
        }
        await apiOperations.hardPullPostmanCollections(userCredentials, branchName)
        console.log(`Succssfully hard pulled the all collections from the branch: ${branchName}\n`);
    } catch (e) {
        console.log(`Error while pulling from branch : ${branchName}\n${e.message}\n`)
    }
}

async function pushOnGithub(commandParams) {
    let newBranch, destinationBranch, commitMsg = '';
    try {
        const split = commandParams.split(' ');
        destinationBranch = split?.[0];
        newBranch = split?.[1];
        split?.forEach((str, idx) => { if (idx > 1) commitMsg += " " + str; });
        commitMsg = commitMsg.trim();

        if (!destinationBranch || !newBranch || !commitMsg || !commitMsg.startsWith('"') || !commitMsg.endsWith('"')) {
            console.log('Invalid command! \nCorrect usage: git push <base-branch> <existing/new-branch-name> "<message>"\n');
            return;
        }
        commitMsg = commitMsg.slice(1, commitMsg.length - 1); 

        await apiOperations.pushOnGithub(userCredentials, newBranch, destinationBranch, commitMsg);

    } catch (e) {
        console.log(`Error while pushing to branch: ${destinationBranch}\n${e.message}\n`);
    }
}

module.exports =
{
    pullHardFromGithub,
    pushOnGithub,
    pullFromGithub,
    saveCredentials,
    loadCredentials,
    configureUser,
    showWelcomeMessage,
    showHelp,
    showuserCredentials
} 
