import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function ExerciseAutocompleteInput({ value, onChange, masterList = [], style = {}, placeholder = "Exercise..." }) {
  const [dropdown, setDropdown] = useState([]);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdown([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(e) {
    const query = e.target.value;
    onChange(query);
    if (!query.trim() || masterList.length === 0) {
      setDropdown([]);
      return;
    }
    const matches = masterList
      .filter(name => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);

    // Calculate position for the portal dropdown
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 280)
      });
    }

    setDropdown(matches);
  }

  function handleSelect(name) {
    onChange(name);
    setDropdown([]);
  }

  return (
    <div ref={containerRef} style={{ position: "relative", flex: style.flex ?? 2, ...style }}>
      <input className="exercise-input exercise-name-input"
        ref={inputRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
      {dropdown.length > 0 && createPortal(
        <div style={{
          position: "absolute",
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          background: "#F5F1E8",
          border: "1px solid #38422B",
          borderRadius: "10px",
          zIndex: 9999,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          {dropdown.map((name, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(name)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#38422B",
                textTransform: "capitalize",
                borderBottom: i < dropdown.length - 1 ? "1px solid #CCD5C0" : "none",
                background: "#F5F1E8",
                lineHeight: "1.4",
                wordBreak: "break-word",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#CCD5C0"}
              onMouseLeave={e => e.currentTarget.style.background = "#F5F1E8"}
            >
              {name}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}