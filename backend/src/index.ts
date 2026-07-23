import express from "express";
import cors from "cors"; 
import authRoutes from "./routes/authRoutes.js";
import dns from 'dns';
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import { publisher, subscriber } from "./redis.js";

dns.setServers(['8.8.8.8', '1.1.1.1']);
const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173"
}));

app.use("/", authRoutes);

const server = app.listen(3000, () => {
    console.log("Server running on port 3000");
});

const wss = new WebSocketServer({ server });

function generateRoomId() {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}

interface CustomWebSocket extends WebSocket {
    username?: string;
    activeRoomID?: string;
    joinedRooms: Set<string>;
}

type SocketsMap = {
    [username: string]: CustomWebSocket;
};

interface Question {
    text: string;
    options: string[];
    answer: number;
}

const questions: Question[]=[];
const sockets: SocketsMap = {};
const clients = new Set<CustomWebSocket>();

async function sendRooms() {
    const roomIDs = await publisher.sMembers("roomIDs");
    const payload = JSON.stringify({ event: "all-rooms", roomIDs });

    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

async function sendPlayers(roomID: string) {
    const players = await publisher.sMembers(roomID);
    const host = await publisher.get(`host:${roomID}`);

    const payload = JSON.stringify({
        event: "player-update",
        host,
        players
    });

    players.forEach((player) => {
        const client = sockets[player];
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

async function gameStart(roomID: string) {
    const users = await publisher.sMembers(roomID);
    if (users.length === 0) return;

    const ques=await publisher.sMembers(`${roomID}:question`);
    const quest = ques.map(q => questions.find(que => que.text === q));

    const payload = JSON.stringify({ event: "game-started", roomID,questions:quest });

    users.forEach((user) => {
        const client = sockets[user];
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

async function deleted(roomID: string) {
    const users = await publisher.sMembers(roomID);
    if (users.length === 0) return;

    users.forEach((user) => {
        const client = sockets[user];
        if (client) {
            client.joinedRooms.delete(roomID);
            if (client.activeRoomID === roomID) {
                client.activeRoomID = "";
            }

            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    event: "room-deleted",
                    message: `Room ID: ${roomID} deleted`,
                    roomID
                }));
            }
        }
    });
}

async function displayScores(roomID:string)
{
    const scores=await publisher.zRange(`room:${roomID}:scores`,0,-1,{REV:true});
    const users=await publisher.sMembers(roomID);
    if (users.length === 0) return;

    users.forEach((user)=>{
        const client=sockets[user];
        if(client)
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    event: "leaderboard",
                    scores,
                    roomID
                }));
            }
    })
}

// Subscriber event router
subscriber.subscribe("room-events", async (message) => {
    try {
        const data = JSON.parse(message);
        if (data.event === "player-update") await sendPlayers(data.roomID);
        else if (data.event === "all-rooms") await sendRooms();
        else if (data.event === "game-started") await gameStart(data.roomID);
        else if (data.event === "room-deleted") await deleted(data.roomID);
        else if (data.event === "display-scores") await displayScores(data.roomID);
    } catch (err) {
        console.error("Error processing Redis pub/sub message:", err);
    }
});

wss.on("connection", async (socket: CustomWebSocket) => {
    socket.joinedRooms = new Set();
    clients.add(socket);

    // Initial sync
    const roomIDs = await publisher.sMembers("roomIDs");
    socket.send(JSON.stringify({ event: "all-rooms", roomIDs }));

    socket.on("message", async (msg) => {
        try {
            const data = JSON.parse(msg.toString());

            if (data.event === "room-create") {
                const hosts = await publisher.sMembers("hosts");
                if (hosts.includes(data.username)) {
                    return socket.send(JSON.stringify({
                        event: "error",
                        message: "Already host of a room"
                    }));
                }

                const roomID = generateRoomId();

                socket.username = data.username;
                sockets[data.username] = socket;

                await publisher.sAdd("roomIDs", roomID);
                await publisher.sAdd("hosts", data.username);
                await publisher.set(`host:${roomID}`, data.username);
                await publisher.sAdd(roomID, data.username);

                socket.activeRoomID = roomID;
                socket.joinedRooms.add(roomID);

                socket.send(JSON.stringify({ roomID, event: "room-created" }));

                await publisher.publish("room-events", JSON.stringify({ event: "player-update", roomID }));
                await publisher.publish("room-events", JSON.stringify({ event: "all-rooms" }));
            }

            else if (data.event === "join-room") {
                const users = await publisher.sMembers(data.roomID);
                if (users.length === 0) {
                    return socket.send(JSON.stringify({ event: "error", message: "Room does not exist" }));
                }

                if (socket.joinedRooms.has(data.roomID)) {
                    return socket.send(JSON.stringify({ event: "error", message: "Already joined this room" }));
                }

                socket.username = data.username;
                sockets[data.username] = socket;

                await publisher.sAdd(data.roomID, data.username);
                socket.activeRoomID = data.roomID;
                socket.joinedRooms.add(data.roomID);

                await publisher.zAdd(
                    `room:${data.roomID}:scores`,
                    {
                        score: 0,
                        value: data.username
                    }
                );

                socket.send(JSON.stringify({ event: "joined-room", roomID: data.roomID }));
                await publisher.publish("room-events", JSON.stringify({ event: "player-update", roomID: data.roomID }));
            }

            else if (data.event === "game-start") {
                const host = await publisher.get(`host:${data.roomID}`);
                if (host !== data.username) {
                    return socket.send(JSON.stringify({ event: "error", message: "Only host can start the game" }));
                }

                await publisher.publish("room-events", JSON.stringify({ event: "game-started", roomID: data.roomID }));
            }

            else if (data.event === "switch-room") {
                const users = await publisher.sMembers(data.roomID);
                if (!users.includes(data.username)) {
                    return socket.send(JSON.stringify({ event: "error", message: "Not joined in this room" }));
                }

                socket.activeRoomID = data.roomID;
                socket.send(JSON.stringify({ event: "switched-room", roomID: data.roomID }));
                await publisher.publish("room-events", JSON.stringify({ event: "player-update", roomID: data.roomID }));
            }

            else if(data.event==="add-question")
            {
                const host = await publisher.get(`host:${data.roomID}`);
                if (host !== data.username) {
                    return socket.send(JSON.stringify({ event: "error", message: "Only host can add questions" }));
                }
                questions.push(data.question);
                let flag=0;
                const qs=await publisher.sMembers(`${data.roomID}:question`);
                qs.forEach((q)=>{
                    if(q===data.question.text)
                    {
                        flag=1;
                        socket.send(JSON.stringify({ event: "error", message: "Question already exist" }));
                    }
                })
                if(flag===0)
                    await publisher.sAdd(`${data.roomID}:question`,data.question.text);
            }
            else if(data.event==="game-over")
            {
                await publisher.zIncrBy(`room:${data.roomID}:scores`, data.score, data.username);
                publisher.publish("room-events",JSON.stringify({
                    event:"display-scores",
                    roomID:data.roomID
                }));
            }
        } catch (err) {
            console.error("Failed to parse incoming WebSocket message:", err);
        }
    });

    socket.on("close", async () => {
        clients.delete(socket);

        if (socket.username) {
            delete sockets[socket.username];
        }

        // Clean up user's rooms
        for (const roomID of socket.joinedRooms) {
            const host = await publisher.get(`host:${roomID}`);

            if (socket.username && host === socket.username) {
                // Host left -> Delete entire room
                await publisher.publish("room-events", JSON.stringify({ event: "room-deleted", roomID }));
                await publisher.del(roomID);
                await publisher.del(`host:${roomID}`);
                await publisher.sRem("hosts", host);
                await publisher.sRem("roomIDs", roomID);
            } else if (socket.username) {
                // Regular player left
                await publisher.sRem(roomID, socket.username);
                await publisher.publish("room-events", JSON.stringify({ event: "player-update", roomID }));

                const remainingUsers = await publisher.sMembers(roomID);
                if (remainingUsers.length === 0) {
                    await publisher.del(roomID);
                    await publisher.sRem("roomIDs", roomID);
                }
            }
        }

        await publisher.publish("room-events", JSON.stringify({ event: "all-rooms" }));
    });
});

