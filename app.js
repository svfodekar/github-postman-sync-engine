const readline = require('readline');
const TerminalOpn = require('./bin/terminalOperations');

//COMMAN TO CREATE EXE - pkg . --targets node18-win-x64,node18-macos-x64,node18-linux-x64

// Create an interface for terminal input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'COMMAND > ' // Prompt displayed in the terminal
});


// Function to handle command execution
const processCommand = async (command) => {
    let commandParams = '';
    if (!command.trim()) {
        console.log('No command entered. Try again.');
        return;
    }
    else if (command.startsWith('git pull hard')) {
        commandParams = (command.replace('git pull hard', '') || '').trim();
        command = 'git pull hard';
    }
    else if (command.startsWith('git pull')) {
        commandParams = (command.replace('git pull', '') || '').trim();
        command = 'git pull';
    }
    else if (command.startsWith('git push')) {
        commandParams = (command.replace('git push', '') || '').trim();
        command = 'git push';
    }

    switch (command.trim()) {
        case 'clear':
            TerminalOpn.showWelcomeMessage(); // Show welcome message after clearing
            break;
        case 'git pull':
            console.log('Processing...')
            await TerminalOpn.pullFromGithub(commandParams); // Pass the branch name to the function
            break;
        case 'git pull hard':
            console.log('Processing...')
            await TerminalOpn.pullHardFromGithub(commandParams); // Pass the branch name to the function
            break;
        case 'git push':
            console.log('Processing...')
            await TerminalOpn.pushOnGithub(commandParams); 
            break;
        case 'check config':
            TerminalOpn.showuserCredentials()
            break;
        case 'help':
            TerminalOpn.showHelp(); // Display available commands
            break;
        case 'add config':
            TerminalOpn.configureUser(rl); // Start the configuration for API keys
            break;
        case 'exit':
            rl.question('Are you sure you want to exit? (y/n) ', (answer) => {
                if (answer.toLowerCase() === 'y') {
                    console.log('See you soon !!!');
                    rl.close();
                    process.exit(0);
                } else {
                    console.log('Continuing the session...');
                    rl.prompt();
                }
            });
            break;

        default:
            console.log(`Unknown command: "${command}". Type 'help' for a list of commands.`);
            break;
    }
};


// Start the terminal 
TerminalOpn.showWelcomeMessage(); // Show the welcome message when the app starts
TerminalOpn.loadCredentials(rl); // Load saved credentials from file
rl.prompt();


rl.on('line', async (line) => {
    await processCommand(line); // Process the command
    rl.prompt(); // Prompt for the next command
}).on('close', () => {
    console.log('Exiting application...');
    process.exit(0);
});
