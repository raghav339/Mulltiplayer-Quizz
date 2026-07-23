import { Link } from "react-router-dom";
import {useEffect} from 'react';

export default function Logout()
{
    useEffect(() => {
        localStorage.clear();
    }, []);
    return(
        <>
            <h1 style={{textAlign:"center"}}>LogOut!</h1>
            <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
                <Link to="/signin">Signin</Link>
                <Link to="/signup">Signup</Link>
                <Link to="/">Homepage</Link>
            </div>
        </>
    )
}