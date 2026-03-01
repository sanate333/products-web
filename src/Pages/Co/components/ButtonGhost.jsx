import React from 'react';

export default function ButtonGhost({ as = 'button', children, className = '', ...props }) {
  const Component = as;
  return (
    <Component className={`coBtn coBtnGhost ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
