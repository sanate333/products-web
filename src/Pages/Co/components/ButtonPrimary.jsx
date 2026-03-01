import React from 'react';

export default function ButtonPrimary({ as = 'button', children, className = '', ...props }) {
  const Component = as;
  return (
    <Component className={`coBtn coBtnPrimary ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
