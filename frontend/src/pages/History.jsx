import { useState, useEffect } from 'react'
import '../App.css'

export default function History() {
  const [workouts, setWorkouts] = useState([])
  const [expandedHistoryId, setExpandedHistoryId] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetId: null })

  
  useEffect(() => {
    fetch("http://localhost:5000/api/workouts", { credentials: 'include' })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setWorkouts(data); })
      .catch(err => console.error("Load error:", err));
  }, [])

  const openDeleteModal = (id) => {
    setDeleteModal({ isOpen: true, targetId: id });
  }

  const confirmDelete = async () => {
    const res = await fetch(`http://localhost:5000/api/workouts/${deleteModal.targetId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      setWorkouts(prev => prev.filter(w => w._id !== deleteModal.targetId));
      if (expandedHistoryId === deleteModal.targetId) setExpandedHistoryId(null);
    }
    setDeleteModal({ isOpen: false, targetId: null });
  }

  return (
    <div className="login-container" style={{maxWidth: '900px'}}>
      {deleteModal.isOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this past workout log?</p>
            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
              <button className="counter" style={{flex: 1, background: '#8B0000'}} onClick={confirmDelete}>Delete</button>
              <button className="counter" style={{flex: 1, background: '#ccc', color: '#000'}} onClick={() => setDeleteModal({isOpen: false})}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <h1>Workout History</h1>

      <div style={{ width: '100%' }}>
        {workouts.length === 0 ? (
          <p style={{textAlign: 'center', color: '#666'}}>No logged workouts found.</p>
        ) : (
          workouts.map(log => {
            const isExpanded = expandedHistoryId === log._id;
            return (
              <div key={log._id} style={{...itemStyle, flexDirection: 'column', alignItems: 'stretch', gap: '10px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{textAlign: 'left'}}>
                    <div style={{fontWeight: 'bold', fontSize: '18px'}}>{log.name}</div>
                    <div style={{fontSize: '12px', color: '#666'}}>
                      {new Date(log.datetime).toLocaleDateString()} at {new Date(log.datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <button className="counter" onClick={() => setExpandedHistoryId(isExpanded ? null : log._id)}>
                      {isExpanded ? "Hide" : "View"}
                    </button>
                    <button className="counter" style={{background: '#8B0000', ...deleteBtnStyle}} onClick={() => openDeleteModal(log._id)}>✕</button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{marginTop: '10px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #38422B'}}>
                    <div style={{display: 'flex', fontWeight: 'bold', paddingBottom: '5px', fontSize: '13px', color: '#38422B', textAlign: 'left'}}>
                      <span style={{flex: 2}}>name</span>
                      <span style={{flex: 1}}>weight</span>
                      <span style={{flex: 1}}>reps</span>
                      <span style={{flex: 1}}>sets</span>
                      <span style={{flex: 1}}>time</span>
                    </div>
                    <hr style={{margin: '5px 0 10px 0', border: '1px solid #38422B'}} />
                    {log.exercises.map((ex, idx) => (
                      <div key={idx} style={{display: 'flex', textAlign: 'left', padding: '6px 0', fontSize: '14px', borderBottom: '1px dashed #eee'}}>
                        <span style={{flex: 2, fontWeight: '500'}}>{ex.name || 'Unnamed Exercise'}</span>
                        <span style={{flex: 1}}>{ex.weight} lbs</span>
                        <span style={{flex: 1}}>{ex.reps} reps</span>
                        <span style={{flex: 1}}>{ex.sets} sets</span>
                        <span style={{flex: 1}}>{ex.time || 0} min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const itemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5F1E8', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #38422B' }
const deleteBtnStyle = { width: '30px', height: '30px', minWidth: '30px', minHeight: '30px', borderRadius: '50%', background: '#8B0000', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', lineHeight: '1', fontSize: '16px', flexShrink: 0 }
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalBoxStyle = { background: '#fff', padding: '30px', borderRadius: '15px', textAlign: 'center', width: '300px', border: '2px solid #38422B' }