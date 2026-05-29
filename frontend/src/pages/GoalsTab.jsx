import React, { useState, useEffect } from 'react';
import '../App.css'; 

export default function GoalsTab() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [goalType, setGoalType] = useState('Strength');
  const [exerciseName, setExerciseName] = useState('');
  const [startingValue, setStartingValue] = useState('');
  const [targetValue, setTargetValue] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      // Adjust this URL to match your Express routes
      const response = await fetch("http://localhost:5000/api/goals", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setGoals(data);
      } else {
        console.error('Failed to fetch goals');
      }
    } catch (err) {
      console.error('Error fetching goals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/goals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          goalType,
          exerciseName: goalType === 'Strength' ? exerciseName : undefined,
          startingValue: Number(startingValue),
          targetValue: Number(targetValue)
        }),
      });

      if (response.ok) {
        // Reset form and refresh dashboard
        setShowForm(false);
        setExerciseName('');
        setStartingValue('');
        setTargetValue('');
        fetchGoals(); 
      }
    } catch (err) {
      console.error('Error creating goal', err);
    }
  };

const deleteGoal = async (id) => {
  try {
    const response = await fetch(`http://localhost:5000/api/goals/${id}`, {
      method: 'DELETE',
      credentials: 'include' // Important for your session
    });

    if (response.ok) {
      // Refresh your list so the goal disappears immediately
      fetchGoals(); // Call your existing function that fetches the list
    }
  } catch (err) {
    console.error("Delete failed", err);
  }
};


  if (loading) {
    return <div style={{ padding: '2rem', color: '#38422B', fontWeight: 'bold' }}>Loading Goals...</div>;
  }

  return (
    <div className="login-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h1 style={{ color: '#38422B', margin: 0 }}>My Goals</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={primaryButtonStyle}
        >
          {showForm ? 'Cancel' : '+ New Goal'}
        </button>
      </div>

      {/* --- GOAL CREATION FORM --- */}
      {showForm && (
        <form onSubmit={handleCreateGoal} style={formContainerStyle}>
          <h3 style={{ marginTop: 0, color: '#38422B' }}>Create a New Target</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Goal Category</label>
            <select 
              value={goalType} 
              onChange={(e) => setGoalType(e.target.value)}
              style={inputStyle}
            >
              <option value="Strength">Strength (1RM / Max Weight)</option>
              <option value="Bodyweight">Bodyweight</option>
              <option value="Consistency">Consistency (Workouts/Week)</option>
            </select>
          </div>

          {/* Only show Exercise Name if it's a Strength goal */}
          {goalType === 'Strength' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>Exercise Name</label>
              <input 
                type="text" 
                placeholder="e.g., Bench Press" 
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Starting Value</label>
              <input 
                type="number" 
                placeholder="e.g., 135" 
                value={startingValue}
                onChange={(e) => setStartingValue(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Target Value</label>
              <input 
                type="number" 
                placeholder="e.g., 190" 
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <button type="submit" style={{ ...primaryButtonStyle, width: '100%' }}>
            Save Goal
          </button>
        </form>
      )}

      {/* --- GOALS DASHBOARD --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {goals.length === 0 && !showForm ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#F5F1E8', borderRadius: '12px', border: '1px dashed #38422B' }}>
            <p style={{ color: '#38422B', fontWeight: 'bold' }}>No active goals right now.</p>
            <p style={{ color: '#666' }}>Set a target to start tracking your progress!</p>
          </div>
        ) : (
          goals.map(goal => (
            <div key={goal._id} style={goalCardStyle}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#38422B' }}>
                  {goal.goalType === 'Strength' ? goal.exerciseName : goal.goalType}:&nbsp;
                </h3>
                <span style={{ fontWeight: 'bold', color: '#9FB873' }}>
                  {goal.percentageCompleted}%
                </span>
              </div>
              
              {/* Progress Bar Track */}
              <div style={progressBarTrackStyle}>
                {/* Progress Bar Fill */}
                <div style={{
                  ...progressBarFillStyle,
                  width: `${goal.percentageCompleted}%`
                }}></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'space-between', marginTop: '8px', fontSize: '14px', color: '#666' }}>
                <span>Started: {goal.startingValue}</span>
                <span style={{ fontWeight: 'bold', color: '#38422B' }}>
                  Current: {goal.currentValue} / {goal.targetValue}
                </span>
              </div>

              <button 
    onClick={() => deleteGoal(goal._id)}
    style={{ 
      marginTop: '10px',      
      padding: '8px',
      background: '#ff4d4d', 
      color: 'white', 
      border: 'none', 
      borderRadius: '4px',
      cursor: 'pointer' 
    }}
  >
    Delete Goal
  </button>

            </div>
            
          ))
        )}
      </div>
    </div>
  );
}

// --- STYLES ---

const primaryButtonStyle = {
  background: '#38422B',
  color: '#F5F1E8',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

const formContainerStyle = {
  background: '#CCD5C0',
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #38422B',
  marginBottom: '20px',
};

const labelStyle = {
  display: 'block',
  fontWeight: 'bold',
  color: '#38422B',
  marginBottom: '5px',
  fontSize: '14px'
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #38422B',
  background: '#F5F1E8',
  boxSizing: 'border-box',
  outline: 'none'
};

const goalCardStyle = {
  background: '#F5F1E8',
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #38422B',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
};

const progressBarTrackStyle = {
  width: '100%',
  height: '16px',
  background: '#CCD5C0',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid rgba(56, 66, 43, 0.2)'
};

const progressBarFillStyle = {
  height: '100%',
  background: '#9FB873', // Light green fill
  borderRadius: '8px',
  transition: 'width 0.5s ease-in-out' // Smooth animation on load
};