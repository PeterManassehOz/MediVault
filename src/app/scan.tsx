import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useHealthRecords } from "@/context/HealthRecordsContext";
import { colors } from "@/constants/colors";

const scanColors = {
  primary: colors.brand.primary,
  primaryLight: colors.brand.primaryLight,
  background: colors.background.light,
  surface: colors.background.card,
  text: colors.text.primary,
  muted: colors.text.secondary,
  border: colors.border.default,
};

type CapturedScan = {
  uri: string;
};

export default function ScanScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    replaceRecordId?: string;
    replaceAttachmentId?: string;
  }>();

  const replaceRecordId =
    typeof params.replaceRecordId === 'string'
      ? params.replaceRecordId
      : undefined;

  const replaceAttachmentId =
    typeof params.replaceAttachmentId === 'string'
      ? params.replaceAttachmentId
      : undefined;

  const isRescanMode = Boolean(replaceRecordId && replaceAttachmentId);

  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const { records, addAttachment, removeAttachment } = useHealthRecords();
  const hasValidatedRescanTarget = useRef(false);
  const [capturedScan, setCapturedScan] = useState<CapturedScan | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);


  useEffect(() => {
    if (!isRescanMode || !replaceRecordId || !replaceAttachmentId) {
      return;
    }

    // Validate the original target only once.
    // After a successful rescan, that original attachment is removed.
    if (hasValidatedRescanTarget.current) {
      return;
    }

    const targetRecord = records.find(
      (item) => item.id === replaceRecordId,
    );

    const targetAttachment = targetRecord?.attachments?.find(
      (item) => item.id === replaceAttachmentId,
    );

    if (
      !targetRecord ||
      !targetAttachment ||
      targetAttachment.type !== 'image' ||
      targetAttachment.source !== 'camera-scan'
    ) {
      Alert.alert(
        'Cannot rescan attachment',
        'The selected camera-scan attachment could not be found.',
        [{ text: 'Go back', onPress: () => router.back() }],
      );

      return;
    }

    // Mark the target as validated before setting state.
    // Later records updates must not revalidate the deleted original.
    hasValidatedRescanTarget.current = true;
    setSelectedRecordId(targetRecord.id);
  }, [
    isRescanMode,
    replaceRecordId,
    replaceAttachmentId,
    records,
    router,
  ]);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });

      if (!photo?.uri) {
        Alert.alert(
          "Capture failed",
          "We couldn't capture the page. Please try again."
        );
        return;
      }

      setCapturedScan({ uri: photo.uri });
    } catch {
      Alert.alert(
        "Camera error",
        "Unable to take the photo. Please try again."
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSaveScan = async () => {
    if (!capturedScan) {
      Alert.alert("No scan captured", "Take a photo of the document first.");
      return;
    }

    if (!selectedRecordId) {
      Alert.alert(
        "Select a record",
        "Choose the health record you want to attach this scan to."
      );
      return;
    }

    const selectedRecord = records.find(
      (record) => record.id === selectedRecordId
    );

    if (!selectedRecord) {
      Alert.alert(
        "Record unavailable",
        "That record could not be found. Please select another."
      );
      return;
    }

    if (
      isRescanMode &&
      replaceRecordId &&
      selectedRecordId !== replaceRecordId
    ) {
      Alert.alert(
        'Invalid rescan target',
        'The selected record does not match the record being rescanned.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const scanFile = new File(capturedScan.uri);

      await addAttachment(selectedRecordId, {
        name: `Medical scan ${timestamp}.jpg`,
        uri: capturedScan.uri,
        mimeType: "image/jpeg",
        size: scanFile.size,
        type: "image",
        source: "camera-scan",
      });

            
      if (isRescanMode && replaceRecordId && replaceAttachmentId) {
        try {
          await removeAttachment(replaceRecordId, replaceAttachmentId);
        } catch {
          Alert.alert(
            'Scan saved, but original remains',
            'The new scan was saved, but the previous attachment could not be removed. Both attachments may now be present.',
            [{ text: 'Return to edit', onPress: () => router.back() }],
          );

          return;
        }

        Alert.alert(
          'Scan replaced',
          'The new scan has replaced the previous camera scan.',
          [{ text: 'Return to edit', onPress: () => router.back() }],
        );

        return;
      }

      Alert.alert(
        "Scan saved",
        `The scan has been attached to "${selectedRecord.title}".`,
        [
          {
            text: "View record",
            onPress: () =>
              router.replace({
                pathname: "/records/[id]",
                params: { id: selectedRecordId },
              }),
          },
        ]
      );
    } catch {
      Alert.alert(
        "Could not save scan",
        "The image wasn't attached. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={scanColors.primary} />
        <Text style={styles.helperText}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIcon}>
          <Ionicons
            name="camera-outline"
            size={34}
            color={scanColors.primary}
          />
        </View>

        <Text style={styles.title}>Camera access needed</Text>

        <Text style={styles.helperText}>
          MediVault needs camera access to photograph medical documents.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            void requestPermission();
          }}
        >
          <Text style={styles.primaryButtonText}>Allow camera access</Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>

      {!capturedScan ? (
        <>
          <View style={styles.cameraFrame}>
            <CameraView
              ref={cameraRef}
              style={styles.cameraFill}
              facing="back"
            />

            <View pointerEvents="none" style={styles.scanGuide}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          <Text style={styles.cameraHint}>
            Place the page inside the frame and make sure the text is readable.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture document"
            disabled={isCapturing}
            onPress={handleCapture}
            style={[
              styles.captureButton,
              isCapturing && styles.buttonDisabled,
            ]}
          >
            {isCapturing ? (
              <ActivityIndicator color={scanColors.primary} />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </Pressable>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.previewContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Preview</Text>

          <Image
            source={{ uri: capturedScan.uri }}
            style={styles.previewImage}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => setCapturedScan(null)}
            style={styles.retakeButton}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={scanColors.primary}
            />
            <Text style={styles.retakeText}>Retake photo</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>
            {isRescanMode
              ? 'Rescan attachment'
              : 'Choose a health record'}
          </Text>

          <Text style={styles.helperText}>
            {isRescanMode
              ? 'Capture a new photo to replace the existing camera scan.'
              : 'Choose the health record where you want this image stored.'}
          </Text>

          {!isRescanMode && (
            <>
              {records.length === 0 ? (
                <View style={styles.emptyRecords}>
                  <Ionicons
                    name="folder-open-outline"
                    size={26}
                    color={scanColors.muted}
                  />

                  <Text style={styles.emptyRecordsText}>
                    You don't have any records yet. Create a health record first,
                    then return here to attach the scan.
                  </Text>

                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => router.push("/records/add")}
                  >
                    <Text style={styles.primaryButtonText}>Create a record</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.recordList}>
                  {records.map((record) => {
                    const isSelected = record.id === selectedRecordId;

                    return (
                      <Pressable
                        key={record.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => setSelectedRecordId(record.id)}
                        style={[
                          styles.recordOption,
                          isSelected && styles.recordOptionSelected,
                        ]}
                      >
                        <View style={styles.recordIcon}>
                          <Ionicons
                            name="document-text-outline"
                            size={20}
                            color={scanColors.primary}
                          />
                        </View>

                        <View style={styles.recordInfo}>
                          <Text style={styles.recordTitle}>
                            {record.title}
                          </Text>

                          <Text style={styles.recordMeta}>
                            {record.category} · {record.date}
                          </Text>
                        </View>

                        <Ionicons
                          name={
                            isSelected
                              ? "radio-button-on"
                              : "radio-button-off"
                          }
                          size={22}
                          color={
                            isSelected
                              ? scanColors.primary
                              : scanColors.muted
                          }
                        />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {((!isRescanMode && records.length > 0) ||
           (isRescanMode && selectedRecordId !== null)) && (
            <Pressable
              accessibilityRole="button"
              disabled={!selectedRecordId || isSaving}
              onPress={handleSaveScan}
              style={[
                styles.primaryButton,
                (!selectedRecordId || isSaving) && styles.buttonDisabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isRescanMode
                    ? 'Replace scanned attachment'
                    : 'Save scan to record'}
                </Text>
              )}
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: scanColors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: scanColors.background,
    gap: 12,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: scanColors.background,
    padding: 28,
  },
  permissionIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: scanColors.surface,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: scanColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: scanColors.text,
  },
  subtitle: {
    fontSize: 13,
    color: scanColors.muted,
    marginTop: 4,
  },
  cameraFrame: {
    height: 440,
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#101010",
  },
  scanGuide: {
    ...StyleSheet.absoluteFill,
    margin: 24,
  },
  cameraFill: {
    ...StyleSheet.absoluteFill,
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: "#FFFFFF",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  cameraHint: {
    textAlign: "center",
    color: scanColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  captureButton: {
    alignSelf: "center",
    marginTop: 24,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: scanColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: scanColors.primary,
  },
  previewContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: scanColors.text,
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 300,
    resizeMode: "contain",
    backgroundColor: scanColors.surface,
    borderRadius: 16,
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 20,
  },
  retakeText: {
    fontWeight: "600",
    color: scanColors.primary,
  },
  helperText: {
    color: scanColors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 18,
  },
  recordList: {
    gap: 10,
    marginBottom: 20,
  },
  recordOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: scanColors.border,
    borderRadius: 16,
    backgroundColor: scanColors.surface,
  },
  recordOptionSelected: {
    borderColor: scanColors.primary,
    backgroundColor: scanColors.primaryLight,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: scanColors.background,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    color: scanColors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  recordMeta: {
    color: scanColors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  emptyRecords: {
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    backgroundColor: scanColors.surface,
    marginBottom: 20,
  },
  emptyRecordsText: {
    textAlign: "center",
    color: scanColors.muted,
    lineHeight: 20,
    marginVertical: 12,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: scanColors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    padding: 14,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: scanColors.primary,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});