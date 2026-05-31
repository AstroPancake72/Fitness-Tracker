import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import '../App.css'

export default function History() {
  const [workouts, setWorkouts] = useState([])
  const [expandedHistoryId, setExpandedHistoryId] = useState(null)
  const [workoutSearch, setWorkoutSearch] = useState("")
  const [exerciseSearch, setExerciseSearch] = useState("")
  const [exerciseDropdown, setExerciseDropdown] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [yAxis, setYAxis] = useState("weight")
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetch("http://localhost:5000/api/workouts", { credentials: 'include' })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setWorkouts(data); })
      .catch(err => console.error("Load error:", err));
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setExerciseDropdown([])
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter workout log by workout name
  const filteredWorkouts = workouts.filter(log => {
    if (!workoutSearch.trim()) return true
    return log.name && log.name.toLowerCase().includes(workoutSearch.toLowerCase())
  })

  // Build dropdown: unique exercise names matching the exercise search
  function handleExerciseSearchChange(e) {
    const query = e.target.value
    setExerciseSearch(query)
    if (!query.trim()) {
      setExerciseDropdown([])
      return
    }
    const seen = new Set()
    const matches = []
    for (const workout of workouts) {
      for (const ex of workout.exercises) {
        const name = ex.exerciseId?.name?.trim()
        if (name && name.toLowerCase().includes(query.toLowerCase()) && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase())
          matches.push(name)
        }
      }
    }
    setExerciseDropdown(matches)
  }

  function selectExercise(name) {
    setSelectedExercise(name)
    setExerciseSearch(name)
    setExerciseDropdown([])
    setYAxis("weight")
  }

  function closeGraph() {
    setSelectedExercise(null)
    setExerciseSearch("")
    setExerciseDropdown([])
  }

  // Build graph data for selected exercise
  function buildGraphData() {
    if (!selectedExercise) return []

    const sessionMap = {}
    for (const workout of workouts) {
      const dateKey = new Date(workout.datetime).toLocaleDateString()
      const timestamp = new Date(workout.datetime).getTime()

      const matching = workout.exercises.filter(
        ex => ex.exerciseId?.name?.trim().toLowerCase() === selectedExercise.toLowerCase()
      )
      if (matching.length === 0) continue

      const totalWeight = matching.reduce((s, ex) => s + (ex.weight || 0), 0)
      const avgWeight = totalWeight / matching.length
      const totalReps = matching.reduce((s, ex) => s + (ex.reps || 0), 0)
      const totalSets = matching.reduce((s, ex) => s + (ex.sets || 0), 0)
      const totalTime = matching.reduce((s, ex) => s + (ex.time || 0), 0)

      if (!sessionMap[dateKey] || timestamp > sessionMap[dateKey].timestamp) {
        sessionMap[dateKey] = {
          date: dateKey,
          timestamp,
          weight: Math.round(avgWeight * 10) / 10,
          reps: totalReps,
          sets: totalSets,
          time: totalTime,
          score: Math.round(avgWeight * totalReps * totalSets * Math.max(totalTime, 1))
        }
      }
    }

    return Object.values(sessionMap).sort((a, b) => a.timestamp - b.timestamp)
  }

  const graphData = buildGraphData()

  const yAxisLabels = {
    weight: "Weight (lbs)",
    reps: "Reps",
    sets: "Sets",
    time: "Time (min)",
    score: "Score"
  }

  return (
    <div className="login-container" style={{ maxWidth: '900px' }}>
      <h1>Workout History</h1>

      {selectedExercise ? (
        //  GRAPH 
       <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#38422B', fontSize: '24px' }}>{selectedExercise}</h2>
            <button 
              className="counter" 
              onClick={closeGraph}
              style={{ width: 'auto', marginBottom: '10px', marginTop: '10px', minWidth: '90px', padding: '8px 20px', margin: 0 }}
            >
              ← Back
            </button>
          </div>

          <h4 style={{ 
            textAlign: 'left', 
            margin: '0 0 10px 4px', 
            color: '#38422B', 
            fontSize: '14px', 
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            opacity: 0.8
          }}>
            Graph Metrics
          </h4>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', flexWrap: 'wrap' }}>
            {Object.entries(yAxisLabels).map(([key, label]) => (
              <button
                key={key}
                className="counter"
                onClick={() => setYAxis(key)}
                style={{
                  background: yAxis === key ? '#38422B' : '#CCD5C0',
                  color: yAxis === key ? 'white' : '#38422B',
                  borderColor: yAxis === key ? '#38422B' : 'transparent',
                  padding: '8px 16px',
                  width: 'auto',      
                  flexGrow: 0,        
                  marginBottom: 0
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {graphData.length < 2 ? (
            <div style={{ background: '#F5F1E8', border: '1px solid #38422B', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#666' }}>
              {graphData.length === 0
                ? `No sessions found for "${selectedExercise}".`
                : `Only one session found for "${selectedExercise}". Log more workouts to see progress!`}
            </div>
          ) : (
            <div style={{ background: '#F5F1E8', border: '1px solid #38422B', borderRadius: '12px', padding: '20px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={graphData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CCD5C0" />
                  <XAxis dataKey="date" tick={{ fill: '#38422B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#38422B', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#F5F1E8', border: '1px solid #38422B', borderRadius: '8px', color: '#38422B' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey={yAxis}
                    stroke="#38422B"
                    strokeWidth={2}
                    dot={{ fill: '#9FB873', stroke: '#38422B', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, fill: '#38422B' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {graphData.length > 0 && (
            <div style={{ marginTop: '20px', background: '#F5F1E8', border: '1px solid #38422B', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', fontWeight: 'bold', padding: '10px 15px', background: '#CCD5C0', fontSize: '13px', color: '#38422B' }}>
                <span style={{ flex: 2 }}>Date</span>
                <span style={{ flex: 1 }}>Weight</span>
                <span style={{ flex: 1 }}>Reps</span>
                <span style={{ flex: 1 }}>Sets</span>
                <span style={{ flex: 1 }}>Time</span>
                <span style={{ flex: 1 }}>Score</span>
              </div>
              {graphData.map((row, i) => (
                <div key={i} style={{ display: 'flex', padding: '8px 15px', fontSize: '13px', borderTop: '1px solid #CCD5C0', color: '#38422B' }}>
                  <span style={{ flex: 2 }}>{row.date}</span>
                  <span style={{ flex: 1 }}>{row.weight} lbs</span>
                  <span style={{ flex: 1 }}>{row.reps}</span>
                  <span style={{ flex: 1 }}>{row.sets}</span>
                  <span style={{ flex: 1 }}>{row.time} min</span>
                  <span style={{ flex: 1 }}>{row.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by workout name:"
              value={workoutSearch}
              onChange={(e) => setWorkoutSearch(e.target.value)}
              style={searchInputStyle}
            />
            <div style={{ position: 'relative', flex: 1 }} ref={dropdownRef}>
              <input
                type="text"
                placeholder="Search by exercise name (Graph Progress):"
                value={exerciseSearch}
                onChange={handleExerciseSearchChange}
                style={searchInputStyle}
              />
              {exerciseDropdown.length > 0 && (
                <div style={dropdownStyle}>
                  {exerciseDropdown.map((name, i) => (
                    <div
                      key={i}
                      onClick={() => selectExercise(name)}
                      style={dropdownItemStyle}
                      onMouseEnter={e => e.currentTarget.style.background = '#CCD5C0'}
                      onMouseLeave={e => e.currentTarget.style.background = '#F5F1E8'}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {filteredWorkouts.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No matching workout logs found.</p>
          ) : (
            filteredWorkouts.map(log => {
              const isExpanded = expandedHistoryId === log._id
              return (
                <div key={log._id} style={{ ...itemStyle, flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{log.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(log.datetime).toLocaleDateString()} at {new Date(log.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <button className="counter" onClick={() => setExpandedHistoryId(isExpanded ? null : log._id)}>
                        {isExpanded ? "Hide" : "View"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '10px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #38422B' }}>
                      <div style={{ display: 'flex', fontWeight: 'bold', paddingBottom: '5px', fontSize: '13px', color: '#38422B', textAlign: 'left' }}>
                        <span style={{ flex: 2 }}>name</span>
                        <span style={{ flex: 1 }}>weight</span>
                        <span style={{ flex: 1 }}>reps</span>
                        <span style={{ flex: 1 }}>sets</span>
                        <span style={{ flex: 1 }}>time</span>
                      </div>
                      <hr style={{ margin: '5px 0 10px 0', border: '1px solid #38422B' }} />
                      {log.exercises.map((ex, idx) => (
                        <div key={idx} style={{ display: 'flex', textAlign: 'left', padding: '6px 0', fontSize: '14px', borderBottom: '1px dashed #eee' }}>
                          <span style={{ flex: 2, fontWeight: '500' }}>{ex.exerciseId?.name || 'Unnamed Exercise'}</span>
                          <span style={{ flex: 1 }}>{ex.weight} lbs</span>
                          <span style={{ flex: 1 }}>{ex.reps} reps</span>
                          <span style={{ flex: 1 }}>{ex.sets} sets</span>
                          <span style={{ flex: 1 }}>{ex.time || 0} min</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

const searchInputStyle = {
  flex: 1,
  padding: '12px 15px',
  borderRadius: '10px',
  border: '1px solid #38422B',
  background: '#F5F1E8',
  fontSize: '15px',
  boxSizing: 'border-box',
  outline: 'none',
  minWidth: '180px'
}

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  background: '#F5F1E8',
  border: '1px solid #38422B',
  borderRadius: '10px',
  marginTop: '4px',
  zIndex: 100,
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
}

const dropdownItemStyle = {
  padding: '10px 15px',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '14px',
  color: '#38422B',
  background: '#F5F1E8',
  transition: 'background 0.15s'
}

const itemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5F1E8', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #38422B' }