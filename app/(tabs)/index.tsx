import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer, TextureLoader } from 'expo-three';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { LOCATIONS } from "../../utils/locations";

type SelectedPoint = {
  lat: number;
  lon: number;
  key: "from" | "to";
};

type SelectedPoints = {
  from: SelectedPoint | null;
  to: SelectedPoint | null;
};

export default function App() {
  const [fromText, setFromText] = useState("Nereden");
  const [toText, setToText] = useState("Nereye");
  const [activeInput, setActiveInput] = useState<"from" | "to" | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<SelectedPoints>({
    from: null,
    to: null
  });
  
  const rotation = useRef({ x: 0, y: 0 });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const markersRef = useRef<THREE.Mesh[]>([]);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '85%'], []);

  const onGestureEvent = (event: any) => {
    const { translationX, translationY } = event.nativeEvent;
    rotation.current.y += translationX * 0.0001;
    rotation.current.x += translationY * 0.0001;
  };

  const coordsTo3D = (lat: number, lon: number, radius = 1.01) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return { x, y, z };
  };

  const updateMarkers = () => {
    if (!sceneRef.current || !earthGroupRef.current) return;

    // Eski marker'ları temizle
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
      const geometry = new THREE.SphereGeometry(0.03, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: point.key === 'from' ? 0xff0000 : 0x00ff00
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(position.x, position.y, position.z);
      earthGroupRef.current?.add(sphere);
      markersRef.current.push(sphere);
    });
  };

  // Konum seçimi fonksiyonu
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

  // Mesafe hesaplama fonksiyonu (Haversine formula)
  const calculateDistance = (from: SelectedPoint, to: SelectedPoint) => {
    const R = 6371; // Dünya'nın yarıçapı km cinsinden
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lon - from.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    updateMarkers();
  }, [selectedPoints]);

  // Her iki nokta seçili mi kontrol et
  const bothPointsSelected = selectedPoints.from !== null && selectedPoints.to !== null;
  const distance = bothPointsSelected 
    ? calculateDistance(selectedPoints.from!, selectedPoints.to!)
    : 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Başlık Bölümü */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => bottomSheetRef.current?.expand()}>
            <Text style={styles.hamburger}>≡</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dünya Küresi</Text>
        </View>

        {/* Küre Bölümü */}
        <PanGestureHandler onGestureEvent={onGestureEvent}>
          <View style={{ flex: 1 }}>
            <GLView
              style={{ flex: 1 }}
              onContextCreate={async (gl) => {
                try {
                  const renderer = new Renderer({ gl });
                  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

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

                  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
                  scene.add(ambientLight);

                  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                  directionalLight.position.set(5, 5, 5);
                  scene.add(directionalLight);

                  // Dokular
                  const earthAsset = Asset.fromModule(require('@/assets/2k_earth_nightmap.jpg'));
                  const earthTexture = await new TextureLoader().loadAsync(earthAsset.uri);
                  const starAsset = Asset.fromModule(require('@/assets/8k_stars.jpg'));
                  const starTexture = await new TextureLoader().loadAsync(starAsset.uri);



                  

                  // Yıldız küresi
                  const starMaterial = new THREE.MeshBasicMaterial({
                    map: starTexture,
                    side: THREE.BackSide
                  });
                  const starSphere = new THREE.Mesh(
                    new THREE.SphereGeometry(50, 64, 64),
                    starMaterial
                  );
                  scene.add(starSphere);

                  const earthMaterial = new THREE.MeshBasicMaterial({ map: earthTexture });
                  const earthSphere = new THREE.Mesh(
                    new THREE.SphereGeometry(1, 64, 64),
                    earthMaterial
                  );

                  const earthGroup = new THREE.Group();
                  earthGroup.add(earthSphere);
                  scene.add(earthGroup);
                  earthGroupRef.current = earthGroup;

                  updateMarkers();

                  const render = () => {
                    requestAnimationFrame(render);
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
                  render();
                } catch (error) {
                  console.error('GLView initialization error:', error);
                }
              }}
            />
          </View>
        </PanGestureHandler>

        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose
        >
          <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
            
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

            {/* Rota hesaplama butonu */}
            {bothPointsSelected && (
              <TouchableOpacity
                style={styles.calculateButton}
                onPress={() => {
                  console.log('Rota hesaplanıyor:', selectedPoints);
                }}
              >
                <Text style={styles.calculateButtonText}>Rotayı Hesapla</Text>
              </TouchableOpacity>
            )}

            {/* Mesafe gösterimi */}
            {bothPointsSelected && (
              <View style={styles.distanceContainer}>
                <Text style={styles.distanceText}>
                  Havayolu: {Math.round(distance)} km
                </Text>
              </View>
            )}
          </BottomSheetScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  hamburger: {
    color: '#fff',
    fontSize: 24,
    marginRight: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
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
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  locationScrollView: {
    maxHeight: 150,
    marginTop: 10,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  calculateButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  distanceContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});