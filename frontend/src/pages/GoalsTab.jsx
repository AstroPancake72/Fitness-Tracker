import React, { useState, useEffect } from 'react';

const GoalsTab = () => {
  const [currentGoal, setCurrentGoal] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);

  const goalOptions = ['Getting Stronger', 'Increasing Muscle Mass', 'Losing Weight'];

  useEffect(() => {
    fetchGoalProgress();
  }, []);

  const fetchGoalProgress = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/goals/progress", {
        method: "GET",
        credentials: "include", // Matches your App.jsx auth setup
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentGoal(data.currentGoal);
        setProgressData(data.progressData);
      } else {
        console.error('Failed to fetch goal data');
      }
    } catch (err) {
      console.error('Error fetching goal data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGoal = async (goal) => {
    try {
      const response = await fetch("http://localhost:5000/api/goals/set", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ goal }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentGoal(data.currentGoal);
        fetchGoalProgress(); // Refresh data for the newly selected goal
      } else {
        console.error('Failed to update goal');
      }
    } catch (err) {
      console.error('Error setting goal', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: '#38422B' }}>
        Loading your goals...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#38422B' }}>
      <h2 style={{ textAlign: 'center', borderBottom: '2px solid #CCD5C0', paddingBottom: '10px' }}>
        Fitness Goals
      </h2>

      {/* VIEW 1: Selection Mode (If no goal is active) */}
      {!currentGoal ? (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p>What are you focusing on right now? Select a core goal to track your progress:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            {goalOptions.map((goal) => (
              <button 
                key={goal} 
                onClick={() => handleSelectGoal(goal)}
                style={{
                  padding: '15px',
                  background: '#CCD5C0',
                  border: '2px solid #9FB873',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#38422B'
                }}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* VIEW 2: Progress Dashboard Mode */
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            background: '#CCD5C0', 
            padding: '20px', 
            borderRadius: '8px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: 0 }}>
              Current Goal: <span style={{ color: '#5a6b45' }}>{currentGoal}</span>
            </h3>
            <button 
              onClick={() => handleSelectGoal(null)}
              style={{
                padding: '8px 12px',
                background: '#38422B',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Change Goal
            </button>
          </div>

          <div style={{ padding: '20px', border: '1px solid #CCD5C0', borderRadius: '8px' }}>
            {currentGoal === 'Getting Stronger' && (
              <div>
                <h4>Strength Progression</h4>
                {progressData.length > 0 ? (
                  <p>Data found: Render your line charts here!</p>
                ) : (
                  <p style={{ fontStyle: 'italic', color: '#666' }}>
                    Log your exercises in the tracker to watch your strength curve climb!
                  </p>
                )}
              </div>
            )}

            {(currentGoal === 'Losing Weight' || currentGoal === 'Increasing Muscle Mass') && (
              <div>
                <h4>Body Weight Trajectory</h4>
                {progressData.length > 0 ? (
                  <p>Data found: Render your weight tracking line graphs here!</p>
                ) : (
                  <p style={{ fontStyle: 'italic', color: '#666' }}>
                    No weight logs found yet. Start tracking your body metrics to see your line graph populate.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsTab;