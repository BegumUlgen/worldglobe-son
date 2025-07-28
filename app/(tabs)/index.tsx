import GlobeScreen from '@/components/GlobeScreen';
import React from 'react';

export default function App() {
  return <GlobeScreen />;
}





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
