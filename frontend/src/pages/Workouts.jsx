import { useState, useEffect } from 'react'
import '../App.css'

export default function Workouts() {
  const [workouts, setWorkouts] = useState([])
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [newRoutineName, setNewRoutineName] = useState("")
  const [showAddRoutine, setShowAddRoutine] = useState(false)
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetId: null, type: null, index: null })

  useEffect(() => {
    fetch("http://localhost:5000/api/workouts", { credentials: 'include' })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setWorkouts(data); })
      .catch(err => console.error("Load error:", err));
  }, [])

  const routines = workouts.reduce((acc, current) => {
    if (!current.name) return acc;
    const existing = acc.find(item => item.name === current.name);
    if (!existing) acc.push(current);
    return acc;
  }, []);

  function startWorkout(baseline) {
    setActiveWorkout({
      name: baseline.name,
      exercises: baseline.exercises.map(ex => ({
        ...ex,
        weight: ex.weight || 0,
        reps: ex.reps || 0,
        sets: ex.sets || 0,
        time: ex.time || 0 
      }))
    });
  }

  const openDeleteModal = (type, idOrIndex) => {
    setDeleteModal({ 
      isOpen: true, 
      type, 
      targetId: type === 'routine' ? idOrIndex : null, 
      index: type === 'exercise' ? idOrIndex : null 
    });
  }

  const confirmDelete = async () => {
    if (deleteModal.type === 'routine') {
      const res = await fetch(`http://localhost:5000/api/workouts/${deleteModal.targetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) setWorkouts(prev => prev.filter(w => w._id !== deleteModal.targetId));
    } else {
      const updated = activeWorkout.exercises.filter((_, i) => i !== deleteModal.index);
      setActiveWorkout({ ...activeWorkout, exercises: updated });
    }
    setDeleteModal({ isOpen: false, targetId: null, type: null, index: null });
  }

  const updateExercise = (index, field, value) => {
    const updated = [...activeWorkout.exercises];
    updated[index][field] = (field === 'name') ? value : Number(value);
    setActiveWorkout({ ...activeWorkout, exercises: updated });
  }

  async function saveWorkout() {
    const validExercises = activeWorkout.exercises.filter(ex => ex.name.trim() !== "");

    if (validExercises.length === 0) {
      alert("Please enter a name for at least one exercise.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: activeWorkout.name,
          datetime: new Date(),
          exercises: validExercises 
        }),
      });

      if (response.ok) {
        const saved = await response.json();
        setWorkouts(prev => [saved, ...prev]);
        setActiveWorkout(null);
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  }

  return (
    <div className="login-container" style={{maxWidth: '900px'}}>
      {deleteModal.isOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this {deleteModal.type}?</p>
            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
              <button className="counter" style={{flex: 1, background: '#8B0000'}} onClick={confirmDelete}>Delete</button>
              <button className="counter" style={{flex: 1, background: '#ccc', color: '#000'}} onClick={() => setDeleteModal({isOpen: false})}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC TITLE: Switches between "My Workouts" and the routine name */}
      <h1>{activeWorkout ? activeWorkout.name : "My Workouts"}</h1>

      {!activeWorkout ? (
        <div style={{ width: '100%' }}>
          {!showAddRoutine ? (
            <button className="counter" style={{width: '100%', marginBottom: '20px'}} onClick={() => setShowAddRoutine(true)}>
              + Create New Routine
            </button>
          ) : (
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <input className="login-input-style" placeholder="Routine Name..." value={newRoutineName} onChange={(e) => setNewRoutineName(e.target.value)} />
              <button className="counter" onClick={() => { setActiveWorkout({name: newRoutineName, exercises: [{name: "", weight: 0, reps: 0, sets: 0, time: 0}]}); setShowAddRoutine(false); }}>Add</button>
            </div>
          )}

          {routines.map(r => (
            <div key={r._id} style={itemStyle}>
              <div style={{textAlign: 'left'}}>
                <div style={{fontWeight: 'bold', fontSize: '18px'}}>{r.name}</div>
                <div style={{fontSize: '12px', color: '#666'}}>Last: {new Date(r.datetime).toLocaleDateString()}</div>
              </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <button className="counter" onClick={() => startWorkout(r)}>Start</button>
                <button className="counter" style={{background: '#8B0000'}} onClick={() => openDeleteModal('routine', r._id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={sessionBoxStyle}>
          {/* Removed the redundant <h2> here since it is now in the <h1> above */}
          <div style={{display: 'flex', fontWeight: 'bold', padding: '10px 10px 5px 10px', textAlign: 'left', fontSize: '14px'}}>
            <span style={{flex: 2}}>name</span>
            <span style={{flex: 1}}>weight</span>
            <span style={{flex: 1}}>reps</span>
            <span style={{flex: 1}}>sets</span>
            <span style={{flex: 1}}>time (min)</span>
            <span style={{width: '35px'}}></span>
          </div>
          <hr style={{ border: '1px solid #38422B', marginBottom: '15px', marginTop: '0' }} />

          {activeWorkout.exercises.map((ex, i) => (
            <div key={i} style={exerciseRowStyle}>
              <input value={ex.name} onChange={(e) => updateExercise(i, 'name', e.target.value)} style={{flex: 2, border: 'none', background: 'transparent'}} placeholder="Exercise..."/>
              <input type="number" value={ex.weight} onChange={(e) => updateExercise(i, 'weight', e.target.value)} style={{flex: 1, width: '40px'}} />
              <input type="number" value={ex.reps} onChange={(e) => updateExercise(i, 'reps', e.target.value)} style={{flex: 1, width: '40px'}} />
              <input type="number" value={ex.sets} onChange={(e) => updateExercise(i, 'sets', e.target.value)} style={{flex: 1, width: '40px'}} />
              <input type="number" value={ex.time} onChange={(e) => updateExercise(i, 'time', e.target.value)} style={{flex: 1, width: '40px'}} />
              {/* Centered white X button */}
              <button onClick={() => openDeleteModal('exercise', i)} style={deleteBtnStyle}>✕</button>
            </div>
          ))}

          <button className="counter" style={{width: '100%', background: 'transparent', color: '#38422B', border: '1px dashed #38422B', marginBottom: '20px'}} 
                  onClick={() => setActiveWorkout({...activeWorkout, exercises: [...activeWorkout.exercises, {name: "", weight: 0, reps: 0, sets: 0, time: 0}]})}>
            + Add Exercise
          </button>

          <div style={{display: 'flex', gap: '10px'}}>
            <button className="counter" style={{background: '#8B0000', flex: 1}} onClick={() => setActiveWorkout(null)}>Exit</button>
            <button className="counter" style={{flex: 2}} onClick={saveWorkout}>Save Workout</button>
          </div>
        </div>
      )}
    </div>
  )
}

const itemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5F1E8', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #38422B' }
const sessionBoxStyle = { width: '100%', background: '#F5F1E8', padding: '20px', borderRadius: '20px', border: '2px solid #38422B' }
const exerciseRowStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', background: 'white', padding: '10px', borderRadius: '8px' }

// FIXED: Flexbox centering for the X
const deleteBtnStyle = { 
  width: '30px', 
  height: '30px', 
  borderRadius: '50%', 
  background: '#8B0000', 
  color: 'white', 
  border: 'none', 
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0',
  lineHeight: '1',
  fontSize: '16px'
}

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalBoxStyle = { background: '#fff', padding: '30px', borderRadius: '15px', textAlign: 'center', width: '300px', border: '2px solid #38422B' }