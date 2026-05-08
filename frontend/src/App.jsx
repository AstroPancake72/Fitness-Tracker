import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState('login');

  return (
    <>
      {loggedIn ? (
        <div>
          <h1>Welcome to Fitness Tracker</h1>
          <p>You are logged in.</p>
        </div>
      ) : (
        page === 'login' ? (
          <Login onLogin={() => setLoggedIn(true)} onShowSignup={() => setPage('signup')} />
        ) : (
          <Signup onBack={() => setPage('login')} />
        )
      )}
    </>
  );
}

export default App;