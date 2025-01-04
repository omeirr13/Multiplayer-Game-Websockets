const http = require("http");
const express = require("express");
const websocketServer = require("websocket").server;

const app = express();

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
app.listen(8081,'0.0.0.0', () => {
    console.log("Listening on http port", 8081);
});

const server = http.createServer((req, res) => {
    //establish tcp connection
    res.write("ok");
    res.end();
});

const PORT = 8080;
server.listen(PORT,'0.0.0.0', () => {
    console.log("I am listening on ", PORT);
});

const wsServer = new websocketServer({
    httpServer: server,
});

const clients = {};
const games = {};
let scoreBoard = {};
//up until here we are not listening to a change of the request to upgrade that conneciton to websocket

let playing = false;
wsServer.on("request", (request) => {
    //will trigger whenever client attempts to establish a tcp connection
    const connection = request.accept(null, request.origin); //this will update the HTTP connection to WebSocket connection, a bidirectional full duplex TCP connection
    //connection represents active web socket connection, we can send message to client, receive messages from the client, and close the connection with it.

    connection.on("open", () => {
        console.log("opened!!!");
    });
    connection.on("close", () => {
        console.log("closed!!!");
    });
    connection.on("message", (message) => {
        const result = JSON.parse(message.utf8Data); //this might fail if we didnt send json.

        if (result.method === "create") {
            const clientId = result.clientId;
            const gameId = crypto.randomUUID();
            games[gameId] = {
                id: gameId,
                balls: 20,
                clients: [],
                state: {},
            };
            clients[clientId] = {
                ...clients[clientId],
            }

            const payload = {
                method: "create",
                game: games[gameId],
            };

            const conn = clients[clientId].connection;
            conn.send(JSON.stringify(payload));
        } else if (result.method === "join") {
            const gameId = result.gameId;
            const game = games[gameId];
            if (game.clients.length == 2) {
                return;
            }
            const color = { 0: "red", 1: "green", 2: "blue" }[
                game.clients.length
            ];

            game.clients.push({
                playerNo: game.clients.length + 1,
                clientId: result.clientId,
                color
            });
            
            scoreBoard = {
                ...scoreBoard,
                [color]: {player: game.clients.length, score: 0, clientId}
            }
            clients[clientId] = {
                ...clients[clientId],
            }
            if (game.clients.length === 2) {
                playing = true;
                updateGameState();
            }
            const payload = {
                method: "join",
                game: game,
            };

            game.clients.forEach((client) => {
                const conn = clients[client.clientId].connection;
                conn.send(JSON.stringify(payload));
            });
        } else if (result.method === "play") {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const ballId = result.ballId;
            const color = result.color;

            const game = games[gameId];
            if (!game.hasOwnProperty("state")) {
                game.state = {};
            }
            let prevColor = game.state[ballId];
            if(prevColor && scoreBoard[prevColor].client !== clientId){
                scoreBoard[prevColor].score -= 1;
            }
            scoreBoard[color].score += 1;
            game.state[ballId] = color;
            games[gameId] = game; //this will happen often, so we dont send here..

            if(scoreBoard[color].score === 20){
                playing = false;
                let message = `Player ${scoreBoard[color].player}(${color}) won the game!!! Congratulations!`;
                const payload = {
                    method: "won",
                    message
                }
                game.clients.forEach((client)=>{
                    clients[client.clientId].connection.send(JSON.stringify(payload));
                })
            }
        }
    });

    //generate a client id
    const clientId = crypto.randomUUID();
    clients[clientId] = {
        connection,
    };

    const payload = {
        method: "connect",
        clientId: clientId,
    };

    //send back the client connect
    connection.send(JSON.stringify(payload));
});

function updateGameState() {
    const payload = {
        method: "update",
    };
    for (const g of Object.keys(games)) {
        let game = games[g];
        game.clients.forEach((client) => {
            clients[client.clientId].connection.send(
                JSON.stringify({ ...payload, game })
            );
        });
    }

    // for(const c of Object.keys(clients)){
    //     const client = clients[c];
    //     console.log(client.score, client.color);
    // }
    if(playing) {
        setTimeout(updateGameState, 500);
    }
}
