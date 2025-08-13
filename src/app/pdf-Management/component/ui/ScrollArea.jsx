import React from "react";

export function ScrollArea({ className = "", children, ...props }) {
  return (
    <div
      className={`relative overflow-auto rounded-md scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
