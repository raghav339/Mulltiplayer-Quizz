import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

interface Question {
    text: string;
    options: string[];
    answer: number;
}

interface ScoreEntry {
    username: string;
    score: number;
}

export default function Homepage() {
    const [username, setUsername] = useState("");
    const [host, setHost] = useState("");
    const [message, setMessage] = useState("");
    const [roomID, setRoomID] = useState("");
    const [playerList, setPlayerList] = useState<string[]>([]);
    const [rooms, setRooms] = useState<string[]>([]);
    const joinedRoomRef = useRef("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [gameStarted, setGameStarted] = useState(false);

    const [question, setQuestion] = useState("");
    const [option1, setOption1] = useState("");
    const [option2, setOption2] = useState("");
    const [option3, setOption3] = useState("");
    const [option4, setOption4] = useState("");
    const [correct, setCorrect] = useState<number | undefined>(undefined);

    // gameplay state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [scores, setScores] = useState<ScoreEntry[]>([]);

    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        socketRef.current = new WebSocket("ws://localhost:3000");
        socketRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.event === "room-created") {
                setRoomID(data.roomID);
                joinedRoomRef.current = data.roomID;
            }
            else if (data.event === "player-update") {
                // FIX: this fires for every room a user has joined, not just the
                // one they're currently viewing. Only apply it if it's for the
                // active room, so switching away doesn't get silently overwritten
                // by background updates from another joined room.
                if (data.roomID === undefined || data.roomID === joinedRoomRef.current) {
                    setPlayerList(data.players);
                    setHost(data.host);
                }
            }
            else if (data.event === "all-rooms") {
                setRooms(data.roomIDs);
            }
            else if (data.event === "game-started") {
                // FIX: previously applied unconditionally, so a quiz starting in
                // a different room you'd joined would hijack whatever room you
                // were actively viewing. Only load questions if it's your active room.
                if (data.roomID === joinedRoomRef.current) {
                    setMessage(`Game on room ${data.roomID} has started`);
                    setQuestions(data.questions);
                    setGameStarted(true);
                    setCurrentIndex(0);
                    setSelectedOption(null);
                    setAnswered(false);
                    setScores([]);
                } else {
                    setMessage(`Game started in room ${data.roomID} — switch to it to play`);
                    setTimeout(() => setMessage(""), 4000);
                }
            }
            else if (data.event === "joined-room") {
                joinedRoomRef.current = data.roomID;
                setMessage(`Joined room ${data.roomID}`);
                setTimeout(() => setMessage(""), 3000);
            }
            else if (data.event === "switched-room") {
                joinedRoomRef.current = data.roomID;
                // FIX: clear the previous room's quiz/leaderboard state — otherwise
                // switching rooms mid-quiz leaves the old room's questions and
                // scores on screen under the new room's context.
                setGameStarted(false);
                setQuestions([]);
                setCurrentIndex(0);
                setSelectedOption(null);
                setAnswered(false);
                setScores([]);
                setMessage("Switched room");
                setTimeout(() => setMessage(""), 3000);
            }
            else if (data.event === "room-deleted") {
                if (data.roomID === joinedRoomRef.current) {
                    setPlayerList([]);
                    setHost("");
                    joinedRoomRef.current = "";
                    setGameStarted(false);
                    setQuestions([]);
                }
                setMessage(data.message);
            }
            else if (data.event === "question-added") {
                setMessage(`Question added: ${data.question.text}`);
                setTimeout(() => setMessage(""), 2000);
            }
            else if (data.event === "leaderboard") {
                // FIX: same room-scoping issue — only show scores for the room
                // you're actually viewing, not any joined room's live scores.
                if (data.roomID === joinedRoomRef.current) {
                    setScores(data.scores);
                }
            }
            else if (data.event === "error") {
                setMessage(data.message);
                setTimeout(() => setMessage(""), 3000);
            }
        };

        return () => {
            socketRef.current?.close();
        };
    }, []);

    function startGame() {
        socketRef.current?.send(JSON.stringify({
            event: "game-start",
            roomID: joinedRoomRef.current,
            username
        }));
    }

    function createRoom() {
        if (!username.trim()) return setMessage("Enter a username first");
        socketRef.current?.send(JSON.stringify({
            username,
            event: "room-create"
        }));
    }

    function joinRoom() {
        if (!username.trim()) return setMessage("Enter a username first");
        if (!roomID.trim()) return setMessage("Enter a room ID first");
        // FIX: previously sent joinedRoomRef.current (empty until you're already
        // in a room). We want to join the room typed in the input.
        socketRef.current?.send(JSON.stringify({
            username,
            roomID,
            event: "join-room"
        }));
    }

    function switchRoom() {
        if (!roomID.trim()) return setMessage("Enter the room ID to switch to");
        // FIX: previously sent joinedRoomRef.current (your current room, a no-op).
        // Switching needs the target room typed into the input.
        socketRef.current?.send(JSON.stringify({
            event: "switch-room",
            roomID,
            username
        }));
    }

    function postQuestion() {
        if (!question.trim() || !option1.trim() || !option2.trim() || !option3.trim() || !option4.trim()) {
            return setMessage("Fill in the question and all 4 options");
        }
        if (correct === undefined || correct < 0 || correct > 3) {
            return setMessage("Correct answer must be 0, 1, 2, or 3");
        }

        const ques: Question = {
            text: question,
            options: [option1, option2, option3, option4],
            answer: correct
        };

        socketRef.current?.send(JSON.stringify({
            event: "add-question",
            roomID: joinedRoomRef.current,
            username,
            question: ques
        }));

        setQuestion("");
        setOption1("");
        setOption2("");
        setOption3("");
        setOption4("");
        setCorrect(undefined);
    }

    function submitAnswer(optionIndex: number) {
        if (answered) return;
        const currentQuestion = questions[currentIndex];
        if (!currentQuestion) return;

        setSelectedOption(optionIndex);
        setAnswered(true);

        const points = optionIndex === currentQuestion.answer ? 100 : 0;

        socketRef.current?.send(JSON.stringify({
            event: "game-over",
            roomID: joinedRoomRef.current,
            username,
            score: points
        }));
    }

    function nextQuestion() {
        setAnswered(false);
        setSelectedOption(null);
        setCurrentIndex((i) => i + 1);
    }

    const isHost = username === host;
    const currentQuestion = questions[currentIndex];
    const quizFinished = gameStarted && questions.length > 0 && currentIndex >= questions.length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-white p-6">
            <div className="mx-auto w-full max-w-5xl">

                <h1 className="text-4xl font-bold text-center mb-8 tracking-tight">
                    🎮 Multiplayer Quiz Lobby
                </h1>

                <div className="flex justify-center gap-4 mb-8">
                    <Link to="/signin" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition font-medium">
                        Sign In
                    </Link>
                    <Link to="/signup" className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition font-medium">
                        Sign Up
                    </Link>
                    <Link to="/logout" className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition font-medium">
                        Logout
                    </Link>
                </div>

                {message && (
                    <div className="mb-6 rounded-xl border border-blue-500 bg-blue-900/40 p-4 text-center font-medium text-blue-200 shadow-lg">
                        {message}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">

                    {/* Join / Create */}
                    <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                        <h2 className="text-2xl font-semibold mb-4">Join / Create Room</h2>

                        <input
                            placeholder="Enter Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 mb-4 rounded-lg bg-gray-900 border border-gray-600 outline-none focus:border-blue-500 transition"
                        />
                        <input
                            placeholder="Enter Room ID"
                            value={roomID}
                            onChange={(e) => setRoomID(e.target.value)}
                            className="w-full p-3 mb-6 rounded-lg bg-gray-900 border border-gray-600 outline-none focus:border-blue-500 transition"
                        />

                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={createRoom}
                                className="rounded-xl bg-purple-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:bg-purple-700"
                            >
                                Create
                            </button>
                            <button
                                onClick={joinRoom}
                                className="rounded-xl bg-blue-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:bg-blue-700"
                            >
                                Join
                            </button>
                            <button
                                onClick={switchRoom}
                                className="rounded-xl bg-indigo-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:bg-indigo-700"
                            >
                                Switch
                            </button>
                        </div>

                        {isHost && (
                            <button
                                onClick={startGame}
                                disabled={gameStarted}
                                className="mt-4 w-full rounded-xl bg-green-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:hover:scale-100"
                            >
                                🚀 Start Game
                            </button>
                        )}

                        <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900 p-3 flex items-center justify-between">
                            <span className="text-gray-400">Username:</span>
                            <span className="font-bold text-green-400">{username || "Not set"}</span>
                        </div>
                    </div>

                    {/* Current Room */}
                    <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                        <h2 className="text-2xl font-semibold mb-4">Current Room</h2>

                        <p className="mb-4">
                            Room ID:
                            <span className="ml-2 font-bold text-yellow-400">
                                {joinedRoomRef.current || "None"}
                            </span>
                        </p>

                        <div className="mb-4 rounded-lg bg-gray-900 p-3 flex items-center justify-between">
                            <span className="text-gray-400">Host:</span>
                            <span className="font-bold text-cyan-400">{host || "None"}</span>
                        </div>

                        <h3 className="font-semibold mb-2">Players</h3>
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                            {playerList.length === 0 && (
                                <p className="text-gray-500 text-sm">No players yet.</p>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Host-only: add questions before starting */}
                {isHost && !gameStarted && (
                    <div className="mt-6 bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                        <h2 className="text-2xl font-semibold mb-4">Add a Question</h2>
                        <input
                            placeholder="Question"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            className="w-full p-3 mb-3 rounded-lg bg-gray-900 border border-gray-600 outline-none focus:border-purple-500 transition"
                        />
                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                            {[
                                { val: option1, set: setOption1, label: "Option 1" },
                                { val: option2, set: setOption2, label: "Option 2" },
                                { val: option3, set: setOption3, label: "Option 3" },
                                { val: option4, set: setOption4, label: "Option 4" },
                            ].map((opt, i) => (
                                <input
                                    key={i}
                                    placeholder={opt.label}
                                    value={opt.val}
                                    onChange={(e) => opt.set(e.target.value)}
                                    className="p-3 rounded-lg bg-gray-900 border border-gray-600 outline-none focus:border-purple-500 transition"
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-gray-400">Correct option:</span>
                            {[0, 1, 2, 3].map((i) => (
                                <button
                                    key={i}
                                    onClick={() => setCorrect(i)}
                                    className={`w-9 h-9 rounded-full font-bold transition ${
                                        correct === i
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-900 border border-gray-600 text-gray-300 hover:border-green-500"
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={postQuestion}
                            className="w-full rounded-xl bg-purple-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-[1.01] hover:bg-purple-700"
                        >
                            Add Question
                        </button>
                    </div>
                )}

                {/* Gameplay */}
                {gameStarted && currentQuestion && !quizFinished && (
                    <div className="mt-6 bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-semibold">
                                Question {currentIndex + 1} of {questions.length}
                            </h2>
                        </div>

                        <p className="text-xl mb-6">{currentQuestion.text}</p>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            {currentQuestion.options.map((opt, i) => {
                                const isSelected = selectedOption === i;
                                const isCorrectOption = answered && i === currentQuestion.answer;
                                const isWrongSelection = answered && isSelected && i !== currentQuestion.answer;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => submitAnswer(i)}
                                        disabled={answered}
                                        className={`p-4 rounded-xl border text-left font-medium transition-all duration-200
                                            ${isCorrectOption ? "bg-green-600 border-green-400" : ""}
                                            ${isWrongSelection ? "bg-red-600 border-red-400" : ""}
                                            ${!answered ? "bg-gray-900 border-gray-600 hover:border-blue-500 hover:scale-[1.02]" : ""}
                                            ${answered && !isSelected && !isCorrectOption ? "bg-gray-900 border-gray-700 opacity-60" : ""}
                                            disabled:cursor-not-allowed
                                        `}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>

                        {answered && (
                            <button
                                onClick={nextQuestion}
                                className="w-full rounded-xl bg-blue-600 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-[1.01] hover:bg-blue-700"
                            >
                                {currentIndex + 1 < questions.length ? "Next Question →" : "See Final Scores →"}
                            </button>
                        )}
                    </div>
                )}

                {quizFinished && (
                    <div className="mt-6 bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700 text-center">
                        <h2 className="text-2xl font-semibold mb-2">🏁 Quiz Complete</h2>
                        <p className="text-gray-400">Check the leaderboard below.</p>
                    </div>
                )}

                {/* Leaderboard */}
                {scores.length > 0 && (
                    <div className="mt-6 bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                        <h2 className="text-2xl font-semibold mb-4">🏆 Leaderboard</h2>
                        <ul className="space-y-2">
                            {scores.map((s, i) => (
                                <li
                                    key={s.username}
                                    className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900 px-4 py-3"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="text-gray-500 font-mono w-6">#{i + 1}</span>
                                        <span className={s.username === username ? "text-green-400 font-semibold" : ""}>
                                            {s.username}
                                        </span>
                                    </span>
                                    <span className="font-bold text-yellow-400">{s.score} pts</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Available Rooms */}
                <div className="mt-6 bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4">Available Rooms</h2>
                    {rooms.length === 0 ? (
                        <p className="text-gray-400">No active rooms.</p>
                    ) : (
                        <ul className="grid md:grid-cols-3 gap-3">
                            {rooms.map((room) => (
                                <li
                                    key={room}
                                    onClick={() => setRoomID(room)}
                                    className="cursor-pointer rounded-xl border border-gray-700 bg-gray-900 p-4 text-center font-semibold shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-purple-500 hover:bg-gray-800"
                                >
                                    🏠 {room}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>
        </div>
    );
}