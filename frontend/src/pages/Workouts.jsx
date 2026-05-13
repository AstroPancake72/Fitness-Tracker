import { useState, useEffect } from 'react'
import '../App.css'

export default function Workouts() {
  const [workouts, setWorkouts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ datetime: '', length: '', type: 'Cardio' })
  const [deletingId, setDeletingId] = useState(null);
  useEffect(() => {
    fetch("http://localhost:5000/api/workouts", { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setWorkouts(data);
      })
      .catch(err => console.error("Load error:", err));
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function addWorkout(e) {
    e.preventDefault()
    const { datetime, length, type } = form
    if (!datetime || !length || !type) return

    try {
      const response = await fetch("http://localhost:5000/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ datetime, length: Number(length), type }),
      });

      if (response.ok) {
        const savedWorkout = await response.json();
        setWorkouts(prev => [savedWorkout, ...prev]);
        setForm({ datetime: '', length: '', type: 'Cardio' });
        setShowForm(false);
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  }

  async function confirmDelete() {
  if (!deletingId) return;

  try {
    const response = await fetch(`http://localhost:5000/api/workouts/${deletingId}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (response.ok) {
      setWorkouts(prev => prev.filter(w => w._id !== deletingId));
      setDeletingId(null); // Close the modal
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
}

  function stats() {
    const total = workouts.length
    const totalMinutes = workouts.reduce((s, w) => s + (w.length || 0), 0)
    const byType = workouts.reduce((acc, w) => {
      acc[w.type] = (acc[w.type] || 0) + 1
      return acc
    }, {})
    return { total, totalMinutes, byType }
  }

  return (
    <div className="login-container">
      <h1>Fitness Tracker</h1>
      <h2 className="login-subtitle">Your Workouts</h2>

      <button className="counter" onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Close' : 'Add Workout'}
      </button>

      {showForm && (
        <form onSubmit={addWorkout}>
          <input name="datetime" type="datetime-local" value={form.datetime} onChange={handleChange} min="1900-01-01T00:00" max="3000-12-31T23:59" required />
          <input name="length" type="number" placeholder="Length (minutes)" min="1" value={form.length} onChange={handleChange} required />
          <select name="type" value={form.type} onChange={handleChange} className="login-input-style">
            <option>Cardio</option>
            <option>Strength</option>
            <option>Flexibility</option>
            <option>HIIT</option>
            <option>Other</option>
          </select>
          <button type="submit" className="counter" style={{ width: '100%', marginTop: '10px' }}>Add Workout</button>
        </form>
      )}

      <div style={{ width: '430px', marginTop: '40px' }}>
        <section style={{ marginBottom: 30 }}>
          <h3 style={{ color: '#38422B', borderBottom: '2px solid #38422B', paddingBottom: '5px' }}>Summary</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {Object.entries(stats().byType).length === 0 && <li>No workouts yet</li>}
            {Object.entries(stats().byType).map(([t, c]) => (
              <li key={t} style={{ fontSize: '18px', margin: '8px 0' }}>
                <strong>{t}:</strong> {c} sessions
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 style={{ color: '#38422B', borderBottom: '2px solid #38422B', paddingBottom: '5px' }}>History</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {workouts.map(w => (
              <li key={w._id} style={{ 
                background: '#F5F1E8', 
                padding: '20px', 
                borderRadius: '15px', 
                marginBottom: '15px',
                border: '1px solid #38422B',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {new Date(w.datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div style={{ marginTop: '5px' }}>{w.type} • {w.length} mins</div>
                </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setDeletingId(w._id);
        }} 
          style={{ 
            background: '#8B0000', 
            color: 'white', 
            border: 'none', 
            borderRadius: '50%', 
            width: '30px', 
            height: '30px', 
            cursor: 'pointer', 
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',      
            justifyContent: 'center',   
            padding: 0,                
            lineHeight: 1,            
            fontSize: '16px'           
          }}> ✕ </button>
          </li>
            ))}
          </ul>
        </section>
      </div>
      
      {deletingId && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
        justifyContent: 'center', alignItems: 'center', zIndex: 1000
      }}>
      <div style={{
        background: '#F5F1E8', padding: '30px', borderRadius: '15px',
        border: '2px solid #38422B', textAlign: 'center', width: '300px'
      }}>
        <h3 style={{ color: '#38422B', marginTop: 0 }}>Are you sure?</h3>
        <p>This will permanently remove this workout session.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          <button 
          onClick={() => setDeletingId(null)}
          style={{ background: '#ccc', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
          >
          Cancel
        </button>
        <button 
          onClick={confirmDelete}
          style={{ background: '#8B0000', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}