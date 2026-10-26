type Props = {
  name: string;
  size?: number;
  color?: string;
  className?: string;
};

/** Material Symbols Rounded, chargée globalement via index.html. */
export function Icon({ name, size = 20, color, className }: Props) {
  return (
    <span
      className={`ms${className ? ` ${className}` : ''}`}
      style={{ fontSize: size, color }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
