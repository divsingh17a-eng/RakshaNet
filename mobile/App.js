import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';

// This is the RakshaNet Citizen/Volunteer mobile app: a native Android shell
// around the live web-based Citizen/Volunteer experience
// (web/src/pages/MobilePreviewPage.jsx), so the same real backend-connected
// screens (SOS, report a hazard, alerts, verify a report) install and run
// like a real app - no browser address bar, real home-screen icon.
// ?embedded=1 tells the page to drop its desktop-only phone-frame chrome
// (bezel, fake status bar, "browser demo" banner) - this WebView already IS
// the phone, so that decoration would just be a phone-within-a-phone.
const MOBILE_PREVIEW_URL = 'https://sih-web-nine.vercel.app/mobile-preview?embedded=1';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  // Real connectivity failure (DNS/timeout/offline) vs a normal load - shows a
  // branded retry screen instead of the WebView's default ugly native error
  // page, since a live demo can hit a flaky venue wifi at any moment.
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false; // let the default (exit app) behavior happen at the root screen
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  const onLoadEnd = useCallback(() => {
    setLoading(false);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const onError = useCallback((syntheticEvent) => {
    setLoading(false);
    setLoadError(syntheticEvent.nativeEvent?.description || 'Could not reach the RakshaNet server.');
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const retry = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    setReloadKey((k) => k + 1); // remounts the WebView for a clean retry, not just reload()
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {!loadError && (
        <WebView
          key={reloadKey}
          ref={webViewRef}
          source={{ uri: MOBILE_PREVIEW_URL }}
          style={styles.webview}
          onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
          onLoadEnd={onLoadEnd}
          onError={onError}
          onHttpError={onError}
          geolocationEnabled
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          originWhitelist={['*']}
        />
      )}
      {loading && !loadError && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      )}
      {loadError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Couldn&apos;t connect</Text>
          <Text style={styles.errorMessage}>
            Check your internet connection, then try again. ({loadError})
          </Text>
          <Pressable style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Android renders edge-to-edge by default on recent Expo/RN versions - the
// WebView content draws full-screen and the system status bar (clock/wifi/
// battery) floats on top of it rather than reserving its own space, which
// clipped the app's own header text underneath it. Reserve that space
// manually on Android; iOS's notch/Dynamic Island is a display cutout the
// OS already reserves room for, not an overlaid bar, so it needs nothing.
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 0;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: STATUS_BAR_HEIGHT },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#fff'
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  errorMessage: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#DC2626', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});
