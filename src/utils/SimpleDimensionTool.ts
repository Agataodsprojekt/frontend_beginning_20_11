import * as THREE from 'three';

export class SimpleDimensionTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private points: THREE.Vector3[] = [];
  private currentLine: THREE.Line | null = null;
  private currentLabel: any = null;
  private measurements: Array<{ line: THREE.Line; label: any }> = [];
  public enabled: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }

  public handleClick(event: MouseEvent, objects: THREE.Object3D[]): void {
    if (!this.enabled) return;

    // Oblicz pozycję myszy w znormalizowanych współrzędnych (-1 do +1)
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Raycast
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.addPoint(point);
    }
  }

  private addPoint(point: THREE.Vector3): void {
    console.log('📏 Point added:', point);

    // Dodaj wizualny marker (czerwona kulka)
    const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(point);
    this.scene.add(marker);

    this.points.push(point);

    if (this.points.length === 2) {
      this.createMeasurement();
      this.points = [];
    }
  }

  private createMeasurement(): void {
    const start = this.points[0];
    const end = this.points[1];
    const distance = start.distanceTo(end);

    console.log(`📏 Creating measurement: ${distance.toFixed(3)} meters`);

    // Utwórz linię
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: 0x0066ff,
      linewidth: 2,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 999;
    this.scene.add(line);

    // Utwórz tekst (używając CSS2DRenderer będzie lepiej, ale na razie sprite)
    this.createLabel(start, end, distance);

    this.measurements.push({ line, label: null });
  }

  private createLabel(start: THREE.Vector3, end: THREE.Vector3, distance: number): void {
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    // Utwórz canvas dla tekstu
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 256;
    canvas.height = 128;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'Bold 48px Arial';
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${distance.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);

    // Utwórz sprite z tekstem
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(midPoint);
    sprite.scale.set(2, 1, 1);
    sprite.renderOrder = 1000;
    this.scene.add(sprite);

    this.currentLabel = sprite;
  }

  public clear(): void {
    this.points = [];
    this.measurements.forEach(({ line, label }) => {
      if (line) this.scene.remove(line);
      if (label) this.scene.remove(label);
    });
    this.measurements = [];
    
    // Usuń wszystkie czerwone markery
    const markers = this.scene.children.filter(
      (obj) => obj instanceof THREE.Mesh && 
      (obj.material as THREE.MeshBasicMaterial).color?.getHex() === 0xff0000
    );
    markers.forEach((marker) => this.scene.remove(marker));
    
    console.log('📏 All measurements cleared');
  }

  public enable(): void {
    this.enabled = true;
    this.points = [];
    console.log('📏 Dimension tool enabled');
  }

  public disable(): void {
    this.enabled = false;
    this.points = [];
    console.log('📏 Dimension tool disabled');
  }
}

