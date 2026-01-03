import React from "react";

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

/**
 * Component that highlights matching text within a string
 */
const HighlightText = ({ text, query, className = "" }: HighlightTextProps) => {
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return isMatch ? (
          <mark
            key={index}
            className="bg-primary/30 text-foreground rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </span>
  );
};

/**
 * Escape special regex characters in a string
 */
const escapeRegex = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export default HighlightText;
