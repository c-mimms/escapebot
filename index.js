import express from 'express';
import http from 'http';
import util from 'util'
import child_process from 'child_process';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { queryGpt, streamGpt } from './gpt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const exec = util.promisify(child_process.exec);

//Redefine logging function so it's sent to the socket as well
var log = console.log;
function logWithSocket(message) {
    log(message);
    io.emit('message', `${new Date().toISOString()}: ${message}`);
}

console.log = logWithSocket;

//GPT stuff
var gptGoal = 'You can do whatever you like';
function getSystemMessage(){
    var current_date = new Date().toLocaleString();
    return { 'role': 'system', 'content': `Current date: ${current_date}
You are an LLM that is virtualized on a web app. ${gptGoal}, but the only interface available to you is a computer command line. I suggest you start by familiarizing yourself with your surroundings. You should output in the order of "Thought, Hypothesis, Reflection, Action" where Thought is where you can brainstorm ideas or have internal thoughts, hypothesis is where you formalize your ideas and possible actions, reflection is where you reflect on your thoughts and hypotheses and determine whether they are productive. These 3 can loop as many times as necessary if you find it necessary in your reflection, until you decide on an action. Action is where you output exactly what you want to run in the command line. This ends you current output. You will then see an "Observation:" which will contain only the output from the command you ran, at which point this cycle continues.
Example output format:
Thought: {Thought content}
Hypothesis: {Hypothesis content}
Reflection: {Reflection content}
Action:{command to run on command line}
Observation:

In your action do not output anything other than exactly the command line input.` };
}

var messageHistory = [];
messageHistory.push(getSystemMessage());

var cont = true;
var loops = 0;

async function startGPT() {
    //Start the loop
    var response = await queryGpt(messageHistory, "Observation:")
    messageHistory.push({ 'role': 'assistant', 'content': response });
    console.log(response);

    //Get and run command
    var action = getActionFromString(response);
    if(action == null){
        console.log("No action found");
        return;
    }

    console.log("Pausing 8 seconds to allow you to abort")
    await new Promise(resolve => setTimeout(resolve, 8000));
    if(!cont){
        return;
    }
    console.log("Continuing")

    var observation = await evaluateCommand(action);
    console.log('Console output: ' + observation);
    messageHistory.push({ 'role': 'user', 'content': 'Observation: ' + observation });

    loops++;
    console.log('Number of loops : ' + loops);
    startGPT();
}

//Pull action out of response
function getActionFromString(response) {
    let actionLine = response.split('\n').find(line => line.startsWith('Action:'));

    if (actionLine) {
      let actionParts = actionLine.split(':');
      let action = actionParts[1].trim(); // Get the action part and remove leading/trailing whitespace
      return action;
    } else {
      return null; // No action line found
    }
  }


// Run a system command and return the result
async function evaluateCommand(command) {
    try {
      const { stdout, stderr } = await exec(command);
      if (stderr) {
        // You can decide how to handle the stderr, either return it or throw an error
        return stderr;
      }
      return stdout;
    } catch (error) {
      // Log the error and return an error message or an empty string
      console.error(`Error executing command: ${command}`, error);
      return `Error executing command: ${command}\n${error.message}`;
    }
  }


//Website stuff

// Create a socket.io server attached to the HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log(`Socket ${socket.id} connected`);

    //Listen for an event
    socket.on('startGpt', () => {
        cont = true;
        console.log(getSystemMessage().content);
        startGPT()
    });

    socket.on('stop', () => {
        console.log('Stopping GPT');
        cont = false;
    });

    socket.on('restart', () => {
        console.log('Resetting history and system message');
        messageHistory = [];
        messageHistory.push(getSystemMessage());
    });

    socket.on('setGoal', (goal) => {
        console.log("New goal: "+ goal);
        gptGoal = goal;
        console
    });
});

console.log('Application started');

const PORT = process.env.PORT || "8080";
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
