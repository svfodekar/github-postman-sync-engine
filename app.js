const readline = require('readline');
const TerminalOpn = require('./bin/terminalOperations');

//pkg package.json --targets node18-win-x64,node18-macos-x64,node18-linux-x64

// Create an interface for terminal input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'COMMAND > ' // Prompt displayed in the terminal
});


// Function to handle command execution
const processCommand = async (command) => {
    if (!command.trim()) {
        console.log('No command entered. Try again.');
        return;
    }

    switch (command.trim()) {
        case 'test':
            console.log("test"); // Display the test module's content
            break;
        case 'clear':
            TerminalOpn.showWelcomeMessage(); // Show welcome message after clearing
            break;

        case 'check config':
            TerminalOpn.showuserCredentials()
            break;
        case 'help':
            TerminalOpn.showHelp(); // Display available commands
            break;
        case 'configure':
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
