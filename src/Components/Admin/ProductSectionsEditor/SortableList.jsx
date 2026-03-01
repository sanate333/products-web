import React, { useState } from 'react';

const moveItem = (list, from, to) => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export default function SortableList({
  items,
  onChange,
  renderItem,
  getKey,
  className = '',
}) {
  const [dragIndex, setDragIndex] = useState(-1);

  const reorder = (from, to) => {
    onChange(moveItem(items, from, to));
    setDragIndex(-1);
  };

  return (
    <div className={`pseSortableList ${className}`.trim()}>
      {items.map((item, index) => (
        <div
          key={getKey ? getKey(item, index) : `${index}`}
          className={`pseSortableItem ${dragIndex === index ? 'isDragging' : ''}`}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => reorder(dragIndex, index)}
          onDragEnd={() => setDragIndex(-1)}
        >
          <div className="pseSortControls">
            <button type="button" onClick={() => reorder(index, index - 1)} disabled={index === 0}>
              ↑
            </button>
            <button type="button" onClick={() => reorder(index, index + 1)} disabled={index >= items.length - 1}>
              ↓
            </button>
          </div>
          <div className="pseSortableContent">{renderItem(item, index)}</div>
        </div>
      ))}
    </div>
  );
}

