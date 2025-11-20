import { Settings, Grid3x3, CircleDot } from "lucide-react";

interface DimensionOptionsPanelProps {
  isOpen: boolean;
  orthogonalMode: boolean;
  snapToPoints: boolean;
  onOrthogonalChange: (enabled: boolean) => void;
  onSnapChange: (enabled: boolean) => void;
}

const DimensionOptionsPanel = ({
  isOpen,
  orthogonalMode,
  snapToPoints,
  onOrthogonalChange,
  onSnapChange,
}: DimensionOptionsPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="absolute left-20 top-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 min-w-[280px]">
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
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          💡 Wskazówka: Używaj tych opcji do precyzyjnego wymiarowania modelu
        </p>
      </div>
    </div>
  );
};

export default DimensionOptionsPanel;

