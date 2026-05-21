import { useState, useEffect } from 'react'
import '../App.css'

export default function History() {
  const [history, setHistory] = useState([])
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null)
  
  // Custom integrated delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetId: null })

  // Fetch all logged workouts from the backend on load
  useEffect(() => {
    fetch("http://localhost:5000/api/workouts", { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sort by date descending (most recent first)
          const sortedData = data.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
          setHistory(sortedData);
        }
      })
      .catch(err => console.error("History load error:", err));
  }, [])

  // Toggle expand/collapse for viewing a specific workout's details
  const toggleViewWorkout = (id) => {
    if (expandedWorkoutId === id) {
      setExpandedWorkoutId(null); // Collapse if clicked again
    } else {
      setExpandedWorkoutId(id);   // Expand selected
    }
  }

  // Open the integrated delete confirmation modal
  const openDeleteModal = (id) => {
    setDeleteModal({ isOpen: true, targetId: id });
  }

  // Handle the actual deletion from the database
  const confirmDelete = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/workouts/${deleteModal.targetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        // Remove from the local state list immediately
        setHistory(prev => prev.filter(w => w._id !== deleteModal.targetId));
        if (expandedWorkoutId === deleteModal.targetId) {
          setExpandedWorkoutId(null);
        }
      } else {
        alert("Failed to delete this log from the history database.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
    setDeleteModal({ isOpen: false, targetId: null });
  }

  return (
    <div className="login-container" style={{ maxWidth: '800px' }}>
      {/* INTEGRATED DELETE WARNING MODAL */}
      {deleteModal.isOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to permanently delete this workout log from your history?</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="counter" style={{ flex: 1, background: '#8B0000' }} onClick={confirmDelete}>Delete</button>
              <button className="counter" style={{ flex: 1, background: '#ccc', color: '#000' }} onClick={() => setDeleteModal({ isOpen: false, targetId: null })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <h1>Workout History</h1>

      <div style={{ width: '100%' }}>
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No saved workouts found yet.</p>
        ) : (
          history.map(workout => {
            const isExpanded = expandedWorkoutId === workout._id;
            return (
              <div key={workout._id} style={historyCardStyle}>
                {/* CARD HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{workout.name}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {new Date(workout.datetime).toLocaleDateString()} at {new Date(workout.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  {/* ACTIONS */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="counter" onClick={() => toggleViewWorkout(workout._id)}>
                      {isExpanded ? "Hide" : "View"}
                    </button>
                    <button className="counter" style={{ background: '#8B0000', ...deleteBtnStyle }} onClick={() => openDeleteModal(workout._id)}>✕</button>
                  </div>
                </div>

                {/* EXPANDED DETAILS (READ-ONLY VIEW) */}
                {isExpanded && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #38422B' }}>
                    <div style={{ display: 'flex', fontWeight: 'bold', paddingBottom: '5px', fontSize: '13px', color: '#38422B' }}>
                      <span style={{ flex: 2 }}>name</span>
                      <span style={{ flex: 1 }}>weight</span>
                      <span style={{ flex: 1 }}>reps</span>
                      <span style={{ flex: 1 }}>sets</span>
                      <span style={{ flex: 1 }}>time</span>
                    </div>
                    
                    {workout.exercises.map((ex, idx) => (
                      <div key={idx} style={readOnlyRowStyle}>
                        <span style={{ flex: 2, fontWeight: '500' }}>{ex.name || 'Unnamed Exercise'}</span>
                        <span style={{ flex: 1 }}>{ex.weight} lbs</span>
                        <span style={{ flex: 1 }}>{ex.reps} reps</span>
                        <span style={{ flex: 1 }}>{ex.sets} sets</span>
                        <span style={{ flex: 1 }}>{ex.time || 0} min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  )
}

// Layout Styles matching your application's palette
const historyCardStyle = { 
  background: '#F5F1E8', 
  padding: '15px 20px', 
  borderRadius: '15px', 
  marginBottom: '12px', 
  border: '1px solid #38422B',
  transition: 'all 0.2s ease'
}

const readOnlyRowStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  padding: '8px 0', 
  borderBottom: '1px dashed #ccc',
  fontSize: '14px',
  textAlign: 'left'
}

const deleteBtnStyle = { 
  width: '35px', 
  height: '35px', 
  borderRadius: '50%', 
  color: 'white', 
  border: 'none', 
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0',
  fontSize: '14px'
}

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalBoxStyle = { background: '#fff', padding: '30px', borderRadius: '15px', textAlign: 'center', width: '320px', border: '2px solid #38422B' }