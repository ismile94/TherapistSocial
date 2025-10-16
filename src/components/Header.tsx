import  { Users, Map, User } from 'lucide-react';

interface HeaderProps {
  activeView: 'map' | 'community';
  onViewChange: (view: 'map' | 'community') => void;
  onAccountClick: () => void;
}

function Header({ activeView, onViewChange, onAccountClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">UK Therapist Network</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <nav className="flex space-x-1">
            <button
              onClick={() => onViewChange('map')}
              className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeView === 'map'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Map className="w-4 h-4 mr-2" />
              Map
            </button>
            <button
              onClick={() => onViewChange('community')}
              className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeView === 'community'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Community
            </button>
          </nav>
          
          <button
            onClick={onAccountClick}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <User className="w-4 h-4 mr-2" />
            Account
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
 