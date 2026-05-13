import { useState, useEffect } from 'react'
import '../App.css'

export default function Workouts() {
  const [workouts, setWorkouts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ datetime: '', length: '', type: 'Cardio' })

  useEffect(() => {
    const saved = localStorage.getItem('ft_workouts')
    if (saved) setWorkouts(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('ft_workouts', JSON.stringify(workouts))
  }, [workouts])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function addWorkout(e) {
    e.preventDefault()
    const { datetime, length, type } = form
    if (!datetime || !length || !type) return
    const newW = { id: Date.now(), datetime, length: Number(length), type }
    setWorkouts(prev => [newW, ...prev])
    setForm({ datetime: '', length: '', type: 'Cardio' })
    setShowForm(false)
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

  const { total, totalMinutes, byType } = stats()

  return (
    <div className="login-container">
      <h1>Fitness Tracker</h1>
      <h2 className="login-subtitle">Your Workouts</h2>

      <button className="counter" onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Close' : 'Add Workout'}
      </button>

      {showForm && (
        <form onSubmit={addWorkout}>
          <input 
            name="datetime" 
            type="datetime-local" 
            value={form.datetime} 
            onChange={handleChange} 
            required
          />

          <input 
            name="length" 
            type="number" 
            placeholder="Length (minutes)"
            min="1" 
            value={form.length} 
            onChange={handleChange} 
            required
          />

          <select name="type" value={form.type} onChange={handleChange} className="login-input-style">
            <option>Cardio</option>
            <option>Strength</option>
            <option>Flexibility</option>
            <option>HIIT</option>
            <option>Other</option>
          </select>

          <button type="submit" className="counter" style={{ width: '100%', marginTop: '10px' }}>
            Add Workout
          </button>
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
              <li key={w.id} style={{ 
                background: '#F5F1E8', 
                padding: '20px', 
                borderRadius: '15px', 
                marginBottom: '15px',
                border: '1px solid #38422B' 
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {new Date(w.datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <div style={{ marginTop: '5px' }}>{w.type} • {w.length} mins</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}