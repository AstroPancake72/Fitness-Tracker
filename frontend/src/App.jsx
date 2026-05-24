import { useState, useEffect } from 'react'
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Workouts from "./pages/Workouts";
import "./App.css";
import Profile from "./pages/Profile";
import History from './pages/History';
import Connect from './pages/Connect';
import Messages, { disconnectSocket } from './pages/Messages';
 
function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState('login');
  const [openMessageUserId, setOpenMessageUserId] = useState(null);
 
  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch("http://localhost:5000/api/me", {
          credentials: "include",
        });
        if (response.ok) {
          setLoggedIn(true);
          setPage('workouts');
        }
      } catch (error) {
        console.error(error);
      }
    }
    checkLogin();
  }, []);
 
  function handleOpenMessage(userId) {
    setOpenMessageUserId(userId);
    setPage('messages');
  }
 
  function handleLogout() {
    disconnectSocket();
    setLoggedIn(false);
    setPage('login');
  }
 
  return (
    <>
      {loggedIn ? (
        <div>
          <nav style={{ display: 'flex', gap: 12, padding: 12, justifyContent: 'center', background: '#CCD5C0', borderBottom: '2px solid #38422B' }}>
            <button onClick={() => setPage('workouts')} className="counter" style={page === 'workouts' ? activeNavBtn : {}}>Workouts</button>
            <button onClick={() => setPage('history')} className="counter" style={page === 'history' ? activeNavBtn : {}}>History</button>
            <button onClick={() => setPage('profile')} className="counter" style={page === 'profile' ? activeNavBtn : {}}>Profile</button>
            <button onClick={() => setPage('connect')} className="counter" style={page === 'connect' ? activeNavBtn : {}}>Connect</button>
            <button onClick={() => setPage('messages')} className="counter" style={page === 'messages' ? activeNavBtn : {}}>Messages</button>
            <button onClick={handleLogout} className="counter">Logout</button>
          </nav>
 
          {page === 'workouts' && <Workouts />}
          {page === 'history' && <History />}
          {page === 'profile' && <Profile />}
          {page === 'connect' && <Connect onOpenMessage={handleOpenMessage} />}
          {page === 'messages' && (
            <Messages
              openWithUserId={openMessageUserId}
              onClearOpenWith={() => setOpenMessageUserId(null)}
            />
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
 
const activeNavBtn = {
  borderColor: '#9FB873',
  background: '#38422B',
  color: 'white',
};
 
export default App;

