import { useState } from 'react';
import { shareAttachment } from '@/utils/attachmentFiles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useHealthRecords } from '@/context/HealthRecordsContext';
import type { HealthRecordAttachment } from '@/constants/healthRecords';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';


const categoryColors = {
  'Lab Results': {
    background: 'bg-emerald-50',
    foreground: '#047857',
    icon: 'flask-outline' as const,
  },
  Prescriptions: {
    background: 'bg-violet-50',
    foreground: '#6D28D9',
    icon: 'medkit-outline' as const,
  },
  Reports: {
    background: 'bg-blue-50',
    foreground: '#1D4ED8',
    icon: 'document-text-outline' as const,
  },
  Imaging: {
    background: 'bg-amber-50',
    foreground: '#B45309',
    icon: 'scan-outline' as const,
  },
};

function formatAudioDuration(durationMs?: number): string {
  if (
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs < 0
  ) {
    return 'Duration unavailable';
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}


function AudioAttachmentPlayer({
  attachment,
}: {
  attachment: HealthRecordAttachment;
}) {
  const player = useAudioPlayer(attachment.uri);
  const status = useAudioPlayerStatus(player);

  const handleTogglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View className="flex-row items-center rounded-2xl border border-[#E4E7EC] bg-white p-4">
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
        <Ionicons
          name="musical-notes-outline"
          size={24}
          color="#047857"
        />
      </View>

      <View className="ml-3 flex-1">
        <Text
          numberOfLines={2}
          className="text-sm font-bold text-[#101828]"
        >
          {attachment.name}
        </Text>

        <Text className="mt-1 text-xs text-[#667085]">
          Voice note · {formatAudioDuration(attachment.durationMs)}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          status.playing ? 'Pause voice note' : 'Play voice note'
        }
        onPress={handleTogglePlayback}
        className="ml-3 h-11 w-11 items-center justify-center rounded-full bg-emerald-700"
      >
        <Ionicons
          name={status.playing ? 'pause' : 'play'}
          size={20}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
}

export default function RecordDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const {
    getRecordById,
    deleteRecord,
    isLoading,
    error,
    refreshRecords,
  } = useHealthRecords();

  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

    
  const [selectedImage, setSelectedImage] =
    useState<HealthRecordAttachment | null>(null);

  const [openingAttachmentId, setOpeningAttachmentId] =
    useState<string | null>(null);

  const [attachmentError, setAttachmentError] = useState('');

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null || !Number.isFinite(bytes) || bytes < 0) {
      return 'Size unavailable';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (name: string) => {
    const extension = name.split('.').pop();
    return extension && extension !== name
      ? extension.toUpperCase()
      : 'FILE';
  };

  const handleOpenAttachment = async (
    attachment: HealthRecordAttachment,
  ) => {
    setAttachmentError('');
    setOpeningAttachmentId(attachment.id);

    try {
      if (attachment.type === 'image') {
        setSelectedImage(attachment);
        return;
      }

            await shareAttachment(attachment);
    } catch (err) {
      console.error(
        '[MediVault] Could not open attachment:',
        attachment.name,
        err,
      );

      setAttachmentError(
        err instanceof Error
          ? `Could not open "${attachment.name}". ${err.message}`
          : `Could not open "${attachment.name}". Please try again.`,
      );
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  
    const handleShareAttachment = async (
    attachment: HealthRecordAttachment,
  ) => {
    try {
      await shareAttachment(attachment);
    } catch (err) {
      console.error('[MediVault] Sharing failed:', err);

      Alert.alert(
        'Unable to share',
        err instanceof Error
          ? err.message
          : 'The saved file could not be shared. Please check that it is still available.',
      );
    }
  };

  const record = id ? getRecordById(id) : undefined;

  const handleDelete = async () => {
    if (!record || isDeleting) {
      return;
    }

    setActionError('');
    setIsDeleting(true);

    try {
      await deleteRecord(record.id);
      router.replace('/(tabs)/records');
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Unable to delete this record. Please try again.',
      );
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (!record || isDeleting) {
      return;
    }

    if (Platform.OS === 'web') {
      // Alert.alert is not consistently supported on web.
      // Use the browser confirmation dialog on the web platform.
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          `Delete "${record.title}"? This action cannot be undone.`,
        )
      ) {
        void handleDelete();
      }

      return;
    }

    Alert.alert(
      'Delete health record?',
      `Are you sure you want to delete "${record.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void handleDelete(),
        },
      ],
      { cancelable: true },
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <ActivityIndicator size="large" color="#047857" />
        <Text className="mt-4 text-base font-semibold text-[#344054]">
          Loading record
        </Text>
        <Text className="mt-2 text-center text-sm leading-6 text-[#667085]">
          Retrieving the saved health record.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <View className="h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color="#B42318"
          />
        </View>

        <Text className="mt-5 text-center text-xl font-bold text-[#101828]">
          Unable to load record
        </Text>

        <Text className="mt-2 max-w-sm text-center text-sm leading-6 text-[#667085]">
          {error}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => void refreshRecords()}
          className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 active:bg-emerald-800"
        >
          <Text className="text-sm font-bold text-white">
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!record) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <View className="h-16 w-16 items-center justify-center rounded-2xl border border-[#EAECF0] bg-white">
          <Ionicons
            name="document-text-outline"
            size={28}
            color="#667085"
          />
        </View>

        <Text className="mt-5 text-center text-xl font-bold text-[#101828]">
          Record not found
        </Text>

        <Text className="mt-2 max-w-sm text-center text-sm leading-6 text-[#667085]">
          This record may have been removed, or the requested identifier is
          invalid. Return to your records and select an available entry.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(tabs)/records')}
          className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 active:bg-emerald-800"
        >
          <Text className="text-sm font-bold text-white">
            Return to records
          </Text>
        </Pressable>
      </View>
    );
  }

  const categoryStyle = categoryColors[record.category];

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Record summary */}
        <View className="rounded-2xl border border-[#E4E7EC] bg-white p-5">
          <View className="flex-row items-start">
            <View
              className={`h-14 w-14 items-center justify-center rounded-2xl ${categoryStyle.background}`}
            >
              <Ionicons
                name={categoryStyle.icon}
                size={25}
                color={categoryStyle.foreground}
              />
            </View>

            <View className="ml-4 flex-1 pt-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                Health record
              </Text>

              <Text className="mt-1 text-sm leading-5 text-[#344054]">
                {record.subtitle}
              </Text>
            </View>
          </View>

          <View
            className={`mt-5 self-start rounded-full px-3 py-1.5 ${categoryStyle.background}`}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: categoryStyle.foreground }}
            >
              {record.category}
            </Text>
          </View>

          <Text className="mt-4 text-2xl font-bold leading-8 tracking-tight text-[#101828]">
            {record.title}
          </Text>

          <View className="my-5 h-px bg-[#EAECF0]" />

          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#F2F4F7]">
              <Ionicons
                name="calendar-outline"
                size={19}
                color="#667085"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-xs font-medium text-[#667085]">
                Record date
              </Text>

              <Text className="mt-1 text-sm font-semibold text-[#344054]">
                {record.date}
              </Text>
            </View>
          </View>
        </View>

        {/* Record actions */}
        <View className="mt-4 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit health record"
            disabled={isDeleting}
            onPress={() =>
              router.push({
                pathname: '/records/edit/[id]',
                params: { id: record.id },
              })
            }
            className="flex-1 flex-row items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3.5 active:bg-emerald-100"
          >
            <Ionicons
              name="create-outline"
              size={19}
              color="#047857"
            />
            <Text className="ml-2 text-sm font-bold text-emerald-800">
              Edit record
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete health record"
            accessibilityState={{ disabled: isDeleting }}
            disabled={isDeleting}
            onPress={confirmDelete}
            className="flex-1 flex-row items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-3.5 active:bg-red-100"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#B42318" />
            ) : (
              <Ionicons
                name="trash-outline"
                size={19}
                color="#B42318"
              />
            )}
            <Text className="ml-2 text-sm font-bold text-red-700">
              {isDeleting ? 'Deleting...' : 'Delete record'}
            </Text>
          </Pressable>
        </View>

        {actionError ? (
          <View
            accessibilityRole="alert"
            className="mt-4 flex-row items-start rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#B42318"
            />
            <Text className="ml-2 flex-1 text-sm leading-5 text-red-800">
              {actionError}
            </Text>
          </View>
        ) : null}

        {/* Record information */}
        <View className="mt-7">
          <Text className="text-lg font-bold text-[#101828]">
            Record information
          </Text>

          <Text className="mt-1 text-sm leading-6 text-[#667085]">
            Details saved for this entry.
          </Text>

          <View className="mt-4 rounded-2xl border border-[#E4E7EC] bg-white p-5">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                Description
              </Text>

              <Text className="mt-3 text-sm leading-6 text-[#344054]">
                {record.description}
              </Text>
            </View>

            <View className="my-5 h-px bg-[#EAECF0]" />

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                Record identifier
              </Text>

              <View className="mt-3 flex-row items-center justify-between rounded-xl bg-[#F8FAFC] px-4 py-3">
                <Text
                  selectable
                  className="flex-1 text-sm font-semibold text-[#344054]"
                >
                  {record.id}
                </Text>

                <Ionicons
                  name="finger-print-outline"
                  size={18}
                  color="#98A2B3"
                />
              </View>
            </View>
          </View>
        </View>

              
        {/* Saved attachments */}
        <View className="mt-7">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-bold text-[#101828]">
                Attachments
              </Text>

              <Text className="mt-1 text-sm leading-6 text-[#667085]">
                Images and documents saved with this health record.
              </Text>
            </View>

            <View className="ml-3 rounded-full bg-emerald-50 px-3 py-1.5">
              <Text className="text-xs font-bold text-emerald-800">
                {record.attachments?.length ?? 0} files
              </Text>
            </View>
          </View>

          {attachmentError ? (
            <View
              accessibilityRole="alert"
              className="mt-4 flex-row items-start rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color="#B42318"
              />

              <Text className="ml-2 flex-1 text-sm leading-5 text-red-800">
                {attachmentError}
              </Text>
            </View>
          ) : null}

          {record.attachments && record.attachments.length > 0 ? (
            <View className="mt-4 gap-3">
              {record.attachments.map((attachment) => {
                const isImage = attachment.type === 'image';
                const isOpening =
                  openingAttachmentId === attachment.id;

                if (attachment.type === 'audio') {
                  return (
                    <AudioAttachmentPlayer
                      key={attachment.id}
                      attachment={attachment}
                    />
                  );
                }

                return (
                  <View
                    key={attachment.id}
                    className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white"
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        isImage
                          ? `View image ${attachment.name}`
                          : `Open or share document ${attachment.name}`
                      }
                      accessibilityState={{ disabled: isOpening }}
                      disabled={isOpening}
                      onPress={() => void handleOpenAttachment(attachment)}
                      className="flex-row items-center p-4 active:bg-[#F8FAFC]"
                    >
                      {isImage ? (
                        <Image
                          source={{ uri: attachment.uri }}
                          className="h-16 w-16 rounded-xl bg-[#F2F4F7]"
                          resizeMode="cover"
                          onError={() => {
                            setAttachmentError(
                              `The image "${attachment.name}" could not be displayed. Its saved file may no longer be available.`,
                            );
                          }}
                        />
                      ) : (
                        <View className="h-16 w-16 items-center justify-center rounded-xl bg-emerald-50">
                          <Ionicons
                            name="document-text-outline"
                            size={28}
                            color="#047857"
                          />

                          <Text className="mt-1 text-[9px] font-extrabold text-emerald-800">
                            {getFileExtension(attachment.name)}
                          </Text>
                        </View>
                      )}

                      <View className="ml-4 flex-1">
                        <Text
                          numberOfLines={2}
                          className="text-sm font-bold leading-5 text-[#101828]"
                        >
                          {attachment.name}
                        </Text>

                        <Text className="mt-1 text-xs text-[#667085]">
                          {isImage ? 'Image' : 'Document'}
                          {' · '}
                          {formatFileSize(attachment.size)}
                        </Text>

                        <Text className="mt-2 text-xs font-semibold text-emerald-700">
                          {isOpening
                            ? 'Opening...'
                            : isImage
                              ? 'Tap to preview'
                              : 'Tap to open or share'}
                        </Text>
                      </View>

                      {isOpening ? (
                        <ActivityIndicator
                          size="small"
                          color="#047857"
                        />
                      ) : (
                        <Ionicons
                          name={
                            isImage
                              ? 'expand-outline'
                              : 'share-outline'
                          }
                          size={20}
                          color="#667085"
                        />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="mt-4 items-center rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-5 py-8">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#F2F4F7]">
                <Ionicons
                  name="attach-outline"
                  size={26}
                  color="#667085"
                />
              </View>

              <Text className="mt-4 text-base font-bold text-[#101828]">
                No attachments yet
              </Text>

              <Text className="mt-2 text-center text-sm leading-6 text-[#667085]">
                Images and documents attached to this record will
                appear here.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/records/edit/[id]',
                    params: { id: record.id },
                  })
                }
                className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 active:bg-emerald-800"
              >
                <Text className="text-sm font-bold text-white">
                  Edit record
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Full-screen image preview */}
        <Modal
          visible={selectedImage !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
          statusBarTranslucent
        >
          <View className="flex-1 items-center justify-center bg-black">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close image preview"
              onPress={() => setSelectedImage(null)}
              className="absolute right-5 top-14 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/20"
            >
              <Ionicons name="close" size={27} color="#FFFFFF" />
            </Pressable>

            {selectedImage ? (
              <>
                <Image
                  source={{ uri: selectedImage.uri }}
                  className="h-[75%] w-full"
                  resizeMode="contain"
                />

                <Text
                  numberOfLines={2}
                  className="mx-6 mt-4 text-center text-sm font-semibold text-white"
                >
                  {selectedImage.name}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (selectedImage) {
                      void handleShareAttachment(selectedImage);
                    }
                  }}
                  className="mt-5 flex-row items-center rounded-xl bg-white px-5 py-3"
                >
                  <Ionicons
                    name="share-outline"
                    size={19}
                    color="#047857"
                  />

                  <Text className="ml-2 text-sm font-bold text-emerald-800">
                    Share image
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </Modal>

        {/* Information notice */}
        <View className="mt-5 flex-row items-start rounded-2xl border border-[#E4E7EC] bg-[#F2F4F7] p-4">
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#475467"
            style={{ marginTop: 1 }}
          />

          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-[#344054]">
              About this record
            </Text>

            <Text className="mt-2 text-xs leading-5 text-[#667085]">
              This screen displays information saved in MediVault. The app
              does not independently verify medical information or provide
              clinical interpretation or treatment recommendations.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
