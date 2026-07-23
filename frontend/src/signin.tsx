import {useState} from "react";
import "./App.css";
import {useNavigate} from 'react-router-dom';

export default function SignIn()
{
    const [username,setUsername]=useState("");
    const [password,setPassword]=useState("");
    const [message,setMessage]=useState("");
    const navigate=useNavigate();

    async function signin(){
        const res=await fetch("http://localhost:3000/signin",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                username,password
            })
        });

        const content=await res.json();
        setMessage(content.message);

        if(res.status===200)
        {
            localStorage.setItem("token",content.token)
            navigate("/");
        }
    }


   return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-96 bg-white p-8 rounded-2xl shadow-lg">
                <h1 className="text-3xl font-bold text-center mb-6">
                    Sign In
                </h1>

                <div className="flex flex-col gap-4">
                    <input
                        className="border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <input
                        className="border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                        onClick={signin}
                        className="bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
                    >
                        Sign In
                    </button>

                    <p className="text-center text-sm text-gray-600">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}