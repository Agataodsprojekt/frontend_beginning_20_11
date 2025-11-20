interface DimensionIconProps {
  className?: string;
}

export const DimensionIcon = ({ className = "w-5 h-5" }: DimensionIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Główna linia pozioma */}
      <line x1="4" y1="16" x2="20" y2="16" />
      
      {/* Pionowe kreski na końcach (tick marks) */}
      <line x1="4" y1="13" x2="4" y2="19" />
      <line x1="20" y1="13" x2="20" y2="19" />
      
      {/* Strzałka w lewo */}
      <polyline points="7,16 4,16 7,13" />
      <polyline points="7,16 4,16 7,19" />
      
      {/* Strzałka w prawo */}
      <polyline points="17,16 20,16 17,13" />
      <polyline points="17,16 20,16 17,19" />
      
      {/* Litera X lub linia wymiaru nad strzałkami */}
      <text
        x="12"
        y="10"
        fontSize="8"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontWeight="bold"
      >
        X
      </text>
    </svg>
  );
};

export default DimensionIcon;

