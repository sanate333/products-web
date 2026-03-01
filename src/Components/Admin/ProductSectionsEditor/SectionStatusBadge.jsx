import React from 'react';

export default function SectionStatusBadge({ ok }) {
  return (
    <span className={`pseStatusBadge ${ok ? 'ok' : 'missing'}`}>
      {ok ? 'OK' : 'Faltan datos'}
    </span>
  );
}

