import React from 'react';
import { X, Eye, EyeOff, Trash2, Layers } from 'lucide-react';

export interface SelectedElement {
  expressID: number;
  name: string;
  type: string;
  fragmentId?: string;
}

interface SelectionPanelProps {
  selectedElements: SelectedElement[];
  isIsolated: boolean;
  onClose: () => void;
  onRemoveElement: (expressID: number) => void;
  onClearSelection: () => void;
  onIsolate: () => void;
  onUnisolate: () => void;
  onSelectElement: (expressID: number) => void;
}

export const SelectionPanel: React.FC<SelectionPanelProps> = ({
  selectedElements,
  isIsolated,
  onClose,
  onRemoveElement,
  onClearSelection,
  onIsolate,
  onUnisolate,
  onSelectElement,
}) => {
  return (
    <div className="fixed top-20 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Selekcja i Izolacja
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex gap-2">
          {!isIsolated ? (
            <button
              onClick={onIsolate}
              disabled={selectedElements.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              <Eye className="w-4 h-4" />
              Izoluj ({selectedElements.length})
            </button>
          ) : (
            <button
              onClick={onUnisolate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              <EyeOff className="w-4 h-4" />
              Pokaż wszystkie
            </button>
          )}
          <button
            onClick={onClearSelection}
            disabled={selectedElements.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title="Wyczyść selekcję"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {isIsolated 
            ? "🔍 Widoczne tylko wybrane elementy" 
            : "💡 Kliknij elementy z Ctrl aby dodać do selekcji"}
        </p>
      </div>

      {/* Selected Elements List */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedElements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Brak wybranych elementów</p>
            <p className="text-sm mt-1">
              Kliknij elementy w modelu z Ctrl<br />
              lub użyj wyszukiwarki
            </p>
          </div>
        ) : (
          <>
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              Wybrano: <span className="font-semibold">{selectedElements.length}</span> elementów
            </div>
            <div className="space-y-2">
              {selectedElements.map((element) => (
                <div
                  key={element.expressID}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors group"
                >
                  <button
                    onClick={() => onSelectElement(element.expressID)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {element.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {element.type} • ID: {element.expressID}
                    </div>
                  </button>
                  <button
                    onClick={() => onRemoveElement(element.expressID)}
                    className="ml-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Usuń z selekcji"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold">Ctrl + Klik</span> - dodaj do selekcji
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">Klik na elemencie</span> - podświetl w modelu
          </div>
        </div>
      </div>
    </div>
  );
};

