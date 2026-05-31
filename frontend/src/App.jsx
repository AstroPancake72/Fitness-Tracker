import { useState, useEffect } from 'react'
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword"; 
import Workouts from "./pages/Workouts";
import "./App.css";
import Profile from "./pages/Profile";
import History from './pages/History';
import Connect from './pages/Connect';
import Messages, { disconnectSocket } from './pages/Messages';
import GoalsTab from './pages/GoalsTab';
import ExerciseSuggestions from './pages/ExerciseSuggestions'; 

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true); 
  
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  
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
            if (currentPage === 'login' || currentPage === 'signup' || currentPage === 'forgot') {
              localStorage.setItem('current_page', 'workouts');
              return 'workouts';
            }
            return currentPage;
          });
        } else {
          setLoggedIn(false);
          setPage((currentPage) => {
            if (currentPage !== 'signup' && currentPage !== 'forgot') {
              localStorage.setItem('current_page', 'login');
              return 'login';
            }
            return currentPage;
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false); 
      }
    }
    checkLogin();
  }, []);

  function navigateTo(newPage) {
    setPage(newPage);
    localStorage.setItem('current_page', newPage);
  }

async function handleSelectSuggestedExercise(exercise) {
  try {
    const workoutPayload = {
      name: `Suggested: ${exercise.name}`,
      datetime: new Date(),
      isTemplate: true, 
      exercises: [
        {
          name: exercise.name,
          weight: exercise.weight || 0,
          reps: exercise.reps || 0,
          sets: exercise.sets || 0,
          time: exercise.time || null,
          instructions: exercise.instructions || "",
          isOriginal: true 
        }
      ]
    };

    const response = await fetch("http://localhost:5000/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workoutPayload),
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to save suggestion template");

  } catch (error) {
    console.error(error);
  }
}


  function handleOpenMessage(userId) {
    setOpenMessageUserId(userId);
    navigateTo('messages'); 
  }

  async function handleLogout() {
    try {
      await fetch("http://localhost:5000/api/logout", {
        method: "POST", 
        credentials: "include",
      });
    } catch (error) {
      console.error("Server logout error:", error);
    }

    disconnectSocket();
    setLoggedIn(false);
    navigateTo('login'); 
  }

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
            <button onClick={() => navigateTo('goals')} className="counter" style={page === 'goals' ? activeNavBtn : {}}>Goals</button>
            <button onClick={() => navigateTo('suggestions')} className="counter" style={page === 'suggestions' ? activeNavBtn : {}}>Exercise Suggestions</button>
            <button onClick={() => navigateTo('profile')} className="counter" style={page === 'profile' ? activeNavBtn : {}}>Profile</button>
            <button onClick={() => navigateTo('connect')} className="counter" style={page === 'connect' ? activeNavBtn : {}}>Connect</button>
            <button onClick={() => navigateTo('messages')} className="counter" style={page === 'messages' ? activeNavBtn : {}}>Messages</button>
            <button onClick={handleLogout} className="counter">Logout</button>
          </nav>

          {page === 'workouts' && (
            <Workouts 
              pendingSuggestions={pendingSuggestions} 
              clearPendingSuggestions={() => setPendingSuggestions([])} 
            />
          )}
          {page === 'history' && <History />}
          {page === 'goals' && <GoalsTab />}
          {page === 'suggestions' && (
            <ExerciseSuggestions onSelectSuggestedExercise={handleSelectSuggestedExercise} />
          )}
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
          <Login 
            onLogin={() => { setLoggedIn(true); navigateTo('workouts'); }} 
            onShowSignup={() => navigateTo('signup')} 
            onForgotPassword={() => navigateTo('forgot')} 
          />
        ) : page === 'forgot' ? (
          <ForgotPassword onBack={() => navigateTo('login')} /> 
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