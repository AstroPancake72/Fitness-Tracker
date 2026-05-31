import { useState, useEffect } from 'react'
import '../App.css'
import ExerciseAutocomplete from './ExerciseAutocomplete';

export default function Workouts() {
  const [workouts, setWorkouts] = useState([])
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [newRoutineName, setNewRoutineName] = useState("")
  const [showAddRoutine, setShowAddRoutine] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetId: null, type: null, index: null })
  const [showNameWarning, setShowNameWarning] = useState(false); 
  const [showExerciseWarning, setShowExerciseWarning] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/workouts", { credentials: 'include' })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setWorkouts(data); })
      .catch(err => console.error("Load error:", err));
  }, [])

  const routines = workouts.reduce((acc, current) => {
    if (!current.name) return acc;
    const existingIndex = acc.findIndex(item => item.name.trim().toLowerCase() === current.name.trim().toLowerCase());
    if (existingIndex === -1) {
      acc.push(current);
    } else {
      if (new Date(current.datetime) > new Date(acc[existingIndex].datetime)) {
        acc[existingIndex] = current;
      }
    }
    return acc;
  }, []);

  function editWorkout(routine) {
    setActiveWorkout({
      isEditing: true,
      _id: routine._id,
      originalDate: routine.datetime, 
      originalName: routine.name,
      name: routine.name,
      exercises: routine.exercises.map(ex => ({
        // Always normalize: pull the id string out of the populated object if needed
        exerciseId: ex.exerciseId?._id ?? ex.exerciseId,
        name: ex.exerciseId?.name ?? ex.name ?? '',
        weight: ex.weight ?? 0,
        reps: ex.reps ?? 0,
        sets: ex.sets ?? 0,
        time: ex.time ?? 0,
        isOriginal: true,
      }))
    });
  }

  function startWorkout(baseline) {
    setActiveWorkout({
      isEditing: false,
      name: baseline.name,
      exercises: baseline.exercises.map(ex => ({
        exerciseId: ex.exerciseId?._id ?? ex.exerciseId,
        name: ex.exerciseId?.name ?? ex.name ?? '',
        weight: ex.weight || 0,
        reps: ex.reps || 0,
        sets: ex.sets || 0,
        time: ex.time || 0,
        isOriginal: true,
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
      if (res.ok) {
        setWorkouts(prev => prev.filter(w => w._id !== deleteModal.targetId));
      }
    } else {
      const updated = activeWorkout.exercises.filter((_, i) => i !== deleteModal.index);
      setActiveWorkout({ ...activeWorkout, exercises: updated });
    }
    setDeleteModal({ isOpen: false, targetId: null, type: null, index: null });
  }

  const updateExercise = (index, field, value) => {
    const updated = [...activeWorkout.exercises];
    
    if (field === 'exerciseId') {
      if (value) {
        // value is the full exercise object from the autocomplete
        updated[index].exerciseId = value._id;
        updated[index].name = value.name; 
      } else {
        updated[index].exerciseId = null;
        updated[index].name = ""; 
      }
    } else if (field === 'isOriginal') {
      updated[index].isOriginal = value; 
    } else {
      updated[index][field] = value === "" ? "" : Number(value);
    }
    
    setActiveWorkout({ ...activeWorkout, exercises: updated });
    
    if (field === 'name' && value && value.trim() !== "") {
      setShowExerciseWarning(false);
    }
  }

  async function saveWorkout() {
    const allValidExercises = activeWorkout.exercises.filter(ex => {
      const nameToCheck = ex.name ?? '';
      return nameToCheck.trim() !== '' && ex.exerciseId;
    });

    if (allValidExercises.length === 0) {
      setShowExerciseWarning(true);
      return;
    }

    const url = activeWorkout.isEditing 
      ? `http://localhost:5000/api/workouts/${activeWorkout._id}` 
      : "http://localhost:5000/api/workouts";
    
    const method = activeWorkout.isEditing ? "PUT" : "POST";
    const workoutDate = activeWorkout.isEditing ? activeWorkout.originalDate : new Date();

    try {
      const cleanedExercises = allValidExercises.map(({ isOriginal, name, ...rest }) => ({
        ...rest,
        // Ensure exerciseId is always just the ID string, never a populated object
        exerciseId: rest.exerciseId?._id ?? rest.exerciseId,
        weight: rest.weight === "" ? 0 : rest.weight,
        reps:   rest.reps   === "" ? 0 : rest.reps,
        sets:   rest.sets   === "" ? 0 : rest.sets,
        time:   rest.time   === "" ? 0 : rest.time,
      }));

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: activeWorkout.name,
          datetime: workoutDate, 
          exercises: cleanedExercises,
        }),
      });

      if (response.ok) {
        const saved = await response.json();
        
        if (activeWorkout.isEditing) {
          setWorkouts(prev => prev.map(w => {
            if (w._id === saved._id) return saved;
            if (activeWorkout.originalName && w.name === activeWorkout.originalName) {
              return { ...w, name: saved.name };
            }
            return w;
          }));
        } else {
          setWorkouts(prev => [saved, ...prev]);
        }
        
        setActiveWorkout(null);
        setShowExerciseWarning(false); 
      } else {
        const err = await response.json();
        console.error("Save rejected:", err.message);
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

      <h1>{activeWorkout ? (activeWorkout.isEditing ? `Editing Workout: ${activeWorkout.name}` : `Active Session: ${activeWorkout.name}`) : "My Workouts"}</h1>

      {!activeWorkout ? (
        <div style={{ width: '100%' }}>
          {!showAddRoutine ? (
            <button className="counter" style={{width: '100%', marginBottom: '20px'}} onClick={() => setShowAddRoutine(true)}>
              + Create New Routine
            </button>
          ) : (
            <div>
              <div style={{ marginTop: '20px', marginBottom: '10px', display: 'flex', gap: '20px' }}>
                <input 
                  className="login-input-style" 
                  placeholder="Routine Name..." 
                  value={newRoutineName} 
                  onChange={(e) => {
                    setNewRoutineName(e.target.value);
                    if (e.target.value.trim()) setShowNameWarning(false); 
                  }} 
                  style={{ marginTop: '-5px', marginBottom: '15px'}} 
                />
                <button 
                  className="counter" 
                  onClick={() => { 
                    if (!newRoutineName.trim()) {
                      setShowNameWarning(true);
                      return;
                    }
                    setActiveWorkout({
                      name: newRoutineName,
                      exercises: [{ exerciseId: null, name: "", weight: 0, reps: 0, sets: 0, time: 0 }]
                    }); 
                    setShowAddRoutine(false); 
                    setShowNameWarning(false);
                    setNewRoutineName("");
                  }}
                >
                  Add
                </button>
              </div>
              
              {showNameWarning && (
                <p style={{ color: '#8B0000', fontSize: '14px', margin: '-5px 0 15px 0', textAlign: 'left', fontWeight: 'bold' }}>
                  Please add a routine name before clicking Add.
                </p>
              )}
            </div>
          )}

          {routines.map(r => (
            <div key={r._id} style={itemStyle}>
              <div style={{textAlign: 'left'}}>
                <div style={{fontWeight: 'bold', fontSize: '18px'}}>{r.name}</div>
                <div style={{fontSize: '12px', color: '#666'}}>Last: {new Date(r.datetime).toLocaleDateString()}</div>
              </div>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button className="counter" onClick={() => startWorkout(r)}>Start</button>
                <button className="counter" onClick={() => editWorkout(r)}>Edit</button>
                <button className="counter" style={{background: '#8B0000', ...deleteBtnStyle}} onClick={() => openDeleteModal('routine', r._id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={sessionBoxStyle}>
          {activeWorkout.isEditing && (
            <div style={{ marginBottom: '15px' }}>
              <input 
                className="login-input-style" 
                value={activeWorkout.name} 
                onChange={(e) => setActiveWorkout({...activeWorkout, name: e.target.value})} 
                placeholder="Routine Name"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          )}

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
              <div style={{ flex: 2 }}>
                {ex.isOriginal ? (
                  <div 
                    onClick={() => updateExercise(i, 'isOriginal', false)}
                    style={{ 
                      padding: '10px', 
                      background: 'white',
                      borderRadius: '8px', 
                      border: '1px solid #CCD5C0', 
                      color: '#38422B',
                      boxSizing: 'border-box',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    title="Click to change exercise"
                  >
                    <span>{ex.name || "Unknown Exercise"}</span>
                    <span style={{ fontSize: '12px', opacity: 0.5 }}>✏️</span>
                  </div>
                ) : (
                  <ExerciseAutocomplete 
                    initialName={ex.name || ""}
                    onSelect={(selected) => updateExercise(i, 'exerciseId', selected)} 
                  />
                )}
              </div>

              <input type="number" value={ex.weight === 0 ? "" : ex.weight} placeholder="0"
                onChange={(e) => updateExercise(i, 'weight', e.target.value)} 
                style={{flex: 1, width: '40px'}} onFocus={(e) => e.target.select()} />
              <input type="number" value={ex.reps === 0 ? "" : ex.reps} placeholder="0"
                onChange={(e) => updateExercise(i, 'reps', e.target.value)} 
                style={{flex: 1, width: '40px'}} onFocus={(e) => e.target.select()} />
              <input type="number" value={ex.sets === 0 ? "" : ex.sets} placeholder="0"
                onChange={(e) => updateExercise(i, 'sets', e.target.value)} 
                style={{flex: 1, width: '40px'}} onFocus={(e) => e.target.select()} />
              <input type="number" value={ex.time === 0 ? "" : ex.time} placeholder="0"
                onChange={(e) => updateExercise(i, 'time', e.target.value)} 
                style={{flex: 1, width: '40px'}} onFocus={(e) => e.target.select()} />
              
              <button onClick={() => openDeleteModal('exercise', i)} style={deleteBtnStyle}>✕</button>
            </div>
          ))}

          {/* Add Exercise — available in both start and edit modes */}
          <button
            className="counter"
            style={{width: '100%', background: 'transparent', color: '#38422B', border: '1px dashed #38422B', marginBottom: '20px'}} 
            onClick={() => setActiveWorkout({
              ...activeWorkout,
              exercises: [...activeWorkout.exercises, { exerciseId: null, name: "", weight: 0, reps: 0, sets: 0, time: 0 }]
            })}
          >
            + Add Exercise
          </button>

          {showExerciseWarning && (
            <p style={{ color: '#8B0000', fontSize: '14px', margin: '0 0 15px 0', textAlign: 'center', fontWeight: 'bold' }}>
              Please make sure at least one exercise has a valid name before logging your session.
            </p>
          )}

          <div style={{display: 'flex', gap: '10px'}}>
            <button className="counter" style={{background: '#8B0000', flex: 1}} onClick={() => setActiveWorkout(null)}>Exit</button>
            <button className="counter" style={{flex: 2}} onClick={saveWorkout}>
              {activeWorkout.isEditing ? "Save Edits" : "Log Session"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const itemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5F1E8', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #38422B' }
const sessionBoxStyle = { width: '100%', background: '#F5F1E8', padding: '20px', borderRadius: '20px', border: '2px solid #38422B' }
const exerciseRowStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', background: 'white', padding: '10px', borderRadius: '8px' }
const deleteBtnStyle = { width: '30px', height: '30px', minWidth: '30px', minHeight: '30px', borderRadius: '50%', background: '#8B0000', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', lineHeight: '1', fontSize: '16px', flexShrink: 0 }
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalBoxStyle = { background: '#fff', padding: '30px', borderRadius: '15px', textAlign: 'center', width: '300px', border: '2px solid #38422B' }