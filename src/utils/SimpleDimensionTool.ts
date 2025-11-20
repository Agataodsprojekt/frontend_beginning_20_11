import * as THREE from 'three';

export class SimpleDimensionTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private points: THREE.Vector3[] = [];
  private measurements: THREE.Group[] = [];
  private markers: THREE.Mesh[] = [];
  private tempGroup: THREE.Group | null = null;
  private tempMarker: THREE.Mesh | null = null;
  public enabled: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }

  public handleClick(event: MouseEvent, objects: THREE.Object3D[]): void {
    if (!this.enabled) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.addPoint(point);
    }
  }

  public handleMouseMove(event: MouseEvent, objects: THREE.Object3D[]): void {
    if (!this.enabled || this.points.length !== 1) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.updatePreview(point);
    }
  }

  private addPoint(point: THREE.Vector3): void {
    console.log('📏 Point added:', point);

    // Dodaj mały, subtelny marker
    const marker = this.createMarker(point, 0xff4444, false);
    this.scene.add(marker);
    this.markers.push(marker);

    this.points.push(point);

    if (this.points.length === 2) {
      this.createMeasurement();
      this.clearPreview();
      this.points = [];
    }
  }

  private createMarker(position: THREE.Vector3, color: number, temporary: boolean): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.02, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: temporary,
      opacity: temporary ? 0.7 : 1,
      depthTest: false,
      depthWrite: false
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    marker.renderOrder = 999;
    return marker;
  }

  private updatePreview(endPoint: THREE.Vector3): void {
    this.clearPreview();

    const startPoint = this.points[0];
    const distance = startPoint.distanceTo(endPoint);

    // Utwórz grupę tymczasową
    this.tempGroup = this.createDimensionGroup(startPoint, endPoint, distance, true);
    this.scene.add(this.tempGroup);

    // Tymczasowy marker
    this.tempMarker = this.createMarker(endPoint, 0x4CAF50, true);
    this.scene.add(this.tempMarker);
  }

  private clearPreview(): void {
    if (this.tempGroup) {
      this.scene.remove(this.tempGroup);
      this.tempGroup = null;
    }
    if (this.tempMarker) {
      this.scene.remove(this.tempMarker);
      this.tempMarker = null;
    }
  }

  private createMeasurement(): void {
    const start = this.points[0];
    const end = this.points[1];
    const distance = start.distanceTo(end);

    console.log(`📏 Creating measurement: ${distance.toFixed(3)} meters`);

    const group = this.createDimensionGroup(start, end, distance, false);
    this.scene.add(group);
    this.measurements.push(group);
  }

  private createDimensionGroup(
    start: THREE.Vector3,
    end: THREE.Vector3,
    distance: number,
    temporary: boolean
  ): THREE.Group {
    const group = new THREE.Group();

    // Kolory
    const lineColor = temporary ? 0x4CAF50 : 0x2196F3;
    const opacity = temporary ? 0.7 : 1;

    // Główna linia wymiarowa
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: lineColor,
      linewidth: 1,
      transparent: temporary,
      opacity: opacity,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 998;
    group.add(line);

    // Strzałki na końcach
    this.createArrow(group, start, end, lineColor, temporary);
    this.createArrow(group, end, start, lineColor, temporary);

    // Etykieta w środku
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const label = this.createLabel(distance, temporary);
    label.position.copy(midPoint);
    group.add(label);

    return group;
  }

  private createArrow(
    group: THREE.Group,
    position: THREE.Vector3,
    targetPosition: THREE.Vector3,
    color: number,
    temporary: boolean
  ): void {
    const direction = new THREE.Vector3().subVectors(targetPosition, position).normalize();
    
    const arrowLength = 0.06;
    const arrowWidth = 0.02;

    const arrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: temporary,
      opacity: temporary ? 0.7 : 1,
      depthTest: false,
      depthWrite: false
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

    arrow.position.copy(position);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    arrow.renderOrder = 998;

    group.add(arrow);
  }

  private createLabel(distance: number, temporary: boolean): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return new THREE.Sprite();

    // Zwiększ rozdzielczość dla lepszej jakości
    const scale = 4;
    canvas.width = 256 * scale;
    canvas.height = 80 * scale;

    // Tło z gradientem i obramowaniem
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    if (temporary) {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(1, 'rgba(240, 250, 245, 0.95)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      gradient.addColorStop(1, 'rgba(245, 248, 255, 0.98)');
    }

    // Zaokrąglony prostokąt
    const radius = 12 * scale;
    const padding = 8 * scale;
    this.roundRect(context, padding, padding, canvas.width - 2 * padding, canvas.height - 2 * padding, radius);
    context.fillStyle = gradient;
    context.fill();

    // Obramowanie
    context.strokeStyle = temporary ? 'rgba(76, 175, 80, 0.4)' : 'rgba(33, 150, 243, 0.5)';
    context.lineWidth = 3 * scale;
    this.roundRect(context, padding, padding, canvas.width - 2 * padding, canvas.height - 2 * padding, radius);
    context.stroke();

    // Cień na tekście dla lepszej czytelności
    context.shadowColor = 'rgba(0, 0, 0, 0.2)';
    context.shadowBlur = 4 * scale;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 2 * scale;

    // Tekst
    context.font = `Bold ${56 * scale}px Inter, Arial, sans-serif`;
    context.fillStyle = '#1f2937';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${distance.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);

    // Usuń cień dla kolejnych operacji
    context.shadowColor = 'transparent';

    // Utwórz sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    // Zmniejsz rozmiar sprite'a
    sprite.scale.set(0.8, 0.25, 1);
    sprite.renderOrder = 1000;

    return sprite;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public clear(): void {
    this.points = [];
    
    // Usuń wszystkie pomiary
    this.measurements.forEach((group) => this.scene.remove(group));
    this.measurements = [];
    
    // Usuń wszystkie markery
    this.markers.forEach((marker) => this.scene.remove(marker));
    this.markers = [];
    
    // Usuń podgląd
    this.clearPreview();
    
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
    this.clearPreview();
    console.log('📏 Dimension tool disabled');
  }
}
