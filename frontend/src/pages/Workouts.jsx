import { useState, useEffect } from 'react'
import '../App.css'
import ExerciseAutocomplete from "./ExerciseAutocomplete";

export default function Workouts({ activeWorkout, setActiveWorkout, masterExerciseList = [] }) {
  const [workouts, setWorkouts] = useState([])
  const [newRoutineName, setNewRoutineName] = useState("")
  const [showAddRoutine, setShowAddRoutine] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetId: null, type: null, index: null })
  const [showNameWarning, setShowNameWarning] = useState(false); 
  const [showExerciseWarning, setShowExerciseWarning] = useState(false);
  const [saveTemplateBanner, setSaveTemplateBanner] = useState(false);

  const fetchWorkouts = () => {
    fetch("http://localhost:5000/api/workouts", { credentials: 'include' })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setWorkouts(data); })
      .catch(err => console.error("Load error:", err));
  };

  useEffect(() => {
    fetchWorkouts();
  }, [])

 const displayRoutines = workouts.filter(w => {
  if (w.isTemplate === true) return true;
    if (w.isTemplate === false) return false;
  const hasNoLoggedStats = w.exercises && w.exercises.every(ex => (ex.weight || 0) === 0);
  return hasNoLoggedStats;
});

  const uniqueRoutines = displayRoutines.reduce((acc, current) => {
    if (!current.name) return acc;
    
    const existingIndex = acc.findIndex(
      item => item._id === current._id || item.name.trim().toLowerCase() === current.name.trim().toLowerCase()
    );
    
    if (existingIndex === -1) {
      acc.push(current);
    } else {
      const existingItem = acc[existingIndex];
      
      if (current.isSuggested && !existingItem.isSuggested) {
        acc[existingIndex] = current;
      } 
      else if (!existingItem.isSuggested && current.isTemplate && !existingItem.isTemplate) {
        acc[existingIndex] = current;
      } else if (!existingItem.isSuggested && new Date(current.datetime) > new Date(existingItem.datetime) && (current.isTemplate === existingItem.isTemplate)) {
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
      isSuggested: routine.isSuggested || false, 
      exercises: routine.exercises.map(ex => ({ ...ex, instructions: ex.instructions || "", isOriginal: false }))
    });
  }

  function startWorkout(baseline) {
    const newExercises = baseline.exercises.map(ex => ({
      ...ex,
      weight: ex.weight || 0,
      reps: ex.reps || 0,
      sets: ex.sets || 0,
      time: ex.time || 0,
      instructions: ex.instructions || "",
      isOriginal: true
    }));

    if (!activeWorkout) {
      setActiveWorkout({
        isEditing: false,
        templateId: baseline._id,
        name: baseline.name,
        isSuggested: baseline.isSuggested || false,
        exercises: newExercises
      });
      return;
    }

    const choice = window.confirm(
      `You already have "${activeWorkout.name}" in progress.\n\nClick OK to append "${baseline.name}" to your current session.\nClick Cancel to discard your current session and start fresh.`
    );

    if (choice) {
      setActiveWorkout({
        ...activeWorkout,
        exercises: [
          ...activeWorkout.exercises,
          ...newExercises
        ]
      });
    } else {
      setActiveWorkout({
        isEditing: false,
        templateId: baseline._id,
        name: baseline.name,
        isSuggested: baseline.isSuggested || false,
        exercises: newExercises
      });
    }
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
      if (res.ok) fetchWorkouts();
    } else {
      const updated = activeWorkout.exercises.filter((_, i) => i !== deleteModal.index);
      setActiveWorkout({ ...activeWorkout, exercises: updated });
    }
    setDeleteModal({ isOpen: false, targetId: null, type: null, index: null });
  }

  const updateExercise = (index, field, value) => {
    const updated = [...activeWorkout.exercises];
    if (field === 'name') {
      updated[index][field] = value;
    } else {
      updated[index][field] = value === "" ? "" : Number(value);
    }
    setActiveWorkout({ ...activeWorkout, exercises: updated });
  }

  async function saveWorkout() {
    const allValidExercises = activeWorkout.exercises.filter(ex => ex.name.trim() !== "");
    if (allValidExercises.length === 0) {
      setShowExerciseWarning(true);
      return;
    }

    const cleanedExercises = allValidExercises.map(({ isOriginal, ...rest }) => ({
      ...rest,
      weight: rest.weight === "" ? 0 : Number(rest.weight),
      reps: rest.reps === "" ? 0 : Number(rest.reps),
      sets: rest.sets === "" ? 0 : Number(rest.sets),
      time: rest.time === "" ? 0 : Number(rest.time),
      instructions: rest.instructions || ""
    }));

    try {
      if (activeWorkout.isEditing) {
        const url = activeWorkout._id
          ? `http://localhost:5000/api/workouts/${activeWorkout._id}`
          : "http://localhost:5000/api/workouts";
        const method = activeWorkout._id ? "PUT" : "POST";
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: activeWorkout.name,
            datetime: activeWorkout.originalDate || new Date(),
            exercises: cleanedExercises,
            isTemplate: true,
            isSuggested: activeWorkout.isSuggested || false 
          }),
        });
        setActiveWorkout(null);
        fetchWorkouts();
        return;
      }

      // Log as history entry
      await fetch("http://localhost:5000/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: activeWorkout.name,
          datetime: new Date(),
          exercises: cleanedExercises,
          isTemplate: false,
          isSuggested: activeWorkout.isSuggested || false 
        }),
      });

      setActiveWorkout(null);
      setShowExerciseWarning(false);
      fetchWorkouts();
    } catch (err) {
      console.error("Save error:", err);
    }
  }

  async function saveTemplate() {
    const allValidExercises = activeWorkout.exercises.filter(ex => ex.name.trim() !== "");
    if (allValidExercises.length === 0) return;

    try {
      const cleanedExercises = allValidExercises.map(({ isOriginal, ...rest }) => ({
        ...rest,
        weight: rest.weight === "" ? 0 : Number(rest.weight),
        reps: rest.reps === "" ? 0 : Number(rest.reps),
        sets: rest.sets === "" ? 0 : Number(rest.sets),
        time: rest.time === "" ? 0 : Number(rest.time),
        instructions: rest.instructions || ""
      }));

      const url = activeWorkout.templateId
        ? `http://localhost:5000/api/workouts/${activeWorkout.templateId}`
        : "http://localhost:5000/api/workouts";
      const method = activeWorkout.templateId ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: activeWorkout.name,
          datetime: new Date(),
          exercises: cleanedExercises,
          isTemplate: true,
          isSuggested: activeWorkout.isSuggested || false
        }),
      });

      fetchWorkouts();
      setSaveTemplateBanner(true);
      setTimeout(() => setSaveTemplateBanner(false), 2500);
    } catch (err) {
      console.error("Template save error:", err);
    }
  }

  return (
    <div className="login-container" style={{maxWidth: '900px', overflow: 'visible'}}>
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

      <h1>{activeWorkout ? (activeWorkout.isEditing ? `Editing Template: ${activeWorkout.name}` : `Active Session: ${activeWorkout.name}`) : "My Workouts"}</h1>

      {!activeWorkout ? (
        <div style={{ width: '100%' }}>
          {!showAddRoutine ? (
            <button data-testid="create-template-btn" name="Create New Routine Template" className="counter" style={{width: '100%', marginBottom: '20px'}} onClick={() => setShowAddRoutine(true)}>
              + Create New Routine Template
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
                  style={{ marginTop: '-5px', marginBottom: '15px' }}
                />
                <button
                  className="counter"
                  onClick={() => {
                    if (!newRoutineName.trim()) {
                      setShowNameWarning(true);
                      return;
                    }
                    setActiveWorkout({isEditing: true, name: newRoutineName, exercises: [{name: "", weight: 0, reps: 0, sets: 0, time: 0}]});
                    setShowAddRoutine(false);
                    setNewRoutineName("");
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {uniqueRoutines.map(r => (
            <div key={r._id} style={itemStyle}>
              <div style={{textAlign: 'left'}}>
                <div style={{fontWeight: 'bold', fontSize: '18px', textTransform: 'capitalize'}}>{r.name}</div>
                <div style={{fontSize: '12px', color: '#666'}}>
                  {r.isSuggested ? "Recommended" : "Custom"}
                </div>
              </div>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button data-testid={`start-workout-${r._id}`} className="counter" onClick={() => startWorkout(r)}>Start</button>
                <button className="counter" onClick={() => editWorkout(r)}>Edit</button>
                <button className="counter" style={{background: '#8B0000', ...deleteBtnStyle}} onClick={() => openDeleteModal('routine', r._id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {activeWorkout.exercises.some(ex => ex.instructions) && (
            <div style={{
              textAlign: 'left',
              fontSize: '13px',
              color: '#38422B',
              background: '#EAEFE3',
              padding: '12px 15px',
              borderRadius: '12px',
              border: '1px solid #38422B',
              borderLeft: '5px solid #38422B',
              lineHeight: '1.5',
              marginBottom: '15px',
              boxSizing: 'border-box',
              width: '100%'
            }}>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>Exercise Guide Instructions:</strong>
              {activeWorkout.exercises.map((ex, idx) => ex.instructions ? (
                <div key={idx} style={{ margin: '4px 0' }}>
                  <strong>{ex.name || "Exercise"}:</strong> {ex.instructions}
                </div>
              ) : null)}
            </div>
          )}

          <div style={sessionBoxStyle}>
            <div style={{ marginBottom: '15px' }}>
              <input
                className="login-input-style"
                value={activeWorkout.name}
                onChange={(e) => setActiveWorkout({...activeWorkout, name: e.target.value})}
                placeholder="Session Name"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div className="exercise-row-grid" style={{ fontWeight: 'bold', padding: '10px 10px 5px 10px', textAlign: 'center', fontSize: '14px' }}>
              <span>Name</span>
              <span>Weight</span>
              <span>Reps</span>
              <span>Sets</span>
              <span>Time (min)</span>
              <span></span>
            </div>
            <hr style={{ border: '1px solid #38422B', marginBottom: '10px', marginTop: '0' }} />

            {activeWorkout.exercises.map((ex, i) => {
              const isFieldDisabled = false;

              return (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div className="exercise-row-grid" style={{
                    ...exerciseRowStyle,
                    opacity: isFieldDisabled ? 0.85 : 1,
                    marginBottom: '0',
                    padding: isFieldDisabled ? '8px 10px' : '10px',
                  }}>
                    {isFieldDisabled ? (
                      <input 
                        type="text"
                        className="exercise-input exercise-name-input"
                        value={ex.name}
                        readOnly
                        style={{ fontWeight: 'bold', textTransform: 'capitalize', cursor: 'default' }}
                      />
                    ) : (
                      <ExerciseAutocomplete
                        value={ex.name}
                        className="exercise-input exercise-name-input"
                        onChange={(val) => updateExercise(i, 'name', val)}
                        masterList={masterExerciseList}
                        placeholder="Exercise..."
                      />
                    )}

                    <input className="exercise-input" type="number" value={ex.weight === 0 ? "" : ex.weight} placeholder="0" onChange={(e) => updateExercise(i, 'weight', e.target.value)} disabled={isFieldDisabled} onFocus={(e) => e.target.select()} />
                    <input className="exercise-input" type="number" value={ex.reps === 0 ? "" : ex.reps} placeholder="0" onChange={(e) => updateExercise(i, 'reps', e.target.value)} disabled={isFieldDisabled} onFocus={(e) => e.target.select()} />
                    <input className="exercise-input" type="number" value={ex.sets === 0 ? "" : ex.sets} placeholder="0" onChange={(e) => updateExercise(i, 'sets', e.target.value)} disabled={isFieldDisabled} onFocus={(e) => e.target.select()} />
                    <input className="exercise-input" type="number" value={ex.time === 0 ? "" : ex.time} placeholder="0" onChange={(e) => updateExercise(i, 'time', e.target.value)} disabled={isFieldDisabled} onFocus={(e) => e.target.select()} />

                    {!isFieldDisabled ? (
                      <button onClick={() => openDeleteModal('exercise', i)} style={deleteBtnStyle}>✕</button>
                    ) : (
                      <span style={{width: '30px'}}></span>
                    )}
                  </div>
                </div>
              );
            })}

            {saveTemplateBanner && (
              <div style={{ background: '#E1EAD6', color: '#38422B', padding: '10px', borderRadius: '8px', 
                borderLeft: '4px solid #38422B', marginBottom: '12px', fontWeight: 'bold', fontSize: '13px' }}>
                ✓ Template updated!
              </div>
            )}
            
            <button className="counter" style={{flex: 2}} onClick={() => setActiveWorkout({...activeWorkout, exercises: [...activeWorkout.exercises, {name: "", weight: 0, reps: 0, sets: 0, time: 0}]})}>
              + Add Exercise
            </button>
            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
              <button className="counter" style={{background: '#8B0000', flex: 1}} onClick={() => setActiveWorkout(null)}>
                Exit
              </button>
              
              {!activeWorkout.isEditing && (
                <button className="counter" style={{flex: 1, background: 'transparent', color: '#38422B', border: '1px solid #38422B' }} 
                  onClick={saveTemplate}>
                  Save Template
                </button>
              )}
              
              <button data-testid="save-session-btn" className="counter" style={{flex: 2}} onClick={saveWorkout}>
                {activeWorkout.isEditing ? "Save Template Config" : "Log Session to History"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const itemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5F1E8', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #38422B' }
const sessionBoxStyle = { width: '100%', background: '#F5F1E8', padding: '20px', borderRadius: '20px', border: '2px solid #38422B', overflow: 'visible' }
const exerciseRowStyle = { background: 'white', borderRadius: '8px', overflow: 'visible' }
const deleteBtnStyle = { width: '30px', height: '30px', minWidth: '30px', minHeight: '30px', borderRadius: '50%', background: '#8B0000', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', lineHeight: '1', fontSize: '16px', flexShrink: 0 }
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalBoxStyle = { background: '#fff', padding: '30px', borderRadius: '15px', textAlign: 'center', width: '300px', border: '2px solid #38422B' }