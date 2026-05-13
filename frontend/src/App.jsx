import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Workouts from "./pages/Workouts";
import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState('login');

  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch("http://localhost:5000/api/me", {
          credentials: "include",
        });

        if (response.ok) {
          setLoggedIn(true);
        }
      } catch (error) {
        console.error(error);
      }
    }

    checkLogin();
  }, []); 

  return (
    <>
      {loggedIn ? (
        <div>
          <nav style={{ display: 'flex', gap: 12, padding: 12, justifyContent: 'center' }}>
            <button onClick={() => setPage('workouts')} className="counter">Workouts</button>
            <button onClick={() => { setLoggedIn(false); setPage('login'); }} className="counter">Logout</button>
          </nav>

          {page === 'workouts' ? (
            <Workouts />
          ) : (
            <div style={{ padding: 24 }}>
              <h1>Welcome to Fitness Tracker</h1>
              <p>You are logged in.</p>
            </div>
          )}
        </div>
      ) : (
        page === 'login' ? (
          <Login onLogin={() => { setLoggedIn(true); setPage('workouts'); }} onShowSignup={() => setPage('signup')} />
        ) : (
          <Signup onBack={() => setPage('login')} />
        )
      )}
    </>
  );
}

export default App;