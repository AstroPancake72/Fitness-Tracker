import { useState, useEffect } from 'react'
import '../App.css'

export default function Workouts() {
  const [workouts, setWorkouts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ datetime: '', length: '', type: 'Cardio' })

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

  // 3. New Delete function to keep your MongoDB clean
  async function deleteWorkout(id) {
    try {
      const response = await fetch(`http://localhost:5000/api/workouts/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (response.ok) {
        setWorkouts(prev => prev.filter(w => w._id !== id));
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
          <input name="datetime" type="datetime-local" value={form.datetime} onChange={handleChange} required />
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
              <li key={w._id} style={{ // Changed w.id to w._id for MongoDB
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
                {/* Delete button to help you manage test data */}
                <button onClick={() => deleteWorkout(w._id)} style={{ background: 'none', border: 'none', color: '#8B0000', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}