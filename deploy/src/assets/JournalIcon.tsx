const JournalIcon = ({ className = "", size = 24 }: { className?: string; size?: number }) => {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" x2="16" y1="7" y2="7" />
        <line x1="8" x2="16" y1="11" y2="11" />
        <line x1="8" x2="12" y1="15" y2="15" />
      </svg>
    );
  };
  
  export default JournalIcon;