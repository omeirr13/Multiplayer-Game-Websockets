const http = require("http");
const express = require("express");
const websocketServer = require("websocket").server;

const app = express();

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
app.listen(8081, () => {
    console.log("Listening on http port", 8081);
});

const server = http.createServer((req, res) => {
    //establish tcp connection
    res.write("ok");
    res.end();
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log("I am listening on ", PORT);
});

const wsServer = new websocketServer({
    httpServer: server,
});

const clients = {};
const games = {};

//up until here we are not listening to a change of the request to upgrade that conneciton to websocket
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
        if(result.method === "create"){
            const clientId = result.clientId;
            const gameId = crypto.randomUUID();
            games[gameId] = {
                id: gameId,
                balls: 20,
                clients: []
            }

            const payload = {
                method: "create",
                game: games[gameId],
            };

            const conn = clients[clientId].connection;
            conn.send(JSON.stringify(payload))
        }
        else if(result.method === "join") {
            const gameId = result.gameId;
            const game = games[gameId];
            if(game.clients == 3){
                
            }
            const color = {0: "red", 1: "green", 2: "blue"}[game.clients.length];
            game.clients.push({
                clientId: result.clientId,
                color
            });
            const payload = {
                method: "join",
                game: game
            }

            game.clients.forEach((client)=>{
                const conn = clients[client.clientId].connection;
                conn.send(JSON.stringify(payload));
            })
        }
        else if(result.method === "play"){
            const game = games[result.gameId];
            const gameClients = game.clients;

            gameClients.forEach((client)=>{
                const conn = clients[client].connection;
                // conn.send()

            })

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
