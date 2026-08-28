import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';

// This app is a thin native shell around RakshaNet's Mobile Preview - the
// same browser-based Citizen/Volunteer experience built into the web
// Command Center (web/src/pages/MobilePreviewPage.jsx), wrapped as an
// installable Android app so it can be demoed without a browser address bar.
// It is NOT the full offline-first native app (that lives in /mobile) - it's
// exactly the Mobile Preview, packaged.
// ?embedded=1 tells the page to drop its desktop-only phone-frame chrome
// (bezel, fake status bar, "browser demo" banner) - this WebView already IS
// the phone, so that decoration would just be a phone-within-a-phone.
const MOBILE_PREVIEW_URL = 'https://sih-web-nine.vercel.app/mobile-preview?embedded=1';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);

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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: MOBILE_PREVIEW_URL }}
        style={styles.webview}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        onLoadEnd={onLoadEnd}
        geolocationEnabled
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        originWhitelist={['*']}
      />
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
