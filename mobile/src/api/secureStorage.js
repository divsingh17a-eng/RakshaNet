import * as SecureStore from 'expo-secure-store';

// Thin wrapper so callers don't import expo-secure-store directly - Metro
// resolves secureStorage.web.js instead on web builds (SecureStore has no
// web implementation and throws at call time).
export const getItemAsync = SecureStore.getItemAsync;
export const setItemAsync = SecureStore.setItemAsync;
export const deleteItemAsync = SecureStore.deleteItemAsync;
