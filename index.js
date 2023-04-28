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

var log = console.log;
function logWithSocket(message) {
    log(message);
    io.emit('message', `${new Date().toISOString()} Console: ${message}`);
}

console.log = logWithSocket;


// Create a socket.io server attached to the HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log(`Socket ${socket.id} connected`);
    console.log(evaluateCommand('pwd'));
});

console.log('Application started');

const PORT = process.env.PORT || "8080";
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

//Run a system command and return the result
async function evaluateCommand(command) {
    const { stdout, stderr } = await exec(command);
    if (stderr) {
        console.error(stderr);
        return;
    }
    console.log(stdout);
    return stdout;
}
