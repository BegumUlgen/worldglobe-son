
import countriesGeoJSON from '@/assets/custom.geo.json';
import BottomSheet from '@gorhom/bottom-sheet';
import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer, TextureLoader } from 'expo-three';
import { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, PinchGestureHandler, PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import * as THREE from 'three';

const { width, height } = Dimensions.get('window');

type SelectedPoint = {
  lat: number;
  lon: number;
  key: "from" | "to";
};

type SelectedPoints = {
  from: SelectedPoint | null;
  to: SelectedPoint | null;
};

type CountryLabel = {
  name: string;
  position: THREE.Vector3;
};

type GeoJSONFeature = {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: { [key: string]: any };
};

// Mobil uyumlu text texture oluşturma
const createTextTexture = (text: string): THREE.Texture => {
  try {
    let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
    
    // Web ortamında document varsa normal canvas kullan
    if (typeof document !== 'undefined' && document.createElement) {
      canvas = document.createElement('canvas');
    } 
    // Mobil ortamda OffscreenCanvas varsa onu kullan
    else if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(256, 128);
    }
    
    if (!canvas) {
      console.warn('Canvas not available');
      return new THREE.Texture();
    }

    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.warn('Canvas context not available');
      return new THREE.Texture();
    }

    // Text rendering
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas as any);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  } catch (error) {
    console.warn('Text texture creation failed:', error);
    return new THREE.Texture();
  }
};

// Alternatif: Basit sprite tabanlı label sistemi (canvas olmadan)
const createSimpleSprite = (color: number = 0xffffff): THREE.Sprite => {
  // Canvas yerine basit renk tabanlı sprite material
  const spriteMaterial = new THREE.SpriteMaterial({
    color: color,
    transparent: true,
    opacity: 0.8,
  });
  
  return new THREE.Sprite(spriteMaterial);
};

export default function App() {
  const [fromText, setFromText] = useState("Nereden");
  const [toText, setToText] = useState("Nereye");
  const [activeInput, setActiveInput] = useState<"from" | "to" | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<SelectedPoints>({
    from: null,
    to: null
  });
  const [distance, setDistance] = useState<number | null>(null);

  const rotation = useRef({ x: 0, y: 0 });
  const rotationVelocity = useRef({ x: 0, y: 0 });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const markersRef = useRef<THREE.Mesh[]>([]);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const scale = useRef(1);
  const labelsRef = useRef<THREE.Sprite[]>([]);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '85%'], []);

  const coordsTo3D = (lat: number, lon: number, radius = 1.01) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return { x, y, z };
  };

  const getCountryCentroid = (coords: number[][][] | number[][][][]) => {
    try {
      const allCoords = Array.isArray(coords[0][0][0])
        ? (coords as number[][][][]).flat(2)
        : (coords as number[][][]).flat(1);

      if (allCoords.length === 0) return null;

      const avgLat = allCoords.reduce((acc, [, lat]) => acc + lat, 0) / allCoords.length;
      const avgLon = allCoords.reduce((acc, [lon]) => acc + lon, 0) / allCoords.length;
      return { lat: avgLat, lon: avgLon };
    } catch (error) {
      console.warn('Centroid calculation error:', error);
      return null;
    }
  };

  // Country labels - mobil performans için daha da optimize edilmiş
  const countryLabels = useMemo(() => {
    const geoData = countriesGeoJSON as FeatureCollection;
    if (!geoData?.features) return [];

    // Daha fazla ülke gösterelim ama performanslı şekilde
    const majorCountries = ['Turkey', 'United States', 'China', 'Russia', 'Brazil', 'India', 'Germany', 'France', 'United Kingdom', 'Japan'];
    
    return geoData.features
      .filter((feature: Feature<Geometry, GeoJsonProperties>) => 
        feature.properties?.name && majorCountries.includes(feature.properties.name)
      )
      .slice(0, 10) // 10 ülkeye çıkardık
      .map((feature: Feature<Geometry, GeoJsonProperties>) => {
        if (!feature.properties?.name || !feature.geometry) return null;
        
        const { name } = feature.properties;
        const geometry = feature.geometry;
        
        if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return null;
        
        const coords = geometry.coordinates;
        const center = getCountryCentroid(coords);
        
        if (!center) return null;
        
        const { x, y, z } = coordsTo3D(center.lat, center.lon, 1.02);
        return { name, position: new THREE.Vector3(x, y, z) };
      })
      .filter(Boolean) as CountryLabel[];
  }, []);

  const updateMarkers = () => {
    if (!sceneRef.current || !earthGroupRef.current) return;

    // Önceki marker'ları temizle
    markersRef.current.forEach(marker => {
      earthGroupRef.current?.remove(marker);
      marker.geometry.dispose();
      if (marker.material instanceof THREE.Material) {
        marker.material.dispose();
      }
    });
    markersRef.current = [];

    // Yeni marker'ları ekle
    Object.values(selectedPoints).forEach((point) => {
      if (!point) return;
      const position = coordsTo3D(point.lat, point.lon);
      const geometry = new THREE.SphereGeometry(0.02, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: point.key === 'from' ? 0xff0000 : 0x00ff00
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(position.x, position.y, position.z);
      earthGroupRef.current?.add(sphere);
      markersRef.current.push(sphere);
    });
  };

  const handleLocationSelect = (location: any, type: "from" | "to") => {
    if (type === "from") {
      setFromText(location.name);
      setSelectedPoints((prev) => ({
        ...prev,
        from: {
          lat: location.lat,
          lon: location.lon,
          key: "from"
        }
      }));
    } else {
      setToText(location.name);
      setSelectedPoints((prev) => ({
        ...prev,
        to: {
          lat: location.lat,
          lon: location.lon,
          key: "to"
        }
      }));
    }
    setActiveInput(null);
  };

  const calculateDistance = (from: SelectedPoint, to: SelectedPoint) => {
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lon - from.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleCalculateDistance = () => {
    if (selectedPoints.from && selectedPoints.to) {
      const dist = calculateDistance(selectedPoints.from, selectedPoints.to);
      setDistance(dist);
    }
  };

  // Mobil uyumlu label ekleme fonksiyonu
  const addCountryLabelsToGlobe = () => {
    if (!earthGroupRef.current) return;
    
    // Önceki label'ları temizle
    labelsRef.current.forEach(sprite => {
      earthGroupRef.current?.remove(sprite);
      if (sprite.material.map) {
        sprite.material.map.dispose();
      }
      sprite.material.dispose();
    });
    labelsRef.current = [];
    
    // Zoom seviyesinden bağımsız olarak label'ları göster (test için)
    console.log('Adding country labels, scale:', scale.current);
    
    countryLabels.forEach(({ name, position }) => {
      try {
        const texture = createTextTexture(name);
        
        // Texture başarıyla oluşturuldu mu kontrol et
        if (texture) {
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
          });

          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.copy(position);
          sprite.scale.set(0.2, 0.1, 1); // Biraz büyüttük
          earthGroupRef.current?.add(sprite);
          labelsRef.current.push(sprite);
          console.log(`Added label for ${name}`);
        } else {
          // Fallback: basit renkli nokta
          const simpleSprite = createSimpleSprite(0xffffff);
          simpleSprite.position.copy(position);
          simpleSprite.scale.set(0.05, 0.05, 1);
          earthGroupRef.current?.add(simpleSprite);
          labelsRef.current.push(simpleSprite);
          console.log(`Added simple sprite for ${name}`);
        }
      } catch (error) {
        console.warn(`Label creation failed for ${name}:`, error);
        // Hata durumunda basit sprite ekle
        const simpleSprite = createSimpleSprite(0xffff00);
        simpleSprite.position.copy(position);
        simpleSprite.scale.set(0.03, 0.03, 1);
        earthGroupRef.current?.add(simpleSprite);
        labelsRef.current.push(simpleSprite);
      }
    });
  };

  const onPinchEvent = (event: PinchGestureHandlerGestureEvent) => {
    if (event.nativeEvent.scale) {
      const newScale = Math.min(Math.max(event.nativeEvent.scale, 0.5), 3);
      scale.current = newScale;
      
      if (cameraRef.current) {
        cameraRef.current.position.z = 3 / newScale;
      }
      
      // Label görünürlüğünü güncelle
      addCountryLabelsToGlobe();
    }
  };

  useEffect(() => {
    updateMarkers();
  }, [selectedPoints]);

  useEffect(() => {
    // Scale'den bağımsız olarak label'ları göster (test için)
    addCountryLabelsToGlobe();
  }, [scale.current]);

  // Örnek lokasyon verileri
  const sampleLocations = [
    { name: "İstanbul", lat: 41.0082, lon: 28.9784 },
    { name: "Ankara", lat: 39.9334, lon: 32.8597 },
    { name: "İzmir", lat: 38.4192, lon: 27.1287 },
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  ];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => bottomSheetRef.current?.expand()}>
            <Text style={styles.hamburger}>≡</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dünya Küresi</Text>
        </View>

        <PinchGestureHandler onGestureEvent={onPinchEvent}>
          <PanGestureHandler
            onGestureEvent={(event) => {
              // Mobil için optimize edilmiş hareket hassasiyeti
              rotationVelocity.current.y += event.nativeEvent.translationX * 0.000005;
              rotationVelocity.current.x += event.nativeEvent.translationY * 0.000005;
            }}
          >
            <View style={{ flex: 1 }}>
              <GLView
                style={{ flex: 1 }}
                onContextCreate={async (gl) => {
                  try {
                    const renderer = new Renderer({ gl });
                    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
                    
                    // Mobil performans için pixel ratio optimizasyonu
                    const pixelRatio = typeof window !== 'undefined' && window.devicePixelRatio 
                      ? Math.min(2, window.devicePixelRatio) 
                      : 1;
                    renderer.setPixelRatio(pixelRatio);

                    const scene = new THREE.Scene();
                    sceneRef.current = scene;
                    scene.background = new THREE.Color(0x000000);

                    const camera = new THREE.PerspectiveCamera(
                      75,
                      gl.drawingBufferWidth / gl.drawingBufferHeight,
                      0.1,
                      1000
                    );
                    camera.position.z = 3;
                    cameraRef.current = camera;

                    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
                    scene.add(ambientLight);

                    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                    directionalLight.position.set(5, 5, 5);
                    scene.add(directionalLight);

                    // Texture loading
                    const earthAsset = Asset.fromModule(require('@/assets/2k_earth_nightmap.jpg'));
                    await earthAsset.downloadAsync();
                    const earthTexture = await new TextureLoader().loadAsync(earthAsset.uri);
                    
                    const starAsset = Asset.fromModule(require('@/assets/8k_stars.jpg'));
                    await starAsset.downloadAsync();
                    const starTexture = await new TextureLoader().loadAsync(starAsset.uri);

                    // Star sphere - mobil performans için optimize edilmiş
                    const starMaterial = new THREE.MeshBasicMaterial({
                      map: starTexture,
                      side: THREE.BackSide,
                    });
                    const starSphere = new THREE.Mesh(
                      new THREE.SphereGeometry(50, 24, 24), // Segment sayısı daha da azaltıldı
                      starMaterial
                    );
                    scene.add(starSphere);

                    // Earth sphere and group - mobil performans için optimize edilmiş
                    const earthMaterial = new THREE.MeshBasicMaterial({ map: earthTexture });
                    const earthSphere = new THREE.Mesh(
                      new THREE.SphereGeometry(1, 24, 24), // Segment sayısı daha da azaltıldı
                      earthMaterial
                    );

                    const earthGroup = new THREE.Group();
                    earthGroup.add(earthSphere);
                    scene.add(earthGroup);
                    earthGroupRef.current = earthGroup;
                    earthGroup.position.set(-1, -1, -1);
                    earthGroup.scale.set(1, 1, 1);

                    // GeoJSON Wireframe - mobil performans için optimize edilmiş
                    const geoData = countriesGeoJSON as FeatureCollection;
                    if (geoData && geoData.features && earthGroupRef.current) {
                      let lineCount = 0;
                      const maxLines = 200; // Mobil performans sınırı daha da düşürüldü

                      geoData.features.forEach((feature: Feature<Geometry, GeoJsonProperties>) => {
                        if (lineCount >= maxLines) return;
                        
                        const geometry = feature.geometry;

                        if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
                          try {
                            const coords = geometry.type === "Polygon"
                              ? [geometry.coordinates]
                              : geometry.coordinates;

                            (coords as number[][][][]).forEach((polygon: number[][][]) => {
                              if (lineCount >= maxLines) return;
                              
                              polygon.forEach((ring: number[][]) => {
                                if (ring.length > 2 && lineCount < maxLines) {
                                  const points: THREE.Vector3[] = [];

                                  // Mobil performans için her 3. noktayı al
                                  for (let i = 0; i < ring.length; i += 3) {
                                    const [lon, lat] = ring[i];
                                    const { x, y, z } = coordsTo3D(lat, lon, 1.005);
                                    points.push(new THREE.Vector3(x, y, z));
                                  }

                                  if (points.length > 1) {
                                    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                                    const material = new THREE.LineBasicMaterial({
                                      color: 0x444444,
                                      transparent: true,
                                      opacity: 0.3,
                                    });
                                    const line = new THREE.Line(lineGeometry, material);
                                    earthGroupRef.current!.add(line);
                                    lineCount++;
                                  }
                                }
                              });
                            });
                          } catch (error) {
                            console.warn("GeoJSON parsing error for feature:", error);
                          }
                        }
                      });

                      // İlk label ekleme - mobil uyumlu
                      setTimeout(() => {
                        addCountryLabelsToGlobe();
                      }, 1000); // Sahne yüklendikten sonra label'ları ekle
                    }

                    updateMarkers();

                    const animate = () => {
                      requestAnimationFrame(animate);

                      rotation.current.x += rotationVelocity.current.x;
                      rotation.current.y += rotationVelocity.current.y;

                      // Mobil için yumuşak momentum
                      rotationVelocity.current.x *= 0.95;
                      rotationVelocity.current.y *= 0.95;

                      if (earthGroup) {
                        earthGroup.rotation.x = rotation.current.x;
                        earthGroup.rotation.y = rotation.current.y;
                      }
                      if (starSphere) {
                        starSphere.rotation.x = rotation.current.x * 0.1;
                        starSphere.rotation.y = rotation.current.y * 0.1;
                      }

                      renderer.render(scene, camera);
                      gl.endFrameEXP();
                    };

                    animate();
                  } catch (error) {
                    console.error('GLView initialization error:', error);
                  }
                }}
              />
            </View>
          </PanGestureHandler>
        </PinchGestureHandler>

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
        >
          <View style={styles.bottomSheetContent}>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Başlangıç Noktası</Text>
              <TouchableOpacity
                style={styles.textBox}
                onPress={() => setActiveInput("from")}
              >
                <Text>{fromText}</Text>
              </TouchableOpacity>
              
              {activeInput === "from" && (
                <ScrollView style={styles.locationScrollView}>
                  {sampleLocations.map((location, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.locationItem}
                      onPress={() => handleLocationSelect(location, "from")}
                    >
                      <Text>{location.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Varış Noktası</Text>
              <TouchableOpacity
                style={styles.textBox}
                onPress={() => setActiveInput("to")}
              >
                <Text>{toText}</Text>
              </TouchableOpacity>
              
              {activeInput === "to" && (
                <ScrollView style={styles.locationScrollView}>
                  {sampleLocations.map((location, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.locationItem}
                      onPress={() => handleLocationSelect(location, "to")}
                    >
                      <Text>{location.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <TouchableOpacity
              style={styles.calculateButton}
              onPress={handleCalculateDistance}
            >
              <Text style={styles.calculateButtonText}>Mesafe Hesapla</Text>
            </TouchableOpacity>

            {distance && (
              <View style={styles.distanceContainer}>
                <Text style={styles.distanceText}>
                  Mesafe: {distance.toFixed(2)} km
                </Text>
              </View>
            )}
          </View>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  hamburger: {
    color: 'white',
    fontSize: 24,
    marginRight: 15,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  inputBox: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  textBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  locationScrollView: {
    maxHeight: 150,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  locationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  calculateButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  distanceContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});




 {/* <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
  <View style={styles.inputBox}>
    <Text style={styles.inputLabel}>Nereden</Text>
    <TouchableOpacity
      onPress={() => setActiveInput(activeInput === "from" ? null : "from")}
      style={styles.textBox}
    >
      <Text>{fromText}</Text>
    </TouchableOpacity>

    {activeInput === "from" && (
      <ScrollView
        style={styles.locationScrollView}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      >
        {LOCATIONS.map((location, index) => (
          <TouchableOpacity
            key={`from-${index}`}
            onPress={() => handleLocationSelect(location, "from")}
            style={styles.locationItem}
          >
            <Text>{location.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}
  </View>

  <View style={styles.inputBox}>
    <Text style={styles.inputLabel}>Nereye</Text>
    <TouchableOpacity
      onPress={() => setActiveInput(activeInput === "to" ? null : "to")}
      style={styles.textBox}
    >
      <Text>{toText}</Text>
    </TouchableOpacity>

    {activeInput === "to" && (
      <ScrollView
        style={styles.locationScrollView}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      >
        {LOCATIONS.map((location, index) => (
          <TouchableOpacity
            key={`to-${index}`}
            onPress={() => handleLocationSelect(location, "to")}
            style={styles.locationItem}
          >
            <Text>{location.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}
  </View>

  {selectedPoints.from && selectedPoints.to && (
    <>
      <TouchableOpacity
        style={styles.calculateButton}
        onPress={() => {
          console.log("Rota hesaplanıyor:", selectedPoints);
        }}
      >
        <Text style={styles.calculateButtonText}>Rotayı Hesapla</Text>
      </TouchableOpacity>

      <View style={styles.distanceContainer}>
        <Text style={styles.distanceText}>
          Havayolu Mesafesi: {Math.round(calculateDistance(selectedPoints.from, selectedPoints.to))} km
        </Text>
      </View>
    </>
  )}
</BottomSheetScrollView> */}
