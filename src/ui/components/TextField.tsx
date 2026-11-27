import { Eye, EyeOff } from 'lucide-react';
import { useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface BaseFieldProps {
  label: string;
  optionalLabel?: string;
  hint?: string;
  error?: string | null;
}

type TextFieldProps = BaseFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;

export function TextField({
  label,
  optionalLabel,
  hint,
  error,
  className = '',
  ...rest
}: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>
        <span>{label}</span>
        {optionalLabel ? <span className="field-optional">{optionalLabel}</span> : null}
      </label>
      <input
        id={id}
        className={`field-input ${className}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type PasswordFieldProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>;

export function PasswordField({
  label,
  optionalLabel,
  hint,
  error,
  className = '',
  disabled,
  ...rest
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>
        <span>{label}</span>
        {optionalLabel ? <span className="field-optional">{optionalLabel}</span> : null}
      </label>
      <div className="password-input-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`field-input ${className}`.trim()}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          disabled={disabled}
          {...rest}
        />
        <button
          type="button"
          className="password-toggle-btn"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
        >
          {visible ? (
            <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Eye size={18} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextAreaFieldProps = BaseFieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>;

export function TextAreaField({
  label,
  optionalLabel,
  hint,
  error,
  className = '',
  ...rest
}: TextAreaFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>
        <span>{label}</span>
        {optionalLabel ? <span className="field-optional">{optionalLabel}</span> : null}
      </label>
      <textarea
        id={id}
        className={`field-textarea ${className}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
