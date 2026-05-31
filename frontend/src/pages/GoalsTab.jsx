import React, { useState, useEffect } from 'react';
import '../App.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const MACRO_CATEGORIES = [
  {
    value: 'STRENGTH',
    label: 'Strength & Power',
    description: 'Low-rep, high-weight compound movements',
    icon: '🏋️',
  },
  {
    value: 'HYPERTROPHY',
    label: 'Hypertrophy (Muscle Building)',
    description: 'Moderate weight, 8–12 reps, volume-focused',
    icon: '💪',
  },
  {
    value: 'CARDIOVASCULAR',
    label: 'Cardiovascular Endurance',
    description: 'Running, cycling, HIIT',
    icon: '🏃',
  },
  {
    value: 'BODY_COMPOSITION',
    label: 'Body Composition',
    description: 'Caloric expenditure and muscle preservation',
    icon: '⚖️',
  },
  {
    value: 'CONSISTENCY',
    label: 'Consistency & Mobility',
    description: 'Habit-building, flexibility, low-barrier routines',
    icon: '🧘',
  },
];

const MICRO_TYPES = [
  { value: '1RM',        label: '1-Rep Max Target',       unit: 'lbs',       placeholder: 'e.g., 315',  needsExercise: true  },
  { value: 'ENDURANCE',  label: 'Endurance Target',       unit: 'mins',      placeholder: 'e.g., 25',   needsExercise: true  },
  { value: 'BODYWEIGHT', label: 'Bodyweight Target',      unit: 'lbs',       placeholder: 'e.g., 180',  needsExercise: false },
  { value: 'VOLUME',     label: 'Volume / Streak Target', unit: 'workouts',  placeholder: 'e.g., 15',   needsExercise: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getMacroMeta = (category) =>
  MACRO_CATEGORIES.find((c) => c.value === category) ?? { label: category, icon: '🎯' };

const formatPct = (current, target) => {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ pct }) {
  return (
    <div style={progressBarTrackStyle}>
      <div style={{ ...progressBarFillStyle, width: `${pct}%` }} />
    </div>
  );
}

function MacroGoalCard({ goal, onComplete, onDelete }) {
  const meta = getMacroMeta(goal.macroCategory);
  return (
    <div style={{ ...goalCardStyle, borderLeft: '4px solid #38422B' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '22px', marginBottom: '4px' }}>{meta.icon}</div>
          <h3 style={{ margin: 0, color: '#38422B', fontSize: '17px' }}>{meta.label}</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>{meta.description}</p>
        </div>
        <span style={goalBadgeStyle}>Goal</span>
      </div>

      <div style={{
        marginTop: '14px',
        padding: '10px 14px',
        background: 'rgba(159,184,115,0.15)',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#38422B',
      }}>
          Workout suggestions for this goal will appear here once the recommendation engine is live.
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <button onClick={() => onComplete(goal._id)} style={{ ...actionButtonStyle, background: '#9FB873' }}>
          ✓ Complete
        </button>
        <button onClick={() => onDelete(goal._id)} style={{ ...actionButtonStyle, background: '#ccc', color: '#333' }}>
          Remove
        </button>
      </div>
    </div>
  );
}

function MicroGoalCard({ goal, onComplete, onDelete }) {
  const mt = goal.microTarget ?? {};
  const exerciseName = mt.exerciseId?.name ?? null;
  const displayPct = typeof mt.currentValue === 'number'
    ? formatPct(mt.currentValue, mt.targetMetric)
    : 0;

  const label = exerciseName
    ? `${exerciseName} — ${mt.targetMetric} ${mt.metricUnit}`
    : `${mt.targetMetric} ${mt.metricUnit}`;

  return (
    <div style={{ ...goalCardStyle, borderLeft: '4px solid #9FB873' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <span style={targetBadgeStyle}>Target</span>
          <h3 style={{ margin: '6px 0 0', color: '#38422B', fontSize: '16px' }}>{label}</h3>
        </div>
        <span style={{ fontWeight: 'bold', color: '#9FB873', fontSize: '20px' }}>{displayPct}%</span>
      </div>

      <ProgressBar pct={displayPct} />

      <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
        Current: <strong style={{ color: '#38422B' }}>{mt.currentValue ?? '—'} {mt.metricUnit}</strong>
        {' '}/ Target: <strong style={{ color: '#38422B' }}>{mt.targetMetric} {mt.metricUnit}</strong>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <button onClick={() => onComplete(goal._id)} style={{ ...actionButtonStyle, background: '#9FB873' }}>
          ✓ Complete
        </button>
        <button onClick={() => onDelete(goal._id)} style={{ ...actionButtonStyle, background: '#ccc', color: '#333' }}>
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Creation Forms ───────────────────────────────────────────────────────────

function GoalForm({ onSubmit, onCancel }) {
  const [macroCategory, setMacroCategory] = useState('STRENGTH');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ goalType: 'GOAL', macroCategory });
  };

  return (
    <form onSubmit={handleSubmit} style={formContainerStyle}>
      <h3 style={{ marginTop: 0, color: '#38422B' }}>Set a Goal</h3>
      <p style={{ fontSize: '13px', color: '#666', marginTop: '-8px' }}>
        Goals shape your workout recommendations. Pick the outcome you're training toward.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {MACRO_CATEGORIES.map((cat) => (
          <label
            key={cat.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: `2px solid ${macroCategory === cat.value ? '#38422B' : 'transparent'}`,
              background: macroCategory === cat.value ? 'rgba(56,66,43,0.08)' : '#F5F1E8',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="radio"
              name="macroCategory"
              value={cat.value}
              checked={macroCategory === cat.value}
              onChange={() => setMacroCategory(cat.value)}
              style={{ display: 'none' }}
            />
            <span style={{ fontSize: '22px' }}>{cat.icon}</span>
            <div>
              <div style={{ fontWeight: 'bold', color: '#38422B', fontSize: '14px' }}>{cat.label}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{cat.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" style={{ ...primaryButtonStyle, flex: 1 }}>Save Goal</button>
        <button type="button" onClick={onCancel} style={{ ...secondaryButtonStyle, flex: 1 }}>Cancel</button>
      </div>
    </form>
  );
}

function TargetForm({ exercises, onSubmit, onCancel }) {
  const [microType, setMicroType] = useState('1RM');
  const [exerciseId, setExerciseId] = useState('');
  const [targetMetric, setTargetMetric] = useState('');

  const typeMeta = MICRO_TYPES.find((t) => t.value === microType);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      goalType: 'TARGET',
      microTarget: {
        ...(typeMeta.needsExercise && exerciseId ? { exerciseId } : {}),
        targetMetric: Number(targetMetric),
        metricUnit: typeMeta.unit,
        currentValue: 0,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} style={formContainerStyle}>
      <h3 style={{ marginTop: 0, color: '#38422B' }}>Set a Target</h3>
      <p style={{ fontSize: '13px', color: '#666', marginTop: '-8px' }}>
        Targets track specific metrics over time with progress bars and charts.
      </p>

      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>Metric Type</label>
        <select
          value={microType}
          onChange={(e) => { setMicroType(e.target.value); setExerciseId(''); }}
          style={inputStyle}
        >
          {MICRO_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {typeMeta.needsExercise && (
        <div style={{ marginBottom: '15px' }}>
          <label style={labelStyle}>Exercise</label>
          {exercises.length > 0 ? (
            <select
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">— Select an exercise —</option>
              {exercises.map((ex) => (
                <option key={ex._id} value={ex._id}>{ex.name}</option>
              ))}
            </select>
          ) : (
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
              No exercises in the database yet. Add some first.
            </p>
          )}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>
          Target Value <span style={{ fontWeight: 'normal', color: '#888' }}>({typeMeta.unit})</span>
        </label>
        <input
          type="number"
          placeholder={typeMeta.placeholder}
          value={targetMetric}
          onChange={(e) => setTargetMetric(e.target.value)}
          style={inputStyle}
          required
          min="0"
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" style={{ ...primaryButtonStyle, flex: 1 }}>Save Target</button>
        <button type="button" onClick={onCancel} style={{ ...secondaryButtonStyle, flex: 1 }}>Cancel</button>
      </div>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GoalsTab() {
  const [goals, setGoals] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState('none'); // 'none' | 'goal' | 'target'

  useEffect(() => {
    fetchGoals();
    fetchExercises();
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/goals", { credentials: "include" });
      if (res.ok) setGoals(await res.json());
    } catch (err) {
      console.error('Error fetching goals', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/exercises", { credentials: "include" });
      if (res.ok) setExercises(await res.json());
    } catch (err) {
      console.error('Error fetching exercises', err);
    }
  };

  const handleCreateGoal = async (body) => {
    try {
      const res = await fetch("http://localhost:5000/api/goals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) { setFormMode('none'); fetchGoals(); }
    } catch (err) {
      console.error('Error creating goal', err);
    }
  };

  const handleComplete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/goals/${id}`, {
        method: 'PATCH',
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) fetchGoals();
    } catch (err) {
      console.error("Complete failed", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/goals/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) fetchGoals();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const activeGoals    = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');
  
  // FIXED: Catches both 'GOAL' and 'COMPLETION' so things appear in the list instantly
  const macroGoals     = activeGoals.filter(g => g.goalType === 'GOAL' || g.goalType === 'COMPLETION');
  const microGoals     = activeGoals.filter(g => g.goalType === 'TARGET');

  if (loading) {
    return <div style={{ padding: '2rem', color: '#38422B', fontWeight: 'bold' }}>Loading Goals...</div>;
  }

  return (
    <div className="login-container" style={{ maxWidth: '800px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', gap: '15px', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#38422B', margin: 0 }}>
          My Goals
        </h1>
        {completedGoals.length > 0 && (
            <span style={completedBadgeStyle}>🎉 {completedGoals.length} Completed</span>
          )}
        
        {formMode === 'none' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setFormMode('goal')} style={primaryButtonStyle}>
              + Goal
            </button>
            <button onClick={() => setFormMode('target')} style={outlineButtonStyle}>
              + Target
            </button>
          </div>
        )}
      </div>

      {/* FORMS */}
      {formMode === 'goal' && (
        <GoalForm onSubmit={handleCreateGoal} onCancel={() => setFormMode('none')} />
      )}
      {formMode === 'target' && (
        <TargetForm exercises={exercises} onSubmit={handleCreateGoal} onCancel={() => setFormMode('none')} />
      )}

      {/* EMPTY STATE */}
      {activeGoals.length === 0 && formMode === 'none' && (
        <div style={emptyStateStyle}>
          <p style={{ color: '#38422B', fontWeight: 'bold', margin: 0 }}>No active goals yet.</p>
          <p style={{ color: '#666', margin: '6px 0 0' }}>
            Add a <strong>Goal</strong> to drive your workout recommendations, or a <strong>Target</strong> to track a specific metric.
          </p>
        </div>
      )}

      {/* MACRO GOALS */}
      {macroGoals.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <SectionHeading>🎯 Goals</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {macroGoals.map(goal => (
              <MacroGoalCard key={goal._id} goal={goal} onComplete={handleComplete} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {/* MICRO GOALS */}
      {microGoals.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <SectionHeading>📈 Targets</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {microGoals.map(goal => (
              <MicroGoalCard key={goal._id} goal={goal} onComplete={handleComplete} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {/* COMPLETED */}
      {completedGoals.length > 0 && (
        <section>
          <SectionHeading>✅ Completed </SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {completedGoals.map(goal => {
              const isMacro = goal.goalType === 'GOAL' || goal.goalType === 'COMPLETION';
              const meta = isMacro ? getMacroMeta(goal.macroCategory) : null;
              const mt = goal.microTarget ?? {};
              const label = isMacro
                ? `${meta.icon} ${meta.label}`
                : (mt.exerciseId?.name
                    ? `${mt.exerciseId.name} — ${mt.targetMetric} ${mt.metricUnit}`
                    : `${mt.targetMetric} ${mt.metricUnit}`);

              return (
                <div key={goal._id} style={{ ...goalCardStyle, opacity: 0.7, borderLeft: '4px solid #9FB873' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={isMacro ? goalBadgeStyle : targetBadgeStyle}>
                        {isMacro ? 'Goal' : 'Target'}
                      </span>
                      <p style={{ margin: '4px 0 0', fontWeight: 'bold', color: '#38422B' }}>{label}</p>
                    </div>
                    <span style={{ fontSize: '20px' }}>🎉</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <h2 style={{
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#38422B',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '12px',
      paddingBottom: '6px',
      borderBottom: '1px solid #CCD5C0',
    }}>
      {children}
    </h2>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const primaryButtonStyle = {
  background: '#38422B',
  color: '#F5F1E8',
  border: 'none',
  padding: '15px 30px', 
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '15px',      
  whiteSpace: 'nowrap'  
};

const secondaryButtonStyle = {
  background: '#F5F1E8',
  color: '#38422B',
  border: '2px solid #38422B', 
  padding: '15px 30px', 
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '15px',
  whiteSpace: 'nowrap'
};

const outlineButtonStyle = {
  background: 'transparent',
  color: '#38422B',
  border: '2px solid #38422B',
  padding: '15px 24px',
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '15px',
  whiteSpace: 'nowrap'
};

const actionButtonStyle = {
  flex: 1,
  padding: '9px',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '13px',
};

const formContainerStyle = {
  background: '#CCD5C0',
  padding: '22px',
  borderRadius: '12px',
  border: '1px solid #38422B',
  marginBottom: '24px',
};

const labelStyle = {
  display: 'block',
  fontWeight: 'bold',
  color: '#38422B',
  marginBottom: '6px',
  fontSize: '14px',
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #38422B',
  background: '#F5F1E8',
  boxSizing: 'border-box',
  outline: 'none',
  fontSize: '14px',
};

const goalCardStyle = {
  background: '#F5F1E8',
  padding: '18px 20px',
  borderRadius: '12px',
  border: '1px solid #CCD5C0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const progressBarTrackStyle = {
  width: '100%',
  height: '14px',
  background: '#CCD5C0',
  borderRadius: '8px',
  overflow: 'hidden',
};

const progressBarFillStyle = {
  height: '100%',
  background: '#9FB873',
  borderRadius: '8px',
  transition: 'width 0.5s ease-in-out',
};

const goalBadgeStyle = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 'bold',
  background: '#38422B',
  color: '#F5F1E8',
  padding: '2px 8px',
  borderRadius: '20px',
  letterSpacing: '0.05em',
};

const targetBadgeStyle = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 'bold',
  background: '#9FB873',
  color: '#38422B',
  padding: '2px 8px',
  borderRadius: '20px',
  letterSpacing: '0.05em',
};

const completedBadgeStyle = {
  fontSize: '14px',
  background: '#9FB873',
  color: '#F5F1E8',
  padding: '4px 10px',
  borderRadius: '20px',
  fontWeight: 'bold',
  marginLeft: '12px',
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '40px',
  background: '#F5F1E8',
  borderRadius: '12px',
  border: '1px dashed #38422B',
};