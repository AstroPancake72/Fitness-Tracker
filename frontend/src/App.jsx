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
  // NEW: Stops the app from choosing a layout before the server verification responds
  const [loading, setLoading] = useState(true); 
  
  const [page, setPage] = useState(() => {
    return localStorage.getItem('current_page') || 'login';
  });
  
  const [openMessageUserId, setOpenMessageUserId] = useState(null);
 
  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch("http://localhost:5000/api/me", {
          credentials: "include",
        });
        if (response.ok) {
          setLoggedIn(true);
          
          setPage((currentPage) => {
            if (currentPage === 'login' || currentPage === 'signup') {
              localStorage.setItem('current_page', 'workouts');
              return 'workouts';
            }
            return currentPage;
          });
        } else {
          setLoggedIn(false);
          setPage('login');
          localStorage.setItem('current_page', 'login');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false); // NEW: Verification complete, safe to render now
      }
    }
    checkLogin();
  }, []);

  function navigateTo(newPage) {
    setPage(newPage);
    localStorage.setItem('current_page', newPage);
  }
 
  function handleOpenMessage(userId) {
    setOpenMessageUserId(userId);
    navigateTo('messages'); 
  }
 
  // FIXED: Clears authentication status on the server and blocks local persistence updates
  async function handleLogout() {
    try {
      await fetch("http://localhost:5000/api/logout", {
        method: "POST", // Change to "DELETE" if your backend uses a delete route
        credentials: "include",
      });
    } catch (error) {
      console.error("Server logout error:", error);
    }

    disconnectSocket();
    setLoggedIn(false);
    navigateTo('login'); 
  }

  // NEW: Don't render components during the initial HTTP handshake check
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#38422B', fontWeight: 'bold' }}>
        Loading Session...
      </div>
    );
  }
 
  return (
    <>
      {loggedIn ? (
        <div>
          <nav style={{ display: 'flex', gap: 12, padding: 12, justifyContent: 'center', background: '#CCD5C0', borderBottom: '2px solid #38422B' }}>
            <button onClick={() => navigateTo('workouts')} className="counter" style={page === 'workouts' ? activeNavBtn : {}}>Workouts</button>
            <button onClick={() => navigateTo('history')} className="counter" style={page === 'history' ? activeNavBtn : {}}>History</button>
            <button onClick={() => navigateTo('profile')} className="counter" style={page === 'profile' ? activeNavBtn : {}}>Profile</button>
            <button onClick={() => navigateTo('connect')} className="counter" style={page === 'connect' ? activeNavBtn : {}}>Connect</button>
            <button onClick={() => navigateTo('messages')} className="counter" style={page === 'messages' ? activeNavBtn : {}}>Messages</button>
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
          <Login onLogin={() => { setLoggedIn(true); navigateTo('workouts'); }} onShowSignup={() => navigateTo('signup')} />
        ) : (
          <Signup onBack={() => navigateTo('login')} />
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