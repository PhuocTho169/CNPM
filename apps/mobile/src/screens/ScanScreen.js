import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useNavigation } from '@react-navigation/native';

// Accepts either a raw numeric id or a full guide URL like https://host/place/123
function extractPlaceId(data) {
  if (!data) return null;
  const raw = String(data).trim();
  if (/^\d+$/.test(raw)) return raw;
  const match = raw.match(/\/place\/(\d+)/);
  return match ? match[1] : null;
}

const looksLikeUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

export default function ScanScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [attempt, setAttempt] = useState(0); // bump to remount the camera on retry
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState(null);
  const unlockTimer = useRef(null);

  // The unlock timer must not fire after the screen is gone (React would warn
  // about setting state on an unmounted component).
  useEffect(() => () => clearTimeout(unlockTimer.current), []);

  async function askPermission() {
    setAsking(true);
    setAskError(null);
    try {
      await requestPermission();
    } catch {
      setAskError('Could not request camera access. If it stays blocked, open system settings.');
    } finally {
      setAsking(false);
    }
  }

  function openSettings() {
    // react-native-web does not implement openSettings — guard so the button
    // degrades instead of throwing.
    try {
      if (typeof Linking.openSettings === 'function') Linking.openSettings().catch(() => {});
    } catch { /* ignore */ }
  }

  function handleScan({ data }) {
    const value = String(data ?? '').trim();
    setLastScan(value);
    const placeId = extractPlaceId(value);
    if (placeId) {
      setLocked(true);
      navigation.navigate('PlaceDetail', { id: placeId, title: 'Food Guide' });
      clearTimeout(unlockTimer.current);
      unlockTimer.current = setTimeout(() => setLocked(false), 2000); // re-enable after returning
    } else if (looksLikeUrl(value)) {
      // Not a place QR — let the user open the link manually if they want.
      Linking.openURL(value).catch(() => {});
    }
  }

  function retryCamera() {
    setCameraError(null);
    setAttempt((a) => a + 1);
  }

  // Permission still resolving. Returning an empty View here left a blank
  // screen that looked like a broken button; show progress instead.
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e65100" />
        <Text style={styles.body}>Checking camera access…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Once the user (or Android's "don't ask again") denies for good,
    // requestPermission() resolves without showing anything — the camera then
    // "never opens". Send them to system settings instead of dead-ending.
    const blocked = permission.status === 'denied' && !permission.canAskAgain;
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={{ fontSize: 40 }}>📷</Text>
        <Text style={styles.title}>{blocked ? 'Camera access is off' : 'Camera permission needed'}</Text>
        <Text style={styles.body}>
          {blocked
            ? 'Camera access for this app was turned off. Enable it in system settings, then come back to scan.'
            : 'Scan the QR code at any culinary location in District 4 to open its multilingual audio guide.'}
        </Text>
        {askError && <Text style={styles.error}>{askError}</Text>}
        {blocked ? (
          <TouchableOpacity style={styles.button} onPress={openSettings}>
            <Text style={styles.buttonText}>Open Settings</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.button} onPress={askPermission} disabled={asking}>
            <Text style={styles.buttonText}>{asking ? 'Requesting…' : 'Allow camera'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const invalid = lastScan && !extractPlaceId(lastScan) && !looksLikeUrl(lastScan);

  return (
    <View style={styles.root}>
      {/* Mount the camera only while this tab is on screen: keeping a native
          camera session alive in a background tab leaves a black preview when
          the user comes back. */}
      {isFocused && !cameraError && (
        <CameraView
          key={attempt}
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={locked ? undefined : handleScan}
          onMountError={(e) =>
            setCameraError(e?.message || e?.nativeEvent?.message || 'Camera failed to start.')}
        />
      )}

      {cameraError ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>📷</Text>
          <Text style={styles.title}>Camera failed to start</Text>
          <Text style={styles.body}>{cameraError}</Text>
          <TouchableOpacity style={styles.button} onPress={retryCamera}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <View style={styles.bottom}>
            <Text style={styles.hint}>Point at the QR code at the food location</Text>
            {invalid && (
              <Text style={styles.invalid}>Unrecognized QR: {String(lastScan).slice(0, 60)}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  // Full-screen layer over the preview: aiming frame in the middle,
  // hint pinned above the tab bar.
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 230,
    height: 230,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#ff833a',
    backgroundColor: 'transparent',
  },
  bottom: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20 },
  hint: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, fontSize: 13, textAlign: 'center' },
  invalid: { color: '#ffb4a9', marginTop: 8, fontSize: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 8, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf6f1' },
  title: { fontSize: 18, fontWeight: '800', marginTop: 10, color: '#2b2118', textAlign: 'center' },
  body: { textAlign: 'center', color: '#6d6156', marginTop: 8, fontSize: 14, maxWidth: 300, paddingHorizontal: 8 },
  error: { color: '#b3261e', marginTop: 10, fontSize: 13, textAlign: 'center', maxWidth: 300 },
  button: { marginTop: 18, backgroundColor: '#e65100', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
