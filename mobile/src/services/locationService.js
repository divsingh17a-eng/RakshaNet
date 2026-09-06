import * as Location from 'expo-location';

// Thin wrapper so every screen requests location the same way and gets the
// same { lng, lat, accuracyMeters } shape the API expects.
export async function captureLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    const err = new Error('Location permission was not granted. Enable location access in Settings to use this feature.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });

  return {
    lng: position.coords.longitude,
    lat: position.coords.latitude,
    accuracyMeters: position.coords.accuracy ?? null
  };
}
