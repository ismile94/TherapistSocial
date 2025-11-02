import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
  illustration?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, title, description, actions, illustration 
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    {illustration || icon}
    <h3 className="text-lg font-semibold text-gray-900 mt-4">{title}</h3>
    <p className="text-sm text-gray-600 mt-2 max-w-md">{description}</p>
    {actions && actions.length > 0 && (
      <div className="flex gap-3 mt-6">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              action.primary
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    )}
  </div>
);

export default EmptyState;
