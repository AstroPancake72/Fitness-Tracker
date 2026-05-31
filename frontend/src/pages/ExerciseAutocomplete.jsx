import React, { useState, useEffect } from 'react';

export default function ExerciseAutocomplete({ onSelect, initialName }) {
  const [query, setQuery] = useState(initialName || '');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Search logic triggered whenever the user types
  useEffect(() => {
    if (query.length > 1) {
      const fetchExercises = async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/exercises/search?q=${query}`);
          if (response.ok) {
            const data = await response.json();
            setResults(data);
            setIsOpen(true);
          }
        } catch (err) {
          console.error("Search failed", err);
        }
      };
      // Simple debounce to prevent flooding the API
      const timeoutId = setTimeout(fetchExercises, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = (exercise) => {
    setQuery(exercise.name);
    setIsOpen(false);
    // Pass the whole object (including _id) to the parent
    onSelect(exercise); 
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        autoFocus
        placeholder="Search for an exercise..."
        value={query}
        onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value === "") {
                onSelect(null); // Clear the ID in the parent state
            }
            }}
        style={{ ...inputStyle, width: '100%' }}
      />
      
      {isOpen && results.length > 0 && (
        <ul style={dropdownStyle}>
          {results.map((ex) => (
            <li 
              key={ex._id} 
              onClick={() => handleSelect(ex)}
              style={itemStyle}
            >
              {ex.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- STYLES ---
const inputStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #38422B',
  background: '#F5F1E8',
  boxSizing: 'border-box'
};

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  width: '100%',
  background: '#F5F1E8',
  border: '1px solid #38422B',
  borderRadius: '8px',
  listStyle: 'none',
  padding: 0,
  margin: '5px 0 0 0',
  zIndex: 1000,
  maxHeight: '200px',
  overflowY: 'auto'
};

const itemStyle = {
  padding: '10px',
  cursor: 'pointer',
  borderBottom: '1px solid #CCD5C0',
  color: '#38422B'
};