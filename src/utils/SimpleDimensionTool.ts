import * as THREE from 'three';

interface SnapPoint {
  position: THREE.Vector3;
  type: 'vertex' | 'edge' | 'midpoint' | 'center';
  normal?: THREE.Vector3;
}

interface EdgeReference {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  line: THREE.Line | null;
}

export class SimpleDimensionTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private points: THREE.Vector3[] = [];
  private measurements: THREE.Group[] = [];
  private markers: THREE.Mesh[] = [];
  private tempGroup: THREE.Group | null = null;
  private tempMarker: THREE.Mesh | null = null;
  private snapMarker: THREE.Mesh | null = null;
  public enabled: boolean = false;

  // Opcje wymiarowania
  public orthogonalMode: boolean = false;
  public snapToPoints: boolean = false;
  public alignToEdgeMode: 'none' | 'parallel' | 'perpendicular' = 'none';
  private snapThreshold: number = 0.15; // Próg przyciągania w jednostkach modelu
  
  // Krawędź odniesienia
  private referenceEdge: EdgeReference | null = null;
  private isSelectingEdge: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 0.1 };
    this.raycaster.params.Points = { threshold: 0.1 };
  }

  public handleClick(event: MouseEvent, objects: THREE.Object3D[]): void {
    if (!this.enabled) return;

    // Jeśli tryb wyrównania do krawędzi jest włączony i nie mamy jeszcze krawędzi odniesienia
    if (this.alignToEdgeMode !== 'none' && !this.referenceEdge) {
      this.selectReferenceEdge(event, objects);
      return;
    }

    const point = this.getPoint(event, objects);
    if (!point) return;

    this.addPoint(point);
  }

  public handleMouseMove(event: MouseEvent, objects: THREE.Object3D[]): void {
    if (!this.enabled) return;

    const point = this.getPoint(event, objects);
    if (!point) {
      this.clearSnapMarker();
      if (this.points.length === 1) {
        this.clearPreview();
      }
      return;
    }

    // Pokaż snap marker jeśli snap jest włączony
    if (this.snapToPoints && this.points.length < 2) {
      this.showSnapMarker(point);
    } else {
      this.clearSnapMarker();
    }

    // Pokaż podgląd wymiaru
    if (this.points.length === 1) {
      this.updatePreview(point);
    }
  }

  private getPoint(event: MouseEvent, objects: THREE.Object3D[]): THREE.Vector3 | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length === 0) return null;

    let point = intersects[0].point.clone();

    // Jeśli snap jest włączony, znajdź najbliższy punkt charakterystyczny
    if (this.snapToPoints) {
      const snapPoint = this.findNearestSnapPoint(point, intersects[0].object);
      if (snapPoint) {
        point = snapPoint.position;
      }
    }

    // Jeśli tryb ortogonalny jest włączony i mamy już pierwszy punkt
    if (this.orthogonalMode && this.points.length === 1 && !this.referenceEdge) {
      point = this.getOrthogonalPoint(this.points[0], point);
    }

    // Jeśli mamy krawędź odniesienia i już pierwszy punkt
    if (this.referenceEdge && this.points.length === 1) {
      point = this.getAlignedToEdgePoint(this.points[0], point);
    }

    return point;
  }

  private findNearestSnapPoint(clickPoint: THREE.Vector3, object: THREE.Object3D): SnapPoint | null {
    const snapPoints: SnapPoint[] = [];

    // Zbierz wszystkie punkty charakterystyczne z geometrii
    object.traverseAncestors((ancestor) => {
      if (ancestor instanceof THREE.Mesh && ancestor.geometry) {
        const geometry = ancestor.geometry;
        const worldMatrix = ancestor.matrixWorld;

        // Pobierz wierzchołki
        const position = geometry.attributes.position;
        if (position) {
          const vertices: THREE.Vector3[] = [];
          for (let i = 0; i < position.count; i++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(position, i);
            vertex.applyMatrix4(worldMatrix);
            vertices.push(vertex);
          }

          // Dodaj wierzchołki
          vertices.forEach(v => {
            snapPoints.push({ position: v, type: 'vertex' });
          });

          // Dodaj środki krawędzi
          for (let i = 0; i < vertices.length - 1; i++) {
            const midpoint = new THREE.Vector3()
              .addVectors(vertices[i], vertices[i + 1])
              .multiplyScalar(0.5);
            snapPoints.push({ position: midpoint, type: 'edge' });
          }

          // Dodaj środek geometrii
          geometry.computeBoundingBox();
          if (geometry.boundingBox) {
            const center = new THREE.Vector3();
            geometry.boundingBox.getCenter(center);
            center.applyMatrix4(worldMatrix);
            snapPoints.push({ position: center, type: 'center' });
          }
        }
      }
    });

    // Znajdź najbliższy punkt w promieniu snapThreshold
    let nearestPoint: SnapPoint | null = null;
    let minDistance = this.snapThreshold;

    snapPoints.forEach(sp => {
      const distance = clickPoint.distanceTo(sp.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = sp;
      }
    });

    return nearestPoint;
  }

  private selectReferenceEdge(event: MouseEvent, objects: THREE.Object3D[]): void {
    console.log('📏 Selecting reference edge, mode:', this.alignToEdgeMode);
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects, true);

    console.log('📏 Intersects found:', intersects.length);

    if (intersects.length === 0) {
      console.log('📏 No intersects found!');
      return;
    }

    const intersect = intersects[0];
    const clickPoint = intersect.point;
    console.log('📏 Click point:', clickPoint);
    console.log('📏 Intersected object:', intersect.object);

    // Znajdź najbliższą krawędź
    const edge = this.findNearestEdge(clickPoint, intersect.object);
    if (!edge) {
      console.log('📏 No edge found near click point');
      return;
    }
    
    console.log('📏 Edge found!', edge);

    // Usuń poprzednią linię odniesienia jeśli istnieje
    if (this.referenceEdge?.line) {
      this.scene.remove(this.referenceEdge.line);
    }

    // Utwórz wizualizację krawędzi odniesienia
    const color = this.alignToEdgeMode === 'parallel' ? 0x4CAF50 : 0x9C27B0;
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([edge.start, edge.end]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 3,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 997;
    this.scene.add(line);

    this.referenceEdge = {
      start: edge.start,
      end: edge.end,
      direction: edge.direction,
      line: line
    };

    console.log('📏 Reference edge selected:', this.alignToEdgeMode === 'parallel' ? 'PARALLEL' : 'PERPENDICULAR');
    this.isSelectingEdge = false;
  }

  private findNearestEdge(clickPoint: THREE.Vector3, object: THREE.Object3D): { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 } | null {
    console.log('📏 Finding nearest edge for object:', object);
    let nearestEdge: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 } | null = null;
    let minDistance = this.snapThreshold * 3; // Zwiększony próg dla łatwiejszego wykrycia
    let edgesChecked = 0;

    // Przeszukaj obiekt i wszystkie jego dzieci
    const processObject = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        const geometry = obj.geometry;
        const worldMatrix = obj.matrixWorld;
        const position = geometry.attributes.position;

        if (!position) {
          console.log('📏 No position attribute in geometry');
          return;
        }
        
        console.log('📏 Processing mesh with', position.count, 'vertices');

        // Pobierz wierzchołki w przestrzeni globalnej
        const vertices: THREE.Vector3[] = [];
        for (let i = 0; i < position.count; i++) {
          const vertex = new THREE.Vector3();
          vertex.fromBufferAttribute(position, i);
          vertex.applyMatrix4(worldMatrix);
          vertices.push(vertex);
        }

        // Sprawdź krawędzie (połączenia wierzchołków)
        const index = geometry.index;
        if (index) {
          // Geometria indeksowana - używamy indeksów
          for (let i = 0; i < index.count; i += 3) {
            const indices = [
              index.getX(i),
              index.getX(i + 1),
              index.getX(i + 2)
            ];

            // Sprawdź każdą krawędź trójkąta
            const edges = [
              [indices[0], indices[1]],
              [indices[1], indices[2]],
              [indices[2], indices[0]]
            ];

            edges.forEach(([idx1, idx2]) => {
              if (idx1 < vertices.length && idx2 < vertices.length) {
                const v1 = vertices[idx1];
                const v2 = vertices[idx2];
                
                // Oblicz odległość punktu od krawędzi
                const distance = this.distanceToLineSegment(clickPoint, v1, v2);
                
                if (distance < minDistance) {
                  minDistance = distance;
                  const direction = new THREE.Vector3().subVectors(v2, v1).normalize();
                  nearestEdge = {
                    start: v1.clone(),
                    end: v2.clone(),
                    direction: direction
                  };
                  edgesChecked++;
                }
              }
            });
          }
          console.log('📏 Indexed geometry -', index.count / 3, 'triangles checked');
        } else {
          // Geometria nieindeksowana - łącz kolejne wierzchołki
          console.log('📏 Non-indexed geometry -', vertices.length, 'vertices');
          for (let i = 0; i < vertices.length - 1; i++) {
            const v1 = vertices[i];
            const v2 = vertices[i + 1];
            
            const distance = this.distanceToLineSegment(clickPoint, v1, v2);
            
            if (distance < minDistance) {
              minDistance = distance;
              const direction = new THREE.Vector3().subVectors(v2, v1).normalize();
              nearestEdge = {
                start: v1.clone(),
                end: v2.clone(),
                direction: direction
              };
              edgesChecked++;
            }
          }
        }
      }
    };

    // Wywołaj processObject na klikniętym obiekcie i jego dzieciach
    processObject(object);
    object.traverse(processObject);
    
    console.log('📏 Edges checked:', edgesChecked, 'Nearest edge:', nearestEdge, 'Min distance:', minDistance);

    // Jeśli nie znaleziono krawędzi blisko punktu, użyj uproszczonej metody
    // Znajdź najdłuższą krawędź z bounding box
    if (!nearestEdge && object instanceof THREE.Mesh && object.geometry) {
      console.log('📏 No edge found close enough, using bounding box edges');
      object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox) {
        const bbox = object.geometry.boundingBox;
        const worldMatrix = object.matrixWorld;
        
        // Pobierz rogi bounding box w przestrzeni globalnej
        const corners = [
          new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z).applyMatrix4(worldMatrix),
          new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z).applyMatrix4(worldMatrix),
        ];
        
        // Krawędzie bounding box
        const bboxEdges = [
          [corners[0], corners[1]], // bottom front
          [corners[1], corners[2]], // right front
          [corners[2], corners[3]], // top front
          [corners[3], corners[0]], // left front
          [corners[4], corners[5]], // bottom back
          [corners[5], corners[6]], // right back
          [corners[6], corners[7]], // top back
          [corners[7], corners[4]], // left back
          [corners[0], corners[4]], // bottom left
          [corners[1], corners[5]], // bottom right
          [corners[2], corners[6]], // top right
          [corners[3], corners[7]], // top left
        ];
        
        // Znajdź najbliższą krawędź z bounding box
        bboxEdges.forEach(([v1, v2]) => {
          const distance = this.distanceToLineSegment(clickPoint, v1, v2);
          if (distance < minDistance) {
            minDistance = distance;
            const direction = new THREE.Vector3().subVectors(v2, v1).normalize();
            nearestEdge = {
              start: v1,
              end: v2,
              direction: direction
            };
          }
        });
        
        console.log('📏 Using bounding box edge:', nearestEdge);
      }
    }

    return nearestEdge;
  }

  private distanceToLineSegment(point: THREE.Vector3, lineStart: THREE.Vector3, lineEnd: THREE.Vector3): number {
    const line = new THREE.Vector3().subVectors(lineEnd, lineStart);
    const lineLength = line.length();
    
    if (lineLength === 0) return point.distanceTo(lineStart);
    
    const t = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(point, lineStart).dot(line) / (lineLength * lineLength)));
    const projection = new THREE.Vector3().addVectors(lineStart, line.multiplyScalar(t));
    
    return point.distanceTo(projection);
  }

  private getAlignedToEdgePoint(startPoint: THREE.Vector3, endPoint: THREE.Vector3): THREE.Vector3 {
    if (!this.referenceEdge) return endPoint;

    const direction = this.referenceEdge.direction.clone();
    
    if (this.alignToEdgeMode === 'parallel') {
      // Rzutuj wektor na kierunek krawędzi odniesienia
      const delta = new THREE.Vector3().subVectors(endPoint, startPoint);
      const projection = direction.multiplyScalar(delta.dot(direction));
      return new THREE.Vector3().addVectors(startPoint, projection);
    } else if (this.alignToEdgeMode === 'perpendicular') {
      // Znajdź kierunek prostopadły do krawędzi odniesienia
      const delta = new THREE.Vector3().subVectors(endPoint, startPoint);
      
      // Utwórz płaszczyznę prostopadłą do krawędzi
      const perpDirection1 = new THREE.Vector3();
      if (Math.abs(direction.x) < 0.9) {
        perpDirection1.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
      } else {
        perpDirection1.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      }
      
      const perpDirection2 = new THREE.Vector3().crossVectors(direction, perpDirection1).normalize();
      
      // Rzutuj na płaszczyznę prostopadłą
      const proj1 = delta.dot(perpDirection1);
      const proj2 = delta.dot(perpDirection2);
      
      // Wybierz dominujący kierunek prostopadły
      let perpVector: THREE.Vector3;
      if (Math.abs(proj1) > Math.abs(proj2)) {
        perpVector = perpDirection1.multiplyScalar(proj1);
      } else {
        perpVector = perpDirection2.multiplyScalar(proj2);
      }
      
      return new THREE.Vector3().addVectors(startPoint, perpVector);
    }

    return endPoint;
  }

  private getOrthogonalPoint(startPoint: THREE.Vector3, endPoint: THREE.Vector3): THREE.Vector3 {
    const delta = new THREE.Vector3().subVectors(endPoint, startPoint);
    
    // Znajdź dominującą oś (największą różnicę)
    const absDelta = new THREE.Vector3(
      Math.abs(delta.x),
      Math.abs(delta.y),
      Math.abs(delta.z)
    );

    const orthogonalPoint = startPoint.clone();

    // Wybierz kierunek z największą różnicą
    if (absDelta.x >= absDelta.y && absDelta.x >= absDelta.z) {
      // Wymiar wzdłuż osi X
      orthogonalPoint.x = endPoint.x;
    } else if (absDelta.y >= absDelta.x && absDelta.y >= absDelta.z) {
      // Wymiar wzdłuż osi Y
      orthogonalPoint.y = endPoint.y;
    } else {
      // Wymiar wzdłuż osi Z
      orthogonalPoint.z = endPoint.z;
    }

    return orthogonalPoint;
  }

  private showSnapMarker(position: THREE.Vector3): void {
    this.clearSnapMarker();

    const geometry = new THREE.SphereGeometry(0.04, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFD700, // Złoty kolor dla snap
      transparent: true,
      opacity: 0.8,
      depthTest: false,
      depthWrite: false
    });
    this.snapMarker = new THREE.Mesh(geometry, material);
    this.snapMarker.position.copy(position);
    this.snapMarker.renderOrder = 1001;
    this.scene.add(this.snapMarker);

    // Dodaj pulsujący efekt
    const scale = 1 + Math.sin(Date.now() * 0.01) * 0.2;
    this.snapMarker.scale.setScalar(scale);
  }

  private clearSnapMarker(): void {
    if (this.snapMarker) {
      this.scene.remove(this.snapMarker);
      this.snapMarker = null;
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
      this.clearSnapMarker();
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

    // Jeśli to wymiar ortogonalny, dodaj wskaźnik osi
    if (this.orthogonalMode && !temporary) {
      const axisLabel = this.getAxisLabel(start, end);
      if (axisLabel) {
        const axisSprite = this.createAxisIndicator(axisLabel, lineColor);
        const labelOffset = new THREE.Vector3().subVectors(end, start).normalize().multiplyScalar(0.3);
        axisSprite.position.copy(midPoint).add(labelOffset);
        group.add(axisSprite);
      }
    }

    return group;
  }

  private getAxisLabel(start: THREE.Vector3, end: THREE.Vector3): string | null {
    const delta = new THREE.Vector3().subVectors(end, start);
    const threshold = 0.01;

    if (Math.abs(delta.y) < threshold && Math.abs(delta.z) < threshold) return 'X';
    if (Math.abs(delta.x) < threshold && Math.abs(delta.z) < threshold) return 'Y';
    if (Math.abs(delta.x) < threshold && Math.abs(delta.y) < threshold) return 'Z';

    return null;
  }

  private createAxisIndicator(axis: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return new THREE.Sprite();

    const scale = 2;
    canvas.width = 64 * scale;
    canvas.height = 64 * scale;

    // Tło
    context.fillStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.2)`;
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2, 28 * scale, 0, Math.PI * 2);
    context.fill();

    // Tekst
    context.font = `Bold ${32 * scale}px Inter, Arial, sans-serif`;
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(axis, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.2, 0.2, 1);
    sprite.renderOrder = 1000;

    return sprite;
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
    this.clearSnapMarker();
    this.clearReferenceEdge();
    
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
    this.clearSnapMarker();
    this.clearReferenceEdge();
    console.log('📏 Dimension tool disabled');
  }

  private clearReferenceEdge(): void {
    if (this.referenceEdge?.line) {
      this.scene.remove(this.referenceEdge.line);
    }
    this.referenceEdge = null;
    this.isSelectingEdge = false;
  }

  // Metoda do resetowania krawędzi odniesienia (wywoływana gdy zmienia się tryb)
  public resetReferenceEdge(): void {
    this.clearReferenceEdge();
    if (this.alignToEdgeMode !== 'none') {
      console.log('📏 Click on an edge to set as reference');
    }
  }

  // Animacja snap markera
  public updateSnapMarker(): void {
    if (this.snapMarker) {
      const scale = 1 + Math.sin(Date.now() * 0.01) * 0.2;
      this.snapMarker.scale.setScalar(scale);
    }
  }
}
