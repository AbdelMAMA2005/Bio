type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
};

export function Switch({ checked, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="switch"
      style={{
        background: checked ? 'linear-gradient(135deg,#4ade80,#a3e635)' : 'var(--pill)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="switch-knob" style={{ left: checked ? 20 : 2 }} />
    </button>
  );
}
