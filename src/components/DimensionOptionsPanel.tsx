import { Settings, Grid3x3, CircleDot, Move, ArrowRightLeft } from "lucide-react";

interface DimensionOptionsPanelProps {
  isOpen: boolean;
  orthogonalMode: boolean;
  snapToPoints: boolean;
  alignToEdgeMode: 'none' | 'parallel' | 'perpendicular';
  onOrthogonalChange: (enabled: boolean) => void;
  onSnapChange: (enabled: boolean) => void;
  onAlignToEdgeChange: (mode: 'none' | 'parallel' | 'perpendicular') => void;
}

const DimensionOptionsPanel = ({
  isOpen,
  orthogonalMode,
  snapToPoints,
  alignToEdgeMode,
  onOrthogonalChange,
  onSnapChange,
  onAlignToEdgeChange,
}: DimensionOptionsPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="absolute left-20 top-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 min-w-[320px]">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <Settings className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          Opcje wymiarowania
        </h3>
      </div>

      <div className="space-y-4">
        {/* Opcja 1: Wymiary ortogonalne */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={orthogonalMode}
            onChange={(e) => onOrthogonalChange(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
              <span className="font-medium text-gray-800 dark:text-gray-100">
                Wymiary ortogonalne
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Wymiary wyrównane do osi X, Y, Z (prostopadle/równolegle)
            </p>
          </div>
        </label>

        {/* Opcja 2: Snap do punktów charakterystycznych */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={snapToPoints}
            onChange={(e) => onSnapChange(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
              <span className="font-medium text-gray-800 dark:text-gray-100">
                Przyciąganie do punktów
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Automatyczne przyciąganie do wierzchołków, krawędzi i środków elementów
            </p>
          </div>
        </label>

        {/* Opcja 3: Wyrównanie do krawędzi elementu */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">
              Wyrównanie do krawędzi elementu
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-6 -mt-1">
            Wybierz tryb i kliknij na powierzchnię elementu
          </p>
          <div className="flex gap-2 ml-6">
            <button
              onClick={() => onAlignToEdgeChange('none')}
              className={`flex-1 px-3 py-2 text-xs rounded border transition-all ${
                alignToEdgeMode === 'none'
                  ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              Wyłączone
            </button>
            <button
              onClick={() => onAlignToEdgeChange('parallel')}
              className={`flex-1 px-3 py-2 text-xs rounded border transition-all flex items-center justify-center gap-1 ${
                alignToEdgeMode === 'parallel'
                  ? 'bg-green-500 text-white border-green-600 shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" />
              Równolegle
            </button>
            <button
              onClick={() => onAlignToEdgeChange('perpendicular')}
              className={`flex-1 px-3 py-2 text-xs rounded border transition-all ${
                alignToEdgeMode === 'perpendicular'
                  ? 'bg-purple-500 text-white border-purple-600 shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400'
              }`}
            >
              ⊥ Prostopadle
            </button>
          </div>
          {alignToEdgeMode !== 'none' && (
            <div className="ml-6 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                {alignToEdgeMode === 'parallel' && '🟢 Wymiar będzie równoległy do powierzchni'}
                {alignToEdgeMode === 'perpendicular' && '🟣 Wymiar będzie prostopadły do powierzchni'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-lg">⌨️</span>
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Sterowanie:
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
              <li>• <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Shift</kbd> + klik = dodaj punkt wymiaru</li>
              <li>• <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Shift</kbd> + podwójny klik = zaznacz wymiar</li>
              <li>• <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Delete</kbd> = usuń zaznaczony</li>
              <li>• <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd> = anuluj</li>
              <li className="text-green-600 dark:text-green-400 font-medium">• Bez Shift = nawigacja kamerą działa normalnie! 🎥</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DimensionOptionsPanel;

