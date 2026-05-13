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
    <div style={{ padding: 24 }}>
      <h2>Workouts</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={() => setShowForm(s => !s)} className="counter">New Workout</button>
        <div>
          <strong>{total}</strong> workouts • <strong>{totalMinutes}</strong> minutes total
        </div>
      </div>

      {showForm && (
        <form onSubmit={addWorkout} style={{ maxWidth: 520, marginBottom: 18 }}>
          <label>
            Date & time
            <input name="datetime" type="datetime-local" value={form.datetime} onChange={handleChange} />
          </label>

          <label>
            Length (minutes)
            <input name="length" type="number" min="1" value={form.length} onChange={handleChange} />
          </label>

          <label>
            Type
            <select name="type" value={form.type} onChange={handleChange}>
              <option>Cardio</option>
              <option>Strength</option>
              <option>Flexibility</option>
              <option>HIIT</option>
              <option>Other</option>
            </select>
          </label>

          <button type="submit" className="counter">Add</button>
        </form>
      )}

      <section style={{ marginBottom: 18 }}>
        <h3>By type</h3>
        <ul>
          {Object.entries(byType).length === 0 && <li>No workouts yet</li>}
          {Object.entries(byType).map(([t, c]) => (
            <li key={t}>{t}: {c}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>All workouts</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {workouts.map(w => (
            <li key={w.id} style={{ background: '#f5f1e8', padding: 12, borderRadius: 10, marginBottom: 10 }}>
              <div><strong>{new Date(w.datetime).toLocaleString()}</strong></div>
              <div>Type: {w.type}</div>
              <div>Length: {w.length} minutes</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
