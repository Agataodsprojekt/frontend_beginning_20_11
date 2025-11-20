import { useEffect, useRef, useState } from "react";
import * as OBC from "openbim-components";
import * as THREE from "three";
import ActionBar from "../components/ActionBar";
import CommentPanel from "../components/CommentPanel";
import DimensionOptionsPanel from "../components/DimensionOptionsPanel";
import { SearchPanel } from "../components/SearchPanel";
import { SelectionPanel, SelectedElement } from "../components/SelectionPanel";
import { useTheme } from "../contexts/ThemeContext";
import { useComments } from "../hooks/useComments";
import { SimpleDimensionTool } from "../utils/SimpleDimensionTool";

const Viewer = () => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OBC.Components | null>(null);
  const [activeAction, setActiveAction] = useState<string>("move");
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | undefined>();
  const [selectedElementName, setSelectedElementName] = useState<string | undefined>();
  const { theme } = useTheme();
  const { comments, addComment, deleteComment, getAllComments } = useComments();
  const highlighterRef = useRef<OBC.FragmentHighlighter | null>(null);
  const dimensionsRef = useRef<SimpleDimensionTool | null>(null);
  const modelObjectsRef = useRef<THREE.Object3D[]>([]);
  
  // Stan dla pinowania elementów
  const [isPinMode, setIsPinMode] = useState(false);
  const [selectedPinColor, setSelectedPinColor] = useState("#FF0000");
  const [pinnedElements, setPinnedElements] = useState<Map<string, string>>(new Map());
  const isPinModeRef = useRef(isPinMode);
  const selectedPinColorRef = useRef(selectedPinColor);
  
  // Stan dla wymiarowania
  const [isDimensionMode, setIsDimensionMode] = useState(false);
  const [dimensionOrthogonal, setDimensionOrthogonal] = useState(false);
  const [dimensionSnap, setDimensionSnap] = useState(true); // Domyślnie włączone
  const [alignToEdgeMode, setAlignToEdgeMode] = useState<'none' | 'parallel' | 'perpendicular'>('none');
  
  // Stan dla wyszukiwania
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const loadedModelsRef = useRef<any[]>([]);
  
  // Stan dla selekcji i izolacji
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
  const [isIsolated, setIsIsolated] = useState(false);
  const hiddenFragmentsRef = useRef<Map<string, Set<number>>>(new Map());
  const originalMatricesRef = useRef<Map<string, Map<number, THREE.Matrix4>>>(new Map());
  const showSelectionPanelRef = useRef(showSelectionPanel);
  const isCtrlPressedRef = useRef(false);
  
  useEffect(() => {
    isPinModeRef.current = isPinMode;
  }, [isPinMode]);
  
  useEffect(() => {
    selectedPinColorRef.current = selectedPinColor;
  }, [selectedPinColor]);
  
  useEffect(() => {
    showSelectionPanelRef.current = showSelectionPanel;
  }, [showSelectionPanel]);
  
  // Synchronizuj opcje wymiarowania z narzędziem
  useEffect(() => {
    if (dimensionsRef.current) {
      dimensionsRef.current.orthogonalMode = dimensionOrthogonal;
      console.log('📏 Orthogonal mode:', dimensionOrthogonal);
    }
  }, [dimensionOrthogonal]);
  
  useEffect(() => {
    if (dimensionsRef.current) {
      dimensionsRef.current.snapToPoints = dimensionSnap;
      console.log('📏 Snap to points:', dimensionSnap);
    }
  }, [dimensionSnap]);
  
  useEffect(() => {
    if (dimensionsRef.current) {
      dimensionsRef.current.alignToEdgeMode = alignToEdgeMode;
      dimensionsRef.current.resetReferenceEdge();
      console.log('📏 Align to edge mode:', alignToEdgeMode);
    }
  }, [alignToEdgeMode]);
  
  // Animacja snap markera
  useEffect(() => {
    if (!isDimensionMode || !dimensionsRef.current) return;
    
    const animationInterval = setInterval(() => {
      if (dimensionsRef.current) {
        dimensionsRef.current.updateSnapMarker();
      }
    }, 50); // 20 FPS dla płynnej animacji
    
    return () => clearInterval(animationInterval);
  }, [isDimensionMode]);
  
  // Dostępne kolory do pinowania - żywe, podstawowe kolory
  const pinColors = [
    { name: "Czerwony", color: "#FF0000" },
    { name: "Niebieski", color: "#0000FF" },
    { name: "Zielony", color: "#00FF00" },
    { name: "Żółty", color: "#FFFF00" },
    { name: "Pomarańczowy", color: "#FF6600" },
    { name: "Fioletowy", color: "#9900FF" },
  ];
  
  // Ref aby zawsze mieć dostęp do najnowszych komentarzy
  const commentsRef = useRef(comments);
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  // System historii akcji dla undo/redo
  interface Action {
    type: 'camera' | 'dimension_add' | 'dimension_delete';
    data: any;
    timestamp: number;
  }
  
  interface CameraState {
    position: THREE.Vector3;
    target: THREE.Vector3;
  }
  
  interface DimensionData {
    group: THREE.Group;
    start: THREE.Vector3;
    end: THREE.Vector3;
  }
  
  const actionHistory = useRef<Action[]>([]);
  const historyIndex = useRef<number>(-1);
  const isRestoringState = useRef<boolean>(false);

  useEffect(() => {
    if (!viewerContainerRef.current || viewerRef.current) return;

    // --- UTWORZENIE GŁÓWNEGO VIEWERA ---
    const viewer = new OBC.Components();
    viewerRef.current = viewer;

    // --- SCENA ---
    const sceneComponent = new OBC.SimpleScene(viewer);
    viewer.scene = sceneComponent;
    const scene = sceneComponent.get();

    // --- OŚWIETLENIE ---
    // Ustaw światła - intensywność zostanie dostosowana przez useEffect z motywem
    const ambientLight = new THREE.AmbientLight(0xE6E7E4, 1);
    const directionalLight = new THREE.DirectionalLight(0xF9F9F9, 0.75);
    directionalLight.position.set(10, 50, 10);
    scene.add(ambientLight, directionalLight);
    
    // Ustaw początkowe tło - zostanie zaktualizowane przez useEffect z motywem
    scene.background = new THREE.Color(0x202932);

    // --- KONTENER RENDERA ---
    const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainerRef.current);
    viewer.renderer = rendererComponent;

    // --- KAMERA ---
    const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer);
    viewer.camera = cameraComponent;
    
    // Zapisz początkowy stan kamery
    setTimeout(() => {
      saveCameraState();
      console.log("📷 Initial camera state saved");
    }, 1000);
    
    // Dodaj listener na zmiany kamery (zapisz stan po każdej interakcji)
    let cameraChangeTimeout: number | null = null;
    cameraComponent.controls.addEventListener('controlend', () => {
      // Użyj debounce aby nie zapisywać stanu zbyt często
      if (cameraChangeTimeout) {
        clearTimeout(cameraChangeTimeout);
      }
      cameraChangeTimeout = window.setTimeout(() => {
        saveCameraState();
      }, 300);
    });

    // --- RAYCASTER ---
    const raycasterComponent = new OBC.SimpleRaycaster(viewer);
    viewer.raycaster = raycasterComponent;

    // --- INICJALIZACJA VIEWERA ---
    viewer.init();
    rendererComponent.postproduction.enabled = true;

    // --- SIATKA (GRID) ---
    new OBC.SimpleGrid(viewer, new THREE.Color(0x666666));

    // --- ŁADOWANIE MODELU IFC ---
    const ifcLoader = new OBC.FragmentIfcLoader(viewer);
    ifcLoader.setup();

    // --- PODŚWIETLENIE I PANEL WŁAŚCIWOŚCI ---
    const highlighter = new OBC.FragmentHighlighter(viewer);
    highlighter.setup();
    
    // Konfiguracja kolorów dla różnych grup highlight
    highlighter.add("select", []); // Dla zaznaczenia
    highlighter.add("pin", []); // Dla pinowania
    highlighter.outlineEnabled = false; // Wyłącz obramowanie
    
    highlighterRef.current = highlighter;

    // --- NARZĘDZIE WYMIAROWANIA (własna implementacja) ---
    const dimensions = new SimpleDimensionTool(scene, cameraComponent.get());
    dimensionsRef.current = dimensions;
    
    // Callback wywoływany gdy wymiar jest tworzony (dla undo/redo)
    dimensions.onMeasurementCreated = (dimensionData) => {
      const action: Action = {
        type: 'dimension_add',
        data: dimensionData,
        timestamp: Date.now(),
      };
      saveAction(action);
      console.log('📏 Dimension saved to history');
    };
    
    // Event listener dla ruchu myszy w trybie wymiarowania (podgląd)
    // Tylko pokazuj podgląd gdy Shift jest wciśnięty
    const handleDimensionMove = (event: MouseEvent) => {
      if (!dimensions.enabled || modelObjectsRef.current.length === 0) return;
      
      // Tylko pokazuj podgląd gdy Shift jest wciśnięty
      if (event.shiftKey) {
        dimensions.handleMouseMove(event, modelObjectsRef.current);
      } else {
        // Bez Shift - wyczyść podgląd aby nie przeszkadzał
        dimensions.clearPreviewAndSnap();
      }
    };
    
    // Stan dla zaznaczonego wymiaru do usunięcia
    let selectedMeasurementToDelete: THREE.Group | null = null;
    
    // Zmienne dla wykrywania podwójnego kliknięcia i Shift
    let lastClickTime = 0;
    const doubleClickThreshold = 300; // ms
    
    // Obsługa kliknięć: Shift + klik = dodaj punkt, Shift + podwójny klik = zaznacz do usunięcia
    const handleDimensionClickWithDelete = (event: MouseEvent) => {
      if (!dimensions.enabled) return;
      
      // WAŻNE: Tylko reaguj gdy Shift jest wciśnięty!
      // Bez Shift = pozwól kontrolkom kamery działać normalnie
      if (!event.shiftKey) {
        return; // Kamera może swobodnie działać
      }
      
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClickTime;
      
      // Shift + Podwójne kliknięcie = zaznacz wymiar do usunięcia
      if (timeSinceLastClick < doubleClickThreshold) {
        console.log('🎯 Shift+Double-click detected - trying to select measurement for deletion');
        event.stopPropagation();
        event.preventDefault();
        
        // Wyczyść poprzednie zaznaczenie
        if (selectedMeasurementToDelete) {
          dimensions.highlightMeasurement(selectedMeasurementToDelete, false);
        }
        
        selectedMeasurementToDelete = dimensions.handleRightClick(event, modelObjectsRef.current);
        if (selectedMeasurementToDelete) {
          console.log('✅ Measurement selected for deletion. Press Delete to remove.');
          dimensions.highlightMeasurement(selectedMeasurementToDelete, true);
        } else {
          console.log('❌ No measurement found at click position');
        }
        
        lastClickTime = 0; // Reset czasu
        return; // Nie dodawaj punktu!
      }
      
      // Shift + Pojedyncze kliknięcie = dodaj punkt wymiaru
      lastClickTime = currentTime;
      
      // Małe opóźnienie aby sprawdzić czy to nie będzie podwójne kliknięcie
      setTimeout(() => {
        if (Date.now() - lastClickTime >= doubleClickThreshold && modelObjectsRef.current.length > 0) {
          console.log('➕ Shift+click - adding dimension point');
          dimensions.handleClick(event, modelObjectsRef.current);
        }
      }, doubleClickThreshold);
    };
    
    // Event listener dla klawisza ESC (anulowanie bieżącego wymiaru) i Delete (usuwanie)
    const handleKeyDown = (event: KeyboardEvent) => {
      // Śledź Ctrl
      if (event.key === 'Control' || event.ctrlKey) {
        isCtrlPressedRef.current = true;
      }
      
      if (dimensions.enabled) {
        if (event.key === 'Escape') {
          dimensions.cancelCurrentMeasurement();
          if (selectedMeasurementToDelete) {
            dimensions.highlightMeasurement(selectedMeasurementToDelete, false);
          }
          selectedMeasurementToDelete = null;
          console.log('📏 Current measurement canceled');
        } else if (event.key === 'Delete' && selectedMeasurementToDelete) {
          // Zapisz dane wymiaru przed usunięciem (dla undo)
          const dimensionData = dimensions.getMeasurementData(selectedMeasurementToDelete);
          if (dimensionData) {
            const action: Action = {
              type: 'dimension_delete',
              data: dimensionData,
              timestamp: Date.now(),
            };
            saveAction(action);
          }
          
          dimensions.deleteMeasurement(selectedMeasurementToDelete);
          selectedMeasurementToDelete = null;
          console.log('📏 Measurement deleted and saved to history');
        }
      }
    };
    
    // Event listener dla puszczenia Ctrl
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        isCtrlPressedRef.current = false;
      }
    };
    
    viewerContainerRef.current.addEventListener('click', handleDimensionClickWithDelete);
    viewerContainerRef.current.addEventListener('mousemove', handleDimensionMove);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    console.log("📏 Simple dimension tool initialized");

    // Pętla aktualizacji dla wymiarów (skalowanie etykiet względem kamery)
    let animationFrameId: number;
    const updateLoop = () => {
      if (dimensions) {
        dimensions.update();
      }
      animationFrameId = requestAnimationFrame(updateLoop);
    };
    updateLoop();

    const propertiesProcessor = new OBC.IfcPropertiesProcessor(viewer);

    // --- Po wczytaniu modelu ---
    ifcLoader.onIfcLoaded.add(async (model) => {
      // przetwarzanie właściwości
      propertiesProcessor.process(model);
      await highlighter.updateHighlight();
      
      // Zapisz model dla wyszukiwania
      loadedModelsRef.current.push(model);
      console.log(`🔍 Model loaded for search: ${loadedModelsRef.current.length} total models`);
      
      // Zapisz obiekty modelu dla narzędzia wymiarowania
      const meshes: THREE.Object3D[] = [];
      model.items.forEach((item: any) => {
        if (item.mesh) {
          meshes.push(item.mesh);
        }
      });
      modelObjectsRef.current = meshes;
      console.log(`📏 Loaded ${meshes.length} objects for dimension tool`);

      // reagowanie na zaznaczenia
      highlighter.events.select.onHighlight.add(async (selection) => {
        const fragmentID = Object.keys(selection)[0];
        const expressID = Number([...selection[fragmentID]][0]);
        const elementIdStr = expressID.toString();
        
        // Jeśli Ctrl jest wciśnięty i panel selekcji jest otwarty, dodaj do selekcji
        if (isCtrlPressedRef.current && showSelectionPanelRef.current) {
          console.log("🎯 Ctrl+click - adding element to selection:", expressID);
          addToSelection(expressID);
          return; // Nie wykonuj innych akcji
        }
        
        // Jeśli tryb pinowania jest aktywny, zapinuj element
        if (isPinModeRef.current) {
          console.log("📌 Pin mode active - pinning element:", elementIdStr);
          
          try {
            const color = new THREE.Color(selectedPinColorRef.current);
            console.log("📌 Selected color:", selectedPinColorRef.current, color);
            
            // Pobierz wszystkie fragmenty modelu
            for (const fragID of Object.keys(selection)) {
              console.log("📌 Processing fragment:", fragID);
              
              // Znajdź fragment w items modelu
              const fragment = model.items.find((item: any) => item.id === fragID);
              
              if (fragment && fragment.mesh) {
                console.log("📌 Found fragment mesh");
                const mesh = fragment.mesh;
                
                // Sprawdź czy instanceColor istnieje, jeśli nie - stwórz
                if (!mesh.instanceColor) {
                  console.log("📌 Creating instanceColor buffer");
                  const count = mesh.count;
                  const colors = new Float32Array(count * 3);
                  
                  // Wypełnij domyślnym kolorem (biały)
                  for (let i = 0; i < count; i++) {
                    colors[i * 3] = 1;
                    colors[i * 3 + 1] = 1;
                    colors[i * 3 + 2] = 1;
                  }
                  
                  mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
                  mesh.instanceColor.needsUpdate = true;
                }
                
                // Upewnij się że materiał używa kolorów instancji
                if (mesh.material) {
                  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  materials.forEach((mat: any) => {
                    if (mat && !mat.vertexColors) {
                      mat.vertexColors = true;
                      mat.needsUpdate = true;
                      console.log("📌 Enabled vertexColors on material");
                    }
                  });
                }
                
                // Ustaw kolor dla każdej instancji w tym fragmencie
                const instanceIDs = selection[fragID];
                console.log("📌 Instance IDs:", instanceIDs);
                
                for (const instanceID of instanceIDs) {
                  const id = Number(instanceID);
                  mesh.setColorAt(id, color);
                  console.log(`📌 Set color for instance ${id}`);
                }
                
                // Wymuszenie aktualizacji
                mesh.instanceColor.needsUpdate = true;
                console.log("📌 Updated instanceColor");
              } else {
                console.log("❌ Fragment or mesh not found");
              }
            }
            
            setPinnedElements(prev => {
              const newMap = new Map(prev);
              newMap.set(elementIdStr, selectedPinColorRef.current);
              return newMap;
            });
            
            console.log(`✅ Element ${elementIdStr} pinned with color ${selectedPinColorRef.current}`);
          } catch (error) {
            console.error("❌ Error pinning element:", error);
          }
          
          return; // Nie pokazuj properties w trybie pinowania
        }
        
        // Normalny tryb - pokaż properties
        propertiesProcessor.renderProperties(model, expressID);
        
        // Zapisz ID zaznaczonego elementu dla komentarzy
        setSelectedElementId(elementIdStr);
        
        // Spróbuj pobrać nazwę elementu
        try {
          const properties = await model.getProperties(expressID);
          const name = properties?.Name?.value || properties?.type || `Element ${expressID}`;
          setSelectedElementName(name);
        } catch (error) {
          setSelectedElementName(`Element ${expressID}`);
        }

        // Dodaj sekcję komentarzy do panelu Properties
        setTimeout(() => {
          addCommentsToPropertiesPanel(elementIdStr);
        }, 500);
      });
    });

    // --- TOOLBAR ---
    const mainToolbar = new OBC.Toolbar(viewer);
    mainToolbar.addChild(
      ifcLoader.uiElement.get("main"),
      propertiesProcessor.uiElement.get("main")
    );
    viewer.ui.addToolbar(mainToolbar);

    // Cleanup function
    return () => {
      if (viewerContainerRef.current) {
        viewerContainerRef.current.removeEventListener('click', handleDimensionClickWithDelete);
        viewerContainerRef.current.removeEventListener('mousemove', handleDimensionMove);
      }
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, []);

  // Synchronizacja motywu z tłem viewera i oświetleniem
  useEffect(() => {
    // Małe opóźnienie aby upewnić się że viewer jest gotowy
    const timer = setTimeout(() => {
      if (!viewerRef.current) return;

      const viewer = viewerRef.current;
      const sceneComponent = viewer.scene as OBC.SimpleScene;
      const scene = sceneComponent.get();

      // Znajdź światła w scenie
      const ambientLight = scene.children.find(
        (child) => child instanceof THREE.AmbientLight
      ) as THREE.AmbientLight | undefined;
      
      const directionalLight = scene.children.find(
        (child) => child instanceof THREE.DirectionalLight
      ) as THREE.DirectionalLight | undefined;

      // Zmień kolor tła i intensywność świateł w zależności od motywu
      if (theme === "dark") {
        scene.background = new THREE.Color(0x202932); // Ciemny granatowy
        // Tryb nocny - stonowane, ciemne oświetlenie
        if (ambientLight) ambientLight.intensity = 0.6;
        if (directionalLight) directionalLight.intensity = 0.5;
      } else {
        scene.background = new THREE.Color(0xE6E7E4); // Jasny szary
        // Tryb dzienny - mocne, rozświetlone oświetlenie
        if (ambientLight) ambientLight.intensity = 2.5;
        if (directionalLight) directionalLight.intensity = 1.5;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [theme]);

  // Zapisz stan kamery
  // Funkcja do zapisywania akcji w historii
  const saveAction = (action: Action) => {
    if (isRestoringState.current) return;
    
    // Usuń wszystkie akcje po aktualnym indeksie (jeśli użytkownik zrobił undo i potem nową akcję)
    actionHistory.current = actionHistory.current.slice(0, historyIndex.current + 1);
    
    // Dodaj nową akcję
    actionHistory.current.push(action);
    historyIndex.current = actionHistory.current.length - 1;
    
    console.log(`💾 Action saved: ${action.type}, history size:`, actionHistory.current.length);
  };
  
  const saveCameraState = () => {
    if (!viewerRef.current || isRestoringState.current) return;
    
    const camera = viewerRef.current.camera as OBC.OrthoPerspectiveCamera;
    const controls = camera.controls;
    const threeCamera = camera.get() as THREE.PerspectiveCamera;
    
    const cameraState: CameraState = {
      position: threeCamera.position.clone(),
      target: controls.getTarget(new THREE.Vector3()).clone(),
    };
    
    const action: Action = {
      type: 'camera',
      data: cameraState,
      timestamp: Date.now(),
    };
    
    saveAction(action);
  };

  // Undo - cofnij ostatnią akcję
  const handleUndo = () => {
    if (historyIndex.current <= 0 || !viewerRef.current || !dimensionsRef.current) {
      console.log("⚠️ Cannot undo - at the beginning of history");
      return;
    }
    
    historyIndex.current--;
    const action = actionHistory.current[historyIndex.current];
    
    console.log(`⏪ Undo - restoring state to: ${action.type}`, historyIndex.current);
    isRestoringState.current = true;
    
    // Przywróć stan w zależności od typu akcji
    if (action.type === 'camera') {
      const cameraState = action.data as CameraState;
      const camera = viewerRef.current.camera as OBC.OrthoPerspectiveCamera;
      const threeCamera = camera.get() as THREE.PerspectiveCamera;
      threeCamera.position.copy(cameraState.position);
      camera.controls.setLookAt(
        cameraState.position.x,
        cameraState.position.y,
        cameraState.position.z,
        cameraState.target.x,
        cameraState.target.y,
        cameraState.target.z,
        false
      );
    } else if (action.type === 'dimension_add') {
      // Cofnij dodanie wymiaru = usuń ostatni wymiar
      const dimensionData = action.data as DimensionData;
      dimensionsRef.current.deleteMeasurementSilent(dimensionData.group);
      console.log('⏪ Dimension removed (undo add)');
    } else if (action.type === 'dimension_delete') {
      // Cofnij usunięcie wymiaru = dodaj wymiar z powrotem
      const dimensionData = action.data as DimensionData;
      dimensionsRef.current.restoreMeasurement(dimensionData);
      console.log('⏪ Dimension restored (undo delete)');
    }
    
    setTimeout(() => {
      isRestoringState.current = false;
    }, 100);
  };

  // Redo - przywróć cofniętą akcję
  const handleRedo = () => {
    if (historyIndex.current >= actionHistory.current.length - 1 || !viewerRef.current || !dimensionsRef.current) {
      console.log("⚠️ Cannot redo - at the end of history");
      return;
    }
    
    historyIndex.current++;
    const action = actionHistory.current[historyIndex.current];
    
    console.log(`⏩ Redo - applying action: ${action.type}`, historyIndex.current);
    isRestoringState.current = true;
    
    // Zastosuj akcję ponownie
    if (action.type === 'camera') {
      const cameraState = action.data as CameraState;
      const camera = viewerRef.current.camera as OBC.OrthoPerspectiveCamera;
      const threeCamera = camera.get() as THREE.PerspectiveCamera;
      threeCamera.position.copy(cameraState.position);
      camera.controls.setLookAt(
        cameraState.position.x,
        cameraState.position.y,
        cameraState.position.z,
        cameraState.target.x,
        cameraState.target.y,
        cameraState.target.z,
        false
      );
    } else if (action.type === 'dimension_add') {
      // Ponów dodanie wymiaru
      const dimensionData = action.data as DimensionData;
      dimensionsRef.current.restoreMeasurement(dimensionData);
      console.log('⏩ Dimension restored (redo add)');
    } else if (action.type === 'dimension_delete') {
      // Ponów usunięcie wymiaru
      const dimensionData = action.data as DimensionData;
      dimensionsRef.current.deleteMeasurementSilent(dimensionData.group);
      console.log('⏩ Dimension removed (redo delete)');
    }
    
    setTimeout(() => {
      isRestoringState.current = false;
    }, 100);
  };

  // Funkcja wyszukiwania elementów
  const searchElements = async (query: string) => {
    const results: Array<{
      expressID: number;
      name: string;
      type: string;
      properties: Record<string, any>;
    }> = [];

    const lowerQuery = query.toLowerCase();

    for (const model of loadedModelsRef.current) {
      try {
        // Pobierz wszystkie ID elementów z modelu
        const allIDs = await model.getAllPropertiesOfType(0); // 0 = wszystkie typy
        
        if (!allIDs || Object.keys(allIDs).length === 0) {
          // Jeśli getAllPropertiesOfType nie działa, spróbuj iterować przez fragmenty
          model.items.forEach((fragment: any) => {
            if (fragment.ids) {
              fragment.ids.forEach(async (id: number) => {
                try {
                  const props = await model.getProperties(id);
                  if (props) {
                    const name = props.Name?.value || props.type || `Element ${id}`;
                    const type = props.type || 'Unknown';
                    
                    // Sprawdź czy pasuje do zapytania
                    if (
                      name.toLowerCase().includes(lowerQuery) ||
                      type.toLowerCase().includes(lowerQuery) ||
                      id.toString().includes(lowerQuery)
                    ) {
                      results.push({
                        expressID: id,
                        name,
                        type,
                        properties: {
                          Name: name,
                          Type: type,
                          GlobalId: props.GlobalId?.value || 'N/A',
                          ObjectType: props.ObjectType?.value || 'N/A',
                        }
                      });
                    }
                  }
                } catch (error) {
                  // Ignoruj błędy dla pojedynczych elementów
                }
              });
            }
          });
        } else {
          // Przeszukaj wszystkie właściwości
          for (const [idStr, props] of Object.entries(allIDs)) {
            const id = parseInt(idStr);
            const properties = props as any;
            
            const name = properties.Name?.value || properties.type || `Element ${id}`;
            const type = properties.type || 'Unknown';
            
            // Sprawdź czy pasuje do zapytania
            if (
              name.toLowerCase().includes(lowerQuery) ||
              type.toLowerCase().includes(lowerQuery) ||
              id.toString().includes(lowerQuery) ||
              (properties.GlobalId?.value || '').toLowerCase().includes(lowerQuery)
            ) {
              results.push({
                expressID: id,
                name,
                type,
                properties: {
                  Name: name,
                  Type: type,
                  GlobalId: properties.GlobalId?.value || 'N/A',
                  ObjectType: properties.ObjectType?.value || 'N/A',
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error searching in model:', error);
      }
    }

    console.log(`🔍 Found ${results.length} results for query: "${query}"`);
    return results;
  };

  // Funkcja obsługi wyboru elementu z wyników wyszukiwania
  const handleSearchSelect = async (expressID: number) => {
    if (!highlighterRef.current || loadedModelsRef.current.length === 0) return;

    try {
      const highlighter = highlighterRef.current;
      
      // Znajdź fragment zawierający ten element
      let foundFragment = null;
      for (const model of loadedModelsRef.current) {
        for (const fragment of model.items) {
          if (fragment.ids && fragment.ids.includes(expressID)) {
            foundFragment = fragment;
            break;
          }
        }
        if (foundFragment) break;
      }

      if (foundFragment) {
        // Wyczyść poprzednie zaznaczenie
        highlighter.clear();
        
        // Zaznacz element - użyj właściwego formatu FragmentIdMap
        const fragmentIdMap: { [key: string]: Set<number> } = {
          [foundFragment.fragment.id]: new Set([expressID])
        };
        await highlighter.highlightByID('select', fragmentIdMap);
        
        // Pobierz nazwę elementu i wyświetl właściwości
        const model = foundFragment.fragment.mesh.parent;
        const properties = await model.getProperties(expressID);
        const name = properties?.Name?.value || properties?.type || `Element ${expressID}`;
        
        setSelectedElementId(expressID.toString());
        setSelectedElementName(name);
        
        console.log(`🔍 Selected element: ${name} (ID: ${expressID})`);
      }
    } catch (error) {
      console.error('Error selecting search result:', error);
    }
  };

  // Funkcje zarządzania selekcją
  const addToSelection = async (expressID: number) => {
    // Sprawdź czy element już jest w selekcji
    if (selectedElements.some(el => el.expressID === expressID)) {
      console.log('Element already in selection:', expressID);
      return;
    }

    // Pobierz informacje o elemencie
    let elementInfo: SelectedElement | null = null;
    
    for (const model of loadedModelsRef.current) {
      try {
        const properties = await model.getProperties(expressID);
        if (properties) {
          elementInfo = {
            expressID,
            name: properties.Name?.value || properties.type || `Element ${expressID}`,
            type: properties.type || 'Unknown',
          };
          break;
        }
      } catch (error) {
        // Próbuj następny model
      }
    }

    if (elementInfo) {
      setSelectedElements(prev => [...prev, elementInfo!]);
      console.log('✅ Added to selection:', elementInfo);
    }
  };

  const removeFromSelection = (expressID: number) => {
    setSelectedElements(prev => prev.filter(el => el.expressID !== expressID));
    console.log('❌ Removed from selection:', expressID);
  };

  const clearSelection = () => {
    setSelectedElements([]);
    console.log('🗑️ Cleared selection');
  };

  const isolateElements = async () => {
    if (!viewerRef.current || selectedElements.length === 0) return;

    try {
      const selectedIDs = new Set(selectedElements.map(el => el.expressID));
      
      console.log('🔍 Starting isolation for', selectedElements.length, 'elements');
      console.log('Selected IDs:', Array.from(selectedIDs));
      
      // Przejdź przez wszystkie modele i fragmenty
      for (const model of loadedModelsRef.current) {
        console.log('Processing model with', model.items.length, 'fragments');
        
        for (const item of model.items) {
          // item bezpośrednio ma mesh, id, ids (nie ma zagnieżdżonego fragment)
          if (!item || !item.mesh) {
            console.log('Skipping item without mesh');
            continue;
          }
          
          const mesh = item.mesh;
          const fragmentId = item.id;
          const allIDs = item.ids || [];
          
          console.log(`Fragment ${fragmentId} has ${allIDs.length} elements`);
          
          // Sprawdź które ID powinny być ukryte
          const idsToHide = new Set<number>();
          const idsToShow = new Set<number>();
          
          allIDs.forEach((id: number) => {
            if (selectedIDs.has(id)) {
              idsToShow.add(id);
            } else {
              idsToHide.add(id);
            }
          });
          
          console.log(`Fragment ${fragmentId}: hiding ${idsToHide.size}, showing ${idsToShow.size}`);
          
          // Jeśli wszystkie elementy mają być ukryte, ukryj cały mesh
          if (idsToShow.size === 0) {
            mesh.visible = false;
            hiddenFragmentsRef.current.set(fragmentId, new Set(allIDs));
            console.log(`✅ Hidden entire mesh ${fragmentId}`);
          }
          // Jeśli wszystkie elementy mają być widoczne, pokaż mesh
          else if (idsToHide.size === 0) {
            mesh.visible = true;
            console.log(`✅ Showing entire mesh ${fragmentId}`);
          }
          // Jeśli część ma być ukryta - SPLIT: ukryj cały mesh i stwórz nowy tylko z wybranymi
          else {
            console.log(`⚠️ Partial hiding in fragment ${fragmentId} - WORKAROUND: hiding entire mesh`);
            
            // TYMCZASOWE OBEJŚCIE: ukryj cały fragment
            // To nie jest idealne, ale przynajmniej działa
            // TODO: Zaimplementować prawdziwe częściowe ukrywanie gdy znajdziemy lepszą metodę
            
            mesh.visible = false;
            hiddenFragmentsRef.current.set(fragmentId, new Set(allIDs));
            
            console.log(`⚠️ UWAGA: Ukryto cały fragment ${fragmentId} (${allIDs.length} elementów)`);
            console.log(`   Wybrane elementy które też zostały ukryte: ${idsToShow.size}`);
            console.log(`   To jest tymczasowe obejście - trzeba znaleźć lepszą metodę!`);
          }
        }
      }
      
      setIsIsolated(true);
      console.log('✅ Isolation complete');
    } catch (error) {
      console.error('❌ Error isolating elements:', error);
    }
  };

  const unisolateElements = async () => {
    if (!viewerRef.current) return;

    try {
      console.log('👁️ Starting unisolation - restoring all elements');
      
      // Przywróć widoczność wszystkich elementów
      for (const model of loadedModelsRef.current) {
        for (const item of model.items) {
          if (!item || !item.mesh) continue;
          
          const mesh = item.mesh;
          const fragmentId = item.id;
          const allIDs = item.ids || [];
          
          // Pokaż mesh
          mesh.visible = true;
          
          // Przywróć oryginalne pozycje elementów
          const originalMatrices = originalMatricesRef.current.get(fragmentId);
          if (originalMatrices && originalMatrices.size > 0) {
            try {
              console.log(`Restoring ${originalMatrices.size} elements in fragment ${fragmentId}`);
              
              // Przywróć oryginalne pozycje ze zapisanych matryc
              allIDs.forEach((id: number, index: number) => {
                const originalMatrix = originalMatrices.get(id);
                if (originalMatrix) {
                  mesh.setMatrixAt(index, originalMatrix);
                }
              });
              
              mesh.instanceMatrix.needsUpdate = true;
              console.log(`✅ Restored original positions for fragment ${fragmentId}`);
            } catch (error) {
              console.error('❌ Error restoring positions in fragment:', error);
            }
          }
        }
      }
      
      // Wyczyść zapisane ukryte fragmenty i matryce
      hiddenFragmentsRef.current.clear();
      originalMatricesRef.current.clear();
      setIsIsolated(false);
      console.log('✅ Unisolation complete - all elements visible');
    } catch (error) {
      console.error('❌ Error unisolating elements:', error);
    }
  };

  const handleSelectionElementClick = async (expressID: number) => {
    // Podświetl element w modelu
    if (!highlighterRef.current || loadedModelsRef.current.length === 0) return;

    try {
      const highlighter = highlighterRef.current;
      
      // Znajdź fragment zawierający ten element
      let foundFragment = null;
      for (const model of loadedModelsRef.current) {
        for (const fragment of model.items) {
          if (fragment.ids && fragment.ids.includes(expressID)) {
            foundFragment = fragment;
            break;
          }
        }
        if (foundFragment) break;
      }

      if (foundFragment) {
        highlighter.clear();
        const fragmentIdMap: { [key: string]: Set<number> } = {
          [foundFragment.fragment.id]: new Set([expressID])
        };
        await highlighter.highlightByID('select', fragmentIdMap);
      }
    } catch (error) {
      console.error('Error highlighting element from selection:', error);
    }
  };

  const handleActionSelect = (action: string) => {
    setActiveAction(action);
    console.log("Selected action:", action);
    
    // Obsługa przycisku Comment
    if (action === "comment") {
      setShowCommentPanel(true);
      console.log("💬 Comment panel enabled");
      return;
    }
    
    // Wyłącz panel komentarzy gdy wybrana jest inna akcja lub move
    if (showCommentPanel && action !== "comment") {
      setShowCommentPanel(false);
      console.log("💬 Comment panel disabled");
    }
    
    // Obsługa Undo/Redo
    if (action === "undo") {
      handleUndo();
      return;
    }
    
    if (action === "redo") {
      handleRedo();
      return;
    }
    
    // Obsługa Pin
    if (action === "pin") {
      setIsPinMode(true);
      console.log("📌 Pin mode enabled");
      return;
    }
    
    // Wyłącz pin mode gdy wybrana jest inna akcja lub move
    if (isPinMode && action !== "pin") {
      setIsPinMode(false);
      console.log("📌 Pin mode disabled");
    }
    
    // Obsługa Dimension (wymiarowanie)
    if (action === "dimension") {
      setIsDimensionMode(true);
      
      if (dimensionsRef.current) {
        dimensionsRef.current.enable();
        // Wyłącz pin mode jeśli jest aktywny
        setIsPinMode(false);
      }
      console.log("📏 Dimension mode enabled");
      return;
    }
    
    // Wyłącz dimension mode gdy wybrana jest inna akcja lub move
    if (isDimensionMode && action !== "dimension") {
      setIsDimensionMode(false);
      if (dimensionsRef.current) {
        dimensionsRef.current.disable();
      }
      console.log("📏 Dimension mode disabled");
    }
    
    // Obsługa Search (wyszukiwanie)
    if (action === "search") {
      setShowSearchPanel(true);
      console.log("🔍 Search panel enabled");
      return;
    }
    
    // Wyłącz panel wyszukiwania gdy wybrana jest inna akcja lub move
    if (showSearchPanel && action !== "search") {
      setShowSearchPanel(false);
      console.log("🔍 Search panel disabled");
    }
    
    // Obsługa Selection (selekcja i izolacja)
    if (action === "selection") {
      setShowSelectionPanel(true);
      console.log("🎯 Selection panel enabled");
      return;
    }
    
    // Wyłącz panel selekcji gdy wybrana jest inna akcja lub move
    if (showSelectionPanel && action !== "selection") {
      setShowSelectionPanel(false);
      console.log("🎯 Selection panel disabled");
    }
    
    // TODO: Implement other action handlers
    // - camera: capture screenshots
  };

  const handleAddComment = (text: string, elementId?: string, elementName?: string) => {
    addComment(text, elementId, elementName);
    
    // Odśwież sekcję komentarzy w Properties jeśli dodano komentarz do zaznaczonego elementu
    if (elementId) {
      setTimeout(() => {
        addCommentsToPropertiesPanel(elementId);
      }, 100);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment(commentId);
    
    // Odśwież sekcję komentarzy w Properties po usunięciu
    if (selectedElementId) {
      setTimeout(() => {
        addCommentsToPropertiesPanel(selectedElementId);
      }, 100);
    }
  };

  const handleCloseCommentPanel = () => {
    setShowCommentPanel(false);
  };

  const addCommentsToPropertiesPanel = (elementId: string) => {
    // Szukaj panelu Properties
    const selectors = [
      '[data-tooeen-name="properties"]',
      '.properties-panel',
      '#properties',
      '[class*="properties"]',
      '[class*="Properties"]',
      'div[style*="position"]'
    ];
    
    let propertiesPanel: Element | null = null;
    
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found) {
        propertiesPanel = found;
        break;
      }
    }
    
    // Jeśli nie znaleziono standardowych selektorów, szukaj po zawartości tekstu
    if (!propertiesPanel) {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const possiblePanel = allDivs.find(div => {
        const text = div.textContent || '';
        return text.includes('Element Properties') || 
               text.includes('BEAM') || 
               text.includes('IfcBeam') ||
               text.includes('Properties');
      });
      
      if (possiblePanel) {
        propertiesPanel = possiblePanel;
      } else {
        return; // Nie znaleziono panelu Properties
      }
    }

    // Usuń poprzednią sekcję komentarzy jeśli istnieje
    const existingCommentsSection = propertiesPanel.querySelector('.custom-comments-section');
    if (existingCommentsSection) {
      existingCommentsSection.remove();
    }
    
    // Pobierz komentarze dla tego elementu - używamy ref aby mieć najnowsze dane
    const elementComments = commentsRef.current.filter((comment) => comment.elementId === elementId);
    
    // Utwórz sekcję komentarzy
    try {
      const commentsSection = document.createElement('div');
      commentsSection.className = 'custom-comments-section';
      commentsSection.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background-color: hsl(var(--muted) / 0.3);
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
      `;

      // Nagłówek sekcji z możliwością rozwijania/zwijania
      const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 0px;
      padding-bottom: 8px;
      border-bottom: 1px solid hsl(var(--border));
      font-weight: 600;
      font-size: 14px;
      color: hsl(var(--foreground));
      cursor: pointer;
      user-select: none;
    `;
      
      const arrowIcon = document.createElement('span');
      arrowIcon.innerHTML = '▼';
      arrowIcon.style.cssText = `
        transition: transform 0.2s;
        font-size: 10px;
        color: hsl(var(--muted-foreground));
      `;
      
      header.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--primary))">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        Komentarze (${elementComments.length})
        <span style="font-size: 10px; color: hsl(var(--muted-foreground)); margin-left: 8px;">ID: ${elementId}</span>
      `;
      header.prepend(arrowIcon);
      commentsSection.appendChild(header);
      
      // Kontener na zawartość komentarzy
      const contentContainer = document.createElement('div');
      contentContainer.style.cssText = `
        margin-top: 12px;
        display: none;
      `;
      
      // Funkcja rozwijania/zwijania
      let isExpanded = false;
      header.addEventListener('click', () => {
        isExpanded = !isExpanded;
        contentContainer.style.display = isExpanded ? 'block' : 'none';
        arrowIcon.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
      });

      // Lista komentarzy lub komunikat o braku komentarzy
      if (elementComments.length > 0) {
        elementComments.forEach((comment) => {
          const commentDiv = document.createElement('div');
          commentDiv.style.cssText = `
            background-color: hsl(var(--background));
            padding: 8px;
            margin-bottom: 8px;
            border-radius: 6px;
            border: 1px solid hsl(var(--border) / 0.5);
          `;

          const date = new Date(comment.timestamp);
          const dateStr = date.toLocaleString("pl-PL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          commentDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
              <span style="font-size: 11px; color: hsl(var(--muted-foreground));">${dateStr}</span>
              <button 
                class="delete-comment-btn" 
                data-comment-id="${comment.id}"
                style="
                  background: none;
                  border: none;
                  cursor: pointer;
                  padding: 2px;
                  color: hsl(var(--muted-foreground));
                  transition: color 0.2s;
                "
                onmouseover="this.style.color='hsl(var(--destructive))'"
                onmouseout="this.style.color='hsl(var(--muted-foreground))'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>
            <p style="font-size: 13px; color: hsl(var(--foreground)); white-space: pre-wrap; word-break: break-word;">${comment.text}</p>
          `;

          // Dodaj event listener do przycisku usuwania
          const deleteBtn = commentDiv.querySelector('.delete-comment-btn');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              handleDeleteComment(comment.id);
              // Odśwież sekcję
              setTimeout(() => addCommentsToPropertiesPanel(elementId), 50);
            });
          }

          contentContainer.appendChild(commentDiv);
        });
      } else {
        // Brak komentarzy - pokaż komunikat
        const emptyState = document.createElement('div');
        emptyState.style.cssText = `
          text-align: center;
          padding: 16px 8px;
          color: hsl(var(--muted-foreground));
          font-size: 13px;
        `;
        emptyState.innerHTML = `
          <p style="margin-bottom: 8px;">Brak komentarzy dla tego elementu</p>
        `;
        contentContainer.appendChild(emptyState);
      }

      // Dodaj hint o dodawaniu komentarzy
      const hint = document.createElement('p');
      hint.style.cssText = `
        font-size: 11px;
        color: hsl(var(--muted-foreground));
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid hsl(var(--border) / 0.5);
      `;
      hint.textContent = elementComments.length > 0 
        ? 'Otwórz panel komentarzy 💬 aby dodać więcej' 
        : 'Kliknij ikonę 💬 na pasku narzędzi aby dodać komentarz';
      contentContainer.appendChild(hint);
      
      // Dodaj kontener z zawartością do sekcji komentarzy
      commentsSection.appendChild(contentContainer);

      // Dodaj sekcję do panelu Properties
      propertiesPanel.appendChild(commentsSection);
      
    } catch (error) {
      console.error("Error adding comments section to properties panel:", error);
    }
  };

  const handleCommentClick = async (elementId: string) => {
    console.log("Comment clicked, highlighting element:", elementId);
    
    if (!viewerRef.current || !highlighterRef.current) {
      console.log("Viewer or highlighter not ready");
      return;
    }

    try {
      const viewer = viewerRef.current;
      const highlighter = highlighterRef.current;
      const expressID = parseInt(elementId);

      // Pobierz wszystkie fragmenty z modelu
      const fragments = Object.values(viewer.scene?.get()?.children || [])
        .filter((child: any) => child.fragment);

      // Znajdź fragment zawierający ten element
      for (const fragment of fragments as any[]) {
        if (fragment.fragment) {
          const ids = fragment.fragment.ids;
          if (ids && ids.includes(expressID)) {
            // Podświetl element - użyj Set zamiast Array
            const fragmentIdMap: { [key: string]: Set<number> } = {
              [fragment.fragment.id]: new Set([expressID])
            };
            await highlighter.highlightByID("select", fragmentIdMap);
            
            // Zaktualizuj stan zaznaczonego elementu
            setSelectedElementId(elementId);
            
            // Pobierz nazwę elementu
            try {
              const model = fragment.fragment.mesh.parent;
              const properties = await model.getProperties(expressID);
              const name = properties?.Name?.value || properties?.type || `Element ${expressID}`;
              setSelectedElementName(name);
            } catch (error) {
              setSelectedElementName(`Element ${expressID}`);
            }
            
            console.log("Element highlighted successfully");
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error highlighting element:", error);
    }
  };

  return (
    <div 
      ref={viewerContainerRef} 
      style={{ width: '100%', height: '100vh', position: 'relative' }}
    >
      <ActionBar onActionSelect={handleActionSelect} />
      
      {/* Panel z paletą kolorów dla pinowania */}
      {isPinMode && (
        <div 
          className="pin-color-palette"
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: 'hsl(var(--foreground))',
            marginBottom: '4px'
          }}>
            📌 Wybierz kolor pinezki
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            flexWrap: 'wrap',
            maxWidth: '300px'
          }}>
            {pinColors.map((colorOption) => (
              <button
                key={colorOption.color}
                onClick={() => setSelectedPinColor(colorOption.color)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: selectedPinColor === colorOption.color 
                    ? '3px solid hsl(var(--primary))' 
                    : '2px solid hsl(var(--border))',
                  backgroundColor: colorOption.color,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedPinColor === colorOption.color 
                    ? '0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary))' 
                    : 'none',
                }}
                title={colorOption.name}
              />
            ))}
          </div>
          
          <div style={{
            fontSize: '12px',
            color: 'hsl(var(--muted-foreground))',
            marginTop: '4px',
            textAlign: 'center'
          }}>
            Kliknij na elementy aby je oznaczyć
          </div>
        </div>
      )}
      
      {showCommentPanel && (
        <CommentPanel
          comments={getAllComments()}
          selectedElementId={selectedElementId}
          selectedElementName={selectedElementName}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onClose={handleCloseCommentPanel}
          onCommentClick={handleCommentClick}
        />
      )}

      {/* Panel opcji wymiarowania */}
      <DimensionOptionsPanel
        isOpen={isDimensionMode}
        orthogonalMode={dimensionOrthogonal}
        snapToPoints={dimensionSnap}
        alignToEdgeMode={alignToEdgeMode}
        onOrthogonalChange={setDimensionOrthogonal}
        onSnapChange={setDimensionSnap}
        onAlignToEdgeChange={setAlignToEdgeMode}
      />

      {/* Panel wyszukiwania */}
      {showSearchPanel && (
        <SearchPanel
          onClose={() => setShowSearchPanel(false)}
          onSelectElement={handleSearchSelect}
          searchFunction={searchElements}
          onAddToSelection={addToSelection}
        />
      )}

      {/* Panel selekcji i izolacji */}
      {showSelectionPanel && (
        <SelectionPanel
          selectedElements={selectedElements}
          isIsolated={isIsolated}
          onClose={() => setShowSelectionPanel(false)}
          onRemoveElement={removeFromSelection}
          onClearSelection={clearSelection}
          onIsolate={isolateElements}
          onUnisolate={unisolateElements}
          onSelectElement={handleSelectionElementClick}
        />
      )}

    </div>
  );
};

export default Viewer;

