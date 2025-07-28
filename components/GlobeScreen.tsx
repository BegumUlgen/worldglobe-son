import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer, TextureLoader } from 'expo-three';
import React, { useEffect, useMemo, useRef } from 'react';
import { Dimensions, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { Text as TroikaText } from 'troika-three-text';

import { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import countriesGeoJSON from '../assets/custom.geo.json';

const typedCountriesGeoJSON = countriesGeoJSON as FeatureCollection;
const { width, height } = Dimensions.get('window');

// Lat/lon to 3D coordinates on sphere
const coordsTo3D = (lat: number, lon: number, radius = 1.01) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
};

// Get centroid from Polygon or MultiPolygon geometry
const getCountryCentroid = (geometry: Polygon | MultiPolygon) => {
  let coords: number[][] = [];

  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    coords = geometry.coordinates[0][0];
  } else {
    return null;
  }

  if (coords.length === 0) return null;

  const lats = coords.map(c => c[1]);
  const lons = coords.map(c => c[0]);

  const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;

  return { lat: avgLat, lon: avgLon };
};

// ÜLKE İSMİ TEXT OLUŞTUR
const createLabelSprite = (text: string) => {
  const textMesh = new TroikaText();
  textMesh.text = text;
  textMesh.fontSize = 0.1;
  textMesh.color = 0xffffff;
  textMesh.anchorX = 'center';
  textMesh.anchorY = 'middle';
  textMesh.outlineWidth = 0.01;
  textMesh.outlineColor = 0x000000;
  textMesh.material.transparent = true;
  
  return textMesh;
};

export default function GlobeScreen() {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const labelsRef = useRef<TroikaText[]>([]);
  const rotation = useRef({ x: 0, y: 0 });
  const rotationVelocity = useRef({ x: 0, y: 0 });
  const scale = useRef(1);

  // Prepare country labels data from custom.geo.json
  const countryLabels = useMemo(() => {
    if (!typedCountriesGeoJSON.features) {
      console.log('No features found in custom.geo.json');
      return [];
    }

    const labels = typedCountriesGeoJSON.features
      .map(feature => {
        if (!feature.properties?.name) return null;
        if (
          feature.geometry?.type !== 'Polygon' &&
          feature.geometry?.type !== 'MultiPolygon'
        ) return null;

        const centroid = getCountryCentroid(feature.geometry as Polygon | MultiPolygon);
        if (!centroid) return null;

        return {
          name: feature.properties.name,
          position: coordsTo3D(centroid.lat, centroid.lon, 1.02),
        };
      })
      .filter((x): x is { name: string; position: THREE.Vector3 } => x !== null);

    console.log(`Loaded ${labels.length} countries from custom.geo.json`);
    return labels;
  }, []);

  // Add or update labels on the globe
  const updateLabels = () => {
    if (!earthGroupRef.current || !cameraRef.current) return;

    // Clear old labels
    labelsRef.current.forEach(textMesh => {
      earthGroupRef.current?.remove(textMesh);
      textMesh.dispose();
    });
    labelsRef.current = [];

    const camDistance = cameraRef.current.position.z;

    // Yakınlaştırınca ülke isimlerini göster - daha erken görünmesi için eşik yükseltildi
    if (camDistance > 2.5) return;
    
    console.log('Camera Z:', camDistance, 'Adding country labels...');
    
    // custom.geo.json verilerini kullan - TÜM ÜLKELERİ GÖSTER
    const visibleCountries = countryLabels;
    
    visibleCountries.forEach(({ name, position }) => {
      const textMesh = createLabelSprite(name);
      if (!textMesh) return;

      textMesh.position.copy(position);
      
      // Zoom seviyesine göre boyut ve görünürlük
      const zoomFactor = (2.5 - camDistance) / 1.5; // 0-1 arası
      textMesh.scale.setScalar(Math.max(0.3, zoomFactor * 1.2));
      textMesh.material.opacity = Math.max(0.6, zoomFactor);

      earthGroupRef.current?.add(textMesh);
      labelsRef.current.push(textMesh);
    });
    
    console.log(`Added ${labelsRef.current.length} country labels from geo.json`);
  };

  // Pinch ile zoom işlemi - daha yumuşak
  const onPinchGestureEvent = (event: any) => {
    if (!cameraRef.current) return;

    const newScale = Math.min(Math.max(event.nativeEvent.scale, 0.8), 2.5); // Daha sınırlı zoom
    scale.current = newScale;
    cameraRef.current.position.z = 3 / newScale;

    updateLabels();
  };

  // Pan ile dünya döndürme - daha yavaş
  const onPanEvent = (event: any) => {
    const sensitivity = 0.0005; // Çok daha yavaş dönüş
    rotationVelocity.current.y += event.nativeEvent.translationX * sensitivity;
    rotationVelocity.current.x += event.nativeEvent.translationY * sensitivity;

    setTimeout(updateLabels, 100);
  };

  // Zoom In fonksiyonu - daha yumuşak
  const zoomIn = () => {
    if (!cameraRef.current) return;
    
    const newScale = Math.min(scale.current * 1.2, 2.5); // Daha yumuşak zoom
    scale.current = newScale;
    cameraRef.current.position.z = 3 / newScale;
    
    console.log('Zoom In - Scale:', newScale, 'Camera Z:', cameraRef.current.position.z);
    updateLabels();
  };

  // Zoom Out fonksiyonu - daha yumuşak
  const zoomOut = () => {
    if (!cameraRef.current) return;
    
    const newScale = Math.max(scale.current / 1.2, 0.8); // Daha yumuşak zoom
    scale.current = newScale;
    cameraRef.current.position.z = 3 / newScale;
    
    console.log('Zoom Out - Scale:', newScale, 'Camera Z:', cameraRef.current.position.z);
    updateLabels();
  };

  useEffect(() => {
    updateLabels();
  }, [countryLabels]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PinchGestureHandler onGestureEvent={onPinchGestureEvent}>
        <PanGestureHandler onGestureEvent={onPanEvent}>
          <View style={{ flex: 1 }}>
            <GLView
              style={{ flex: 1 }}
              onContextCreate={async gl => {
                const renderer = new Renderer({ gl });
                renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
                renderer.setPixelRatio(1);
                renderer.setClearColor(0x000000, 1);
                rendererRef.current = renderer;

                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x000011);
                sceneRef.current = scene;

                const camera = new THREE.PerspectiveCamera(
                  75,
                  gl.drawingBufferWidth / gl.drawingBufferHeight,
                  0.1,
                  1000
                );
                camera.position.z = 3;
                cameraRef.current = camera;

                const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
                scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                directionalLight.position.set(5, 5, 5);
                scene.add(directionalLight);

                // Earth texture
                const earthAsset = Asset.fromModule(require('../assets/2k_earth_nightmap.jpg'));
                await earthAsset.downloadAsync();
                const earthTexture = await new TextureLoader().loadAsync(earthAsset.uri);

                const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
                const earthMaterial = new THREE.MeshLambertMaterial({
                  map: earthTexture,
                  transparent: false,
                });
                const earthSphere = new THREE.Mesh(earthGeometry, earthMaterial);

                const earthGroup = new THREE.Group();
                earthGroup.add(earthSphere);
                earthGroupRef.current = earthGroup;
                scene.add(earthGroup);

                // Stars
                const starsGeometry = new THREE.BufferGeometry();
                const starsCount = 1500;
                const positions = new Float32Array(starsCount * 3);
                for (let i = 0; i < starsCount; i++) {
                  const phi = Math.acos(2 * Math.random() - 1);
                  const theta = 2 * Math.PI * Math.random();
                  const r = 50 + (Math.random() - 0.5) * 10;
                  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                  positions[i * 3 + 2] = r * Math.cos(phi);
                }
                starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                const starsMaterial = new THREE.PointsMaterial({
                  color: 0xffffff,
                  size: 0.15,
                  sizeAttenuation: true,
                  transparent: true,
                  opacity: 0.7,
                });
                const stars = new THREE.Points(starsGeometry, starsMaterial);
                starsRef.current = stars;
                scene.add(stars);

                // Animate loop
                const animate = () => {
                  requestAnimationFrame(animate);

                  rotation.current.x += rotationVelocity.current.x;
                  rotation.current.y += rotationVelocity.current.y;

                  rotationVelocity.current.x *= 0.95; // Daha yavaş durma
                  rotationVelocity.current.y *= 0.95;

                  rotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.current.x));

                  if (earthGroupRef.current) {
                    earthGroupRef.current.rotation.x = rotation.current.x;
                    earthGroupRef.current.rotation.y = rotation.current.y;
                  }

                  // Yıldızları yavaşça döndür
                  if (starsRef.current) {
                    starsRef.current.rotation.y += 0.0002; // Çok yavaş dönüş
                    starsRef.current.rotation.x += 0.0001;
                  }

                  // Text labels kameraya baksın 
                  if (labelsRef.current.length > 0 && cameraRef.current) {
                    labelsRef.current.forEach(textMesh => {
                      textMesh.lookAt(cameraRef.current!.position);
                    });
                  }

                  renderer.render(scene, camera);
                  gl.endFrameEXP();
                };

                animate();
              }}
            />
            
            {/* Zoom Butonları */}
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
                <Text style={styles.zoomButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
                <Text style={styles.zoomButtonText}>-</Text>
              </TouchableOpacity>
            </View>
          </View>
        </PanGestureHandler>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  zoomControls: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  zoomButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  zoomButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
