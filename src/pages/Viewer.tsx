import { useEffect, useRef, useState } from "react";
import * as OBC from "openbim-components";
import * as THREE from "three";
import ActionBar from "../components/ActionBar";

const Viewer = () => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OBC.Components | null>(null);
  const [activeAction, setActiveAction] = useState<string>("move");

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
    const ambientLight = new THREE.AmbientLight(0xE6E7E4, 1);
    const directionalLight = new THREE.DirectionalLight(0xF9F9F9, 0.75);
    directionalLight.position.set(10, 50, 10);
    scene.add(ambientLight, directionalLight);
    scene.background = new THREE.Color(0x202932);

    // --- KONTENER RENDERA ---
    const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainerRef.current);
    viewer.renderer = rendererComponent;

    // --- KAMERA ---
    const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer);
    viewer.camera = cameraComponent;

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

    const propertiesProcessor = new OBC.IfcPropertiesProcessor(viewer);

    // --- Po wczytaniu modelu ---
    ifcLoader.onIfcLoaded.add(async (model) => {
      // przetwarzanie właściwości
      propertiesProcessor.process(model);
      await highlighter.updateHighlight();

      // reagowanie na zaznaczenia
      highlighter.events.select.onHighlight.add((selection) => {
        const fragmentID = Object.keys(selection)[0];
        const expressID = Number([...selection[fragmentID]][0]);
        propertiesProcessor.renderProperties(model, expressID);
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
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, []);

  const handleActionSelect = (action: string) => {
    setActiveAction(action);
    console.log("Selected action:", action);
    // TODO: Implement action handlers for OpenBIM Components
    // Examples:
    // - undo/redo: integrate with history management
    // - pin: use highlighter to mark elements
    // - dimensions: use measurement tools
    // - camera: capture screenshots
  };

  return (
    <div 
      ref={viewerContainerRef} 
      style={{ width: '100%', height: '100vh', position: 'relative' }}
    >
      <ActionBar onActionSelect={handleActionSelect} />
    </div>
  );
};

export default Viewer;

