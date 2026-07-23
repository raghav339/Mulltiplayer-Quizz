import {useState,useEffect,useRef} from "react";
import {Link} from "react-router-dom";

export default function Homepage()
{
    const [username,setUsername]=useState("");
    const [host,setHost]=useState("");
    const [message,setMessage]=useState("");
    const [roomID,setRoomID]=useState("");
    const [playerList,setPlayerList]=useState<string[]>([]);
    const [rooms,setRooms]=useState<string[]>([]);
    const joinedRoomRef = useRef("");
    const [questions,setQuestions]=useState([]);

    const [question,setQuestion]=useState("");
    const [option1,setOption1]=useState("");
    const [option2,setOption2]=useState("");
    const [option3,setOption3]=useState("");
    const [option4,setOption4]=useState("");
    const [correct,setCorrect]=useState<number>();

    const socketRef = useRef<WebSocket | null>(null);
    
    useEffect(()=>{
        socketRef.current=new WebSocket("ws://localhost:3000");
        socketRef.current.onmessage=(event)=>{
            const data=JSON.parse(event.data);
            if(data.event==="room-created")
            {
                setRoomID(data.roomID);
                joinedRoomRef.current = data.roomID;

            }
            else if(data.event==="player-update")
            {
                setPlayerList(data.players);
                setHost(data.host);
            }
            else if(data.event==="all-rooms")
            {
                setRooms(data.roomIDs);
            }
            else if(data.event==="game-started")
            {
                setMessage(`Game on room:${data.roomID} has started`);
                setQuestions(data.questions);
            }
            else if(data.event==="joined-room")
            {
                joinedRoomRef.current = data.roomID;

            }
            else if(data.event==="switched-room")
            {
                joinedRoomRef.current = data.roomID;

                setMessage("Switched room");

                setTimeout(() => {
                    setMessage("");
                }, 3000);
            }
            else if(data.event==="room-deleted")
            {
                if(data.roomID===joinedRoomRef.current)
                {
                    setPlayerList([]);
                    setHost("");
                    joinedRoomRef.current = "";

                }
                setMessage(data.message);
            }
            else if (data.event === "error") {
                setMessage(data.message);

                setTimeout(() => {
                    setMessage("");
                }, 3000);
            }
        }

        return () => {
        socketRef.current?.close();
        };

    },[]);

    function startGame()
    {
        socketRef.current?.send(
            JSON.stringify({
                event: "game-start",
                roomID:joinedRoomRef.current,
                username
            })
        );
    }

    function createRoom(username:string)
    {
        socketRef.current?.send(JSON.stringify({
            username,
            event:"room-create"
        }))
    }

    function joinRoom(username:string)
    {
        socketRef.current?.send(JSON.stringify({
            username,
            roomID:joinedRoomRef.current,
            event:"join-room"
        }))
    }

    function switchRoom()
    {
        socketRef.current?.send(JSON.stringify({
            event:"switch-room",
            roomID:joinedRoomRef.current,
            username
        }))
    }

    function postQuestion()
    {
        const ques={
            text:question,
            options:[option1,option2,option3,option4],
            answer:correct
        };

        socketRef.current?.send(JSON.stringify({
            event:"add-question",
            roomID:joinedRoomRef.current,
            username,
            question:ques
        }));

        setQuestion("");
        setOption1("");
        setOption2("");
        setOption3("");
        setOption4("");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-white flex items-center justify-center p-6">
            <div className="w-full max-w-3xl bg-gray-800 rounded-2xl shadow-xl p-8">

                <h1 className="text-4xl font-bold text-center mb-8">
                    Multiplayer Lobby
                </h1>

                <div className="flex justify-center gap-6 mb-8">
                    <Link
                        to="/signin"
                        className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                    >
                        Sign In
                    </Link>

                    <Link
                        to="/signup"
                        className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition"
                    >
                        Sign Up
                    </Link>

                    <Link
                        to="/logout"
                        className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition"
                    >
                        Logout
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-6">

                    <div className="bg-gray-700 p-6 rounded-xl">
                        <h2 className="text-2xl font-semibold mb-4">
                            Join / Create Room
                        </h2>

                        <input
                            placeholder="Enter Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 mb-4 rounded-lg bg-gray-900 border border-gray-600 outline-none focus:border-blue-500"
                        />

                        <input
                            placeholder="Enter Room ID"
                            value={roomID}
                            onChange={(e) => setRoomID(e.target.value)}
                            className="w-full p-3 mb-6 rounded-lg bg-gray-900 border border-gray-600 outline-none focus:border-blue-500"
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={() => createRoom(username)}
                                className="flex-1 rounded-xl bg-purple-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:hover:scale-100"
                            >
                                Create Room
                            </button>

                            <button
                                onClick={() => joinRoom( username)}
                                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:hover:scale-100"
                            >
                                Join Room
                            </button>
                             <button
                                onClick={() => switchRoom()}
                                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:hover:scale-100"
                            >
                                Switch Room
                            </button>
                        </div>

                        <button
                            onClick={startGame}
                            className="mt-4 w-full rounded-xl bg-green-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                            disabled={message==="Game has Started"}
                        >
                            🎮 Start Game
                        </button>
                    </div>
                    <div>
                        <input placeholder="enter question" value={question} onChange={(e)=>{setQuestion(e.target.value)}} />
                        <input placeholder="enter option1" value={option1} onChange={(e)=>{setOption1(e.target.value)}} />
                        <input placeholder="enter option2" value={option2} onChange={(e)=>{setOption2(e.target.value)}} />
                        <input placeholder="enter option3" value={option3} onChange={(e)=>{setOption3(e.target.value)}} />
                        <input placeholder="enter option4" value={option4} onChange={(e)=>{setOption4(e.target.value)}} />
                        <input placeholder="enter correct" value={correct} onChange={(e)=>{setCorrect(Number(e.target.value))}} />
                        <button onClick={postQuestion}>Post Question</button>
                    </div>
                    <div className="mb-4 rounded-lg border border-gray-600 bg-gray-900 p-3">
                        <span className="text-gray-400">Username:</span>

                        <span className="ml-2 font-bold text-green-400">
                            {username || "Not joined"}
                        </span>
                    </div>
                    <div className="rounded-2xl border border-gray-600 bg-gray-700 p-6 shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">
                            Current Room
                        </h2>

                        <p className="mb-4">
                            Room ID:
                            <span className="ml-2 font-bold text-yellow-400">
                                {joinedRoomRef.current || "None"}
                            </span>
                        </p>
                        <div className="mb-4 rounded-lg bg-gray-900 p-3">
                            <span className="text-gray-400">Host:</span>

                            <span className="ml-2 font-bold text-cyan-400">
                                {host || "None"}
                            </span>
                        </div>
                        <h3 className="font-semibold mb-2">
                            Players
                        </h3>

                        <ul className="space-y-2">
                            {playerList.map((player) => (
                               <li
                                    key={player}
                                    className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 transition hover:border-blue-500"
                                >
                                    <span>{player}</span>

                                    {player === host && (
                                        <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-black">
                                            HOST
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div>
                        {questions.map((ques)=>{
                            return(
                            <>
                                <p>{ques.text}</p>
                                
                            </>
                            )
                        })}
                </div>

                <div className="mt-8 bg-gray-700 p-6 rounded-xl">
                    <h2 className="text-2xl font-semibold mb-4">
                        Available Rooms
                    </h2>

                    {rooms.length === 0 ? (
                        <p className="text-gray-400">
                            No active rooms.
                        </p>
                    ) : (
                        <ul className="grid md:grid-cols-3 gap-3">
                            {rooms.map((room) => (
                                <li
                                    key={room}
                                    className="cursor-pointer rounded-xl border border-gray-700 bg-gray-900 p-4 text-center font-semibold shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-purple-500 hover:bg-gray-800"
                                >
                                    🏠 {room}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {message && (
                    <div className="mt-6 rounded-xl border border-blue-500 bg-blue-900/40 p-4 text-center font-medium text-blue-200 shadow-lg">
                        {message}
                    </div>
                )}

            </div>
        </div>
    );
}