import { useState, useRef, useEffect } from 'react';

const GOTHRAMS = [
  'Agastya', 'Angirasa', 'Apastamba', 'Asvalayana', 'Atri', 'Atreya',
  'Baudhayan', 'Bhadra', 'Bharadwaja', 'Bhargava', 'Bhrigu', 'Bodhayana',
  'Chandratreya', 'Chettunella', 'Chyavana',
  'Dattatreya', 'Devala', 'Devasharma', 'Dhananjaya', 'Durvasa',
  'Ekashringa',
  'Galava', 'Garga', 'Gargya', 'Gautama', 'Gautamayana', 'Gokarna', 'Gopala', 'Govila',
  'Hamsa', 'Haridra', 'Harita', 'Hiranyagarbha',
  'Indrapramati',
  'Jaimini', 'Jamadagni', 'Janakula', 'Jatukarna',
  'Kanva', 'Kapi', 'Kapila', 'Karmanda', 'Kashyapa', 'Katyayana', 'Kaundinya',
  'Kaundilya', 'Kausalya', 'Kauthuma', 'Kaushika', 'Keshava', 'Koundinya',
  'Krishnatreya', 'Kratu', 'Kutsa',
  'Lakshmana', 'Laugakshi', 'Lomasha',
  'Madhava', 'Maitreya', 'Manava', 'Mandavya', 'Marichi', 'Mudgala',
  'Nagula', 'Narayana', 'Nidhruva',
  'Padma', 'Pagidipala', 'Paidipala', 'Paidipalli', 'Palangula', 'Pamidipala',
  'Pamidipalla', 'Parasara', 'Parashara', 'Parnada', 'Pasupuneti', 'Pasupunolla',
  'Pasupunulla', 'Patanjali', 'Poundrika', 'Prachetas', 'Pulaha', 'Pulastya',
  'Pydipala',
  'Rishyashringa', 'Rohita', 'Recharla',
  'Sakalya', 'Shandilya', 'Shankha', 'Shatapatha', 'Shaunaka', 'Shivasharma',
  'Shukla', 'Shukra', 'Soma', 'Somasharma', 'Sounaka', 'Sridhara', 'Srivatsa',
  'Sthaviraka', 'Sudarshana', 'Sumantra', 'Sumedha', 'Suresha',
  'Taittiriya', 'Tapasa', 'Trinayana',
  'Uddalaka', 'Uddhava', 'Ugrasena', 'Upagava', 'Upamanyu',
  'Vaikhanasa', 'Vainateya', 'Vajra', 'Vamadeva', 'Varuna', 'Vasishta',
  'Vasudeva', 'Vatsa', 'Vatsaayana', 'Vedashira', 'Vedavyasa', 'Vikhanasa',
  'Vishnu', 'Vishnuvriddha', 'Vishwamitra',
  'Yajnavalkya', 'Yaska', 'Yatin', 'Yayati', 'Yogeshwara', 'Yogindra',
].sort();

const GothramInput = ({ value, onChange, onBlur, placeholder = 'Search gothram...' }) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef();

  // Sync external value changes
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setHighlighted(-1);
    if (val.trim()) {
      const filtered = GOTHRAMS.filter((g) =>
        g.toLowerCase().startsWith(val.toLowerCase())
      );
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
    } else {
      setSuggestions(GOTHRAMS);
      setOpen(true);
    }
  };

  const handleFocus = () => {
    const filtered = query.trim()
      ? GOTHRAMS.filter((g) => g.toLowerCase().startsWith(query.toLowerCase()))
      : GOTHRAMS;
    setSuggestions(filtered);
    setOpen(filtered.length > 0);
  };

  const handleSelect = (gothram) => {
    setQuery(gothram);
    onChange(gothram);
    setOpen(false);
    setHighlighted(-1);
    onBlur && onBlur(gothram);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff', border: '1.5px solid var(--primary)',
          borderRadius: '0 0 8px 8px', maxHeight: '180px', overflowY: 'auto',
          zIndex: 1000, margin: 0, padding: 0, listStyle: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {suggestions.map((g, i) => (
            <li
              key={g}
              onMouseDown={() => handleSelect(g)}
              style={{
                padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
                background: i === highlighted ? 'var(--primary-light)' : '#fff',
                color: i === highlighted ? 'var(--primary)' : 'var(--text)',
                fontWeight: i === highlighted ? 600 : 400,
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {g}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GothramInput;
