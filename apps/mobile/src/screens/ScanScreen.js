import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { WEB_BASE, isUnsafeBaseUrl } from '../api';

// QR → URL of the guide website. The site itself shows the language selector,
// so a successful scan immediately lets the guest pick their language.
export function qrToUrl(raw) {
  const data = (raw || '').trim();
  if (/^https?:\/\//i.test(data)) {
    // Old QRs may encode localhost — rewrite the host so phones on the same
    // wifi can actually open it, keeping the /place/{id} or /dish/{id} path.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(data)) {
      return data.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, WEB_BASE);
    }
    return data;
  }
  if (/^\d+$/.test(data)) return `${WEB_BASE}/place/${data}`;
  return null;
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState(
    isUnsafeBaseUrl ? '⚠️ EXPO_PUBLIC_API_URL đang dùng localhost — đặt IP LAN để website mở được trên điện thoại' : 'Hướng camera vào mã QR tại quán'
  );
  const coolDown = useRef(0);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e65100" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>Cần quyền camera để quét mã QR tại quán.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>📷 Cấp quyền camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.cameraBox}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            const now = Date.now();
            if (now < coolDown.current) return;
            coolDown.current = now + 4000;
            const url = qrToUrl(data);
            if (!url) {
              setStatus('❌ Mã QR không hợp lệ — hãy quét mã QR tại quán.');
              return;
            }
            setStatus(`✅ Quét thành công — đang mở trang web: ${url}`);
            Linking.openURL(url).catch(() => setStatus('❌ Không mở được trình duyệt.'));
          }}
        />
      </View>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.hint}>
        Quét thành công → website mở ngay mục “Chọn ngôn ngữ” (Việt/English/中文/한국어/日本語).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf6f1', padding: 24 },
  wrap: { flex: 1, backgroundColor: '#faf6f1', padding: 16 },
  cameraBox: { borderRadius: 16, overflow: 'hidden', flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  status: { marginTop: 12, fontSize: 14, color: '#4b3f36', textAlign: 'center' },
  hint: { marginTop: 6, fontSize: 12, color: '#8a7d72', textAlign: 'center' },
  note: { fontSize: 14, color: '#4b3f36', marginBottom: 16, textAlign: 'center' },
  button: { backgroundColor: '#e65100', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
