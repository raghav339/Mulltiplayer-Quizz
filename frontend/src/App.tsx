import './App.css'
import { BrowserRouter,Routes,Route } from 'react-router-dom';
import SignIn from "./signin.tsx";
import SignUp from "./signup.tsx";
import Logout from "./logout.tsx";
import Homepage from "./homepage.tsx";


function App() {
  return (
   <>
    <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn/>} />
          <Route path="/signup" element={<SignUp/>} />
          <Route path="/" element={<Homepage/>} />
          <Route path="/logout" element={<Logout/>} />
        </Routes>
    </BrowserRouter>
   </>
  );
}

export default App;

