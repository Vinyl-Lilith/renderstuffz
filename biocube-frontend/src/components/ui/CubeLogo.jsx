// src/components/ui/CubeLogo.jsx
export function CubeLogo({ size = 40, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer hex */}
      <polygon
        points="20,2 36,11 36,29 20,38 4,29 4,11"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      {/* Inner cube faces */}
      {/* Top face */}
      <polygon
        points="20,8 30,14 20,20 10,14"
        fill="currentColor"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      {/* Left face */}
      <polygon
        points="10,14 20,20 20,32 10,26"
        fill="currentColor"
        opacity="0.25"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      {/* Right face */}
      <polygon
        points="30,14 20,20 20,32 30,26"
        fill="currentColor"
        opacity="0.1"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      {/* Center dot */}
      <circle cx="20" cy="20" r="1.5" fill="currentColor" opacity="0.8" />
      {/* Corner dots */}
      <circle cx="20" cy="8" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="10" cy="14" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="30" cy="14" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="32" r="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
