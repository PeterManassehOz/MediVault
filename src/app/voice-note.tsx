import { useEffect, useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useHealthRecords } from '@/context/HealthRecordsContext';


function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000),
  );

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}


export default function VoiceNoteScreen() {
  const router = useRouter();

  const {
    records,
    isLoading,
    error,
    addAttachment,
  } = useHealthRecords();

  const [selectedRecordId, setSelectedRecordId] =
    useState<string | null>(null);

  const [recordedUri, setRecordedUri] =
    useState<string | null>(null);

  const [savedDurationMs, setSavedDurationMs] =
    useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [screenError, setScreenError] = useState('');

  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });

  const recorderState = useAudioRecorderState(recorder);

  // Start with no source. When a take is recorded, load its URI
  // into this player for preview.
  const previewPlayer = useAudioPlayer(null);
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  const selectedRecord = records.find(
    (record) => record.id === selectedRecordId,
  );

  useEffect(() => {
    if (recordedUri) {
      previewPlayer.replace(recordedUri);
    } else {
      previewPlayer.pause();
    }
  }, [recordedUri, previewPlayer]);


  const handleStartRecording = async () => {
    setScreenError('');

    if (!selectedRecordId) {
      setScreenError('Select a health record before recording.');
      return;
    }

    try {
      const permission =
        await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Microphone permission required',
          'Allow MediVault to use the microphone to record a voice note.',
        );
        return;
      }

      // A new take replaces any previous preview on this screen.
      setRecordedUri(null);
      setSavedDurationMs(0);

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      setScreenError(
        err instanceof Error
          ? `Could not start recording: ${err.message}`
          : 'Could not start recording.',
      );
    }
  };


  const handleStopRecording = async () => {
    setScreenError('');

    try {
      // Capture the recorder's elapsed time before stopping it.
      const durationMs = recorderState.durationMillis ?? 0;

      await recorder.stop();

      
      const uri = recorder.uri;

      if (!uri) {
        throw new Error('The recording file was not created.');
      }

      const recordingFile = new File(uri);
      const fileBytes = new Uint8Array(
        await recordingFile.arrayBuffer(),
      );

      const firstBytesHex = Array.from(fileBytes.slice(0, 16))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(' ');

      const containerBrand =
        fileBytes.length >= 12 &&
        String.fromCharCode(...fileBytes.slice(4, 8)) === 'ftyp'
          ? String.fromCharCode(...fileBytes.slice(8, 12))
          : null;

      console.info('[MediVault] Recorder output diagnostics:', {
        uri,
        filename: recordingFile.name,
        fileSize: recordingFile.size,
        fileType: recordingFile.type,
        firstBytesHex,
        containerBrand,
      });

      setRecordedUri(uri);
      setSavedDurationMs(durationMs);


      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (err) {
      setScreenError(
        err instanceof Error
          ? `Could not stop recording: ${err.message}`
          : 'Could not stop recording.',
      );
    }
  };


  const handleDiscardRecording = () => {
    Alert.alert(
      'Discard voice note?',
      'This recording will not be attached to your health record.',
      [
        {
          text: 'Keep recording',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            previewPlayer.pause();

            if (recordedUri) {
              try {
                const discardedFile = new File(recordedUri);

                if (discardedFile.exists) {
                  discardedFile.delete();
                }
              } catch {
                // Discarding the take from the screen is still allowed.
              }
            }

            setRecordedUri(null);
            setSavedDurationMs(0);
            setScreenError('');
          },
        },
      ],
    );
  };


  const handleSaveRecording = async () => {
    if (!selectedRecord || !recordedUri || isSaving) {
      return;
    }

    setScreenError('');
    setIsSaving(true);

    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-');

      const attachmentName = `Voice note ${timestamp}.m4a`;

      await addAttachment(selectedRecord.id, {
        name: attachmentName,
        uri: recordedUri,
        mimeType: 'audio/mp4',
        size: null,
        type: 'audio',
        source: 'microphone',
        durationMs: savedDurationMs,
      });

      // addAttachment copies the recording into MediVault's
      // managed attachment directory. Remove the recorder's
      // original file after that copy has been saved.
      previewPlayer.pause();

      try {
        const originalRecording = new File(recordedUri);

        if (originalRecording.exists) {
          originalRecording.delete();
        }
      } catch {
        // The saved attachment is already safely copied.
        // A leftover source file does not invalidate the save.
      }

      Alert.alert(
        'Voice note saved',
        `The recording has been attached to "${selectedRecord.title}".`,
        [
          {
            text: 'View health record',
            onPress: () => {
              router.replace({
                pathname: '/records/[id]',
                params: { id: selectedRecord.id },
              });
            },
          },
        ],
      );
    } catch (err) {
      setScreenError(
        err instanceof Error
          ? `Could not save voice note: ${err.message}`
          : 'Could not save the voice note.',
      );
    } finally {
      setIsSaving(false);
    }
  };


  const handlePreview = () => {
    if (!recordedUri) {
      return;
    }

    if (previewStatus.playing) {
      previewPlayer.pause();
    } else {
      previewPlayer.play();
    }
  };


  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Screen heading */}
        <View className="mb-6">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            className="mb-4 h-10 w-10 items-center justify-center rounded-xl border border-[#E4E7EC] bg-white"
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="#344054"
            />
          </Pressable>

          <Text className="text-2xl font-extrabold tracking-tight text-[#101828]">
            Record a voice note
          </Text>

          <Text className="mt-2 text-sm leading-6 text-[#667085]">
            Record a personal note and attach it to one of
            your saved health records.
          </Text>
        </View>


        {/* Record selection */}
        <View className="mb-5 rounded-2xl border border-[#E4E7EC] bg-white p-4">
          <Text className="mb-1 text-base font-bold text-[#101828]">
            Attach to a health record
          </Text>

          <Text className="mb-3 text-sm leading-5 text-[#667085]">
            Choose the record this audio note belongs to.
          </Text>

          {isLoading ? (
            <View className="flex-row items-center py-3">
              <ActivityIndicator color="#047857" />

              <Text className="ml-3 text-sm text-[#667085]">
                Loading your records...
              </Text>
            </View>
          ) : error ? (
            <Text className="py-2 text-sm text-red-700">
              {error}
            </Text>
          ) : records.length === 0 ? (
            <Text className="py-2 text-sm text-[#667085]">
              You have no health records yet. Create a record
              before recording a voice note.
            </Text>
          ) : (
            <View className="gap-2">
              {records.map((record) => {
                const isSelected =
                  selectedRecordId === record.id;

                return (
                  <Pressable
                    key={record.id}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: isSelected,
                    }}
                    disabled={recorderState.isRecording || isSaving}
                    onPress={() => {
                      setSelectedRecordId(record.id);
                      setScreenError('');
                    }}
                    className={`flex-row items-center rounded-xl border p-3 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-[#E4E7EC] bg-white'
                    }`}
                  >
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#F2F4F7]">
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color="#475467"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-bold text-[#101828]">
                        {record.title}
                      </Text>

                      <Text className="mt-1 text-xs text-[#667085]">
                        {record.category} · {record.date}
                      </Text>
                    </View>

                    <Ionicons
                      name={
                        isSelected
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={21}
                      color={
                        isSelected
                          ? '#047857'
                          : '#98A2B3'
                      }
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>


        {/* Recorder and preview */}
        <View className="items-center rounded-2xl border border-[#E4E7EC] bg-white px-5 py-7">
          <View
            className={`h-20 w-20 items-center justify-center rounded-full ${
              recorderState.isRecording
                ? 'bg-red-100'
                : 'bg-emerald-50'
            }`}
          >
            <Ionicons
              name={
                recorderState.isRecording
                  ? 'mic'
                  : 'mic-outline'
              }
              size={36}
              color={
                recorderState.isRecording
                  ? '#B42318'
                  : '#047857'
              }
            />
          </View>

          <Text className="mt-4 text-lg font-extrabold text-[#101828]">
            {recorderState.isRecording
              ? 'Recording in progress'
              : recordedUri
                ? 'Recording ready'
                : 'Ready to record'}
          </Text>

          <Text className="mt-2 text-sm text-[#667085]">
            {recorderState.isRecording
              ? formatDuration(
                  recorderState.durationMillis ?? 0,
                )
              : recordedUri
                ? formatDuration(savedDurationMs)
                : 'Tap Start recording when you are ready.'}
          </Text>

          {recorderState.isRecording ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleStopRecording()}
              className="mt-6 flex-row items-center rounded-xl bg-red-600 px-6 py-3.5"
            >
              <Ionicons
                name="stop"
                size={19}
                color="#FFFFFF"
              />

              <Text className="ml-2 font-bold text-white">
                Stop recording
              </Text>
            </Pressable>
          ) : recordedUri ? (
            <View className="mt-6 w-full gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={handlePreview}
                className="flex-row items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5"
              >
                <Ionicons
                  name={
                    previewStatus.playing
                      ? 'pause'
                      : 'play'
                  }
                  size={20}
                  color="#047857"
                />

                <Text className="ml-2 font-bold text-emerald-800">
                  {previewStatus.playing
                    ? 'Pause preview'
                    : 'Play preview'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={!selectedRecord || isSaving}
                onPress={() => void handleSaveRecording()}
                className={`flex-row items-center justify-center rounded-xl bg-emerald-700 px-5 py-3.5 ${
                  !selectedRecord || isSaving
                    ? 'opacity-50'
                    : ''
                }`}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="attach"
                    size={20}
                    color="#FFFFFF"
                  />
                )}

                <Text className="ml-2 font-bold text-white">
                  {isSaving
                    ? 'Saving voice note...'
                    : 'Save to health record'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={handleDiscardRecording}
                className="items-center rounded-xl px-4 py-3"
              >
                <Text className="font-semibold text-red-700">
                  Discard recording
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={
                !selectedRecord ||
                isLoading ||
                Boolean(error)
              }
              onPress={() => void handleStartRecording()}
              className={`mt-6 flex-row items-center rounded-xl bg-emerald-700 px-6 py-3.5 ${
                !selectedRecord ||
                isLoading ||
                Boolean(error)
                  ? 'opacity-50'
                  : ''
              }`}
            >
              <Ionicons
                name="radio"
                size={19}
                color="#FFFFFF"
              />

              <Text className="ml-2 font-bold text-white">
                Start recording
              </Text>
            </Pressable>
          )}
        </View>


        {/* Errors and context */}
        {screenError ? (
          <View className="mt-4 flex-row items-start rounded-xl border border-red-200 bg-red-50 p-4">
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#B42318"
            />

            <Text className="ml-2 flex-1 text-sm leading-5 text-red-800">
              {screenError}
            </Text>
          </View>
        ) : null}

        <View className="mt-5 flex-row items-start rounded-2xl border border-[#E4E7EC] bg-[#F2F4F7] p-4">
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#475467"
          />

          <Text className="ml-3 flex-1 text-xs leading-5 text-[#667085]">
            Voice notes are stored as attachments to your
            selected record. They are personal recordings;
            MediVault does not automatically transcribe or
            medically interpret them.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}