'use client';

import PropTypes from 'prop-types';

const Button = ({
                  children,
                  disabled = false,
                  className = '',
                  onClick,
                  ...rest }) => (
  <button
    {...rest}
    disabled={disabled}
    className={`border-2 border-foreground hover:bg-cyan-900 p-3 ${className} ${disabled ? 'bg-gray-800 hover:bg-gray-800 cursor-not-allowed' : ''}`}
    onClick={onClick}
  >
    {children}
  </button>
);

Button.propTypes = {
  disabled: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func
}

export default Button;
