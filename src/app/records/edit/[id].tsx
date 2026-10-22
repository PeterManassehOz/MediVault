import { useState, type ComponentProps } from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  Directory,
  File,
  Paths,
} from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  recordCategories,
  type HealthRecordAttachment,
  type HealthRecordCategory,
} from '@/constants/healthRecords';
import {
  useHealthRecords,
  type NewAttachment,
} from '@/context/HealthRecordsContext';


type IoniconName = ComponentProps<typeof Ionicons>['name'];

const categoryOptions: {
  value: HealthRecordCategory;
  icon: IoniconName;
  color: string;
}[] = [
  {
    value: 'Lab Results',
    icon: 'flask-outline',
    color: '#047857',
  },
  {
    value: 'Prescriptions',
    icon: 'medkit-outline',
    color: '#6D28D9',
  },
  {
    value: 'Reports',
    icon: 'document-text-outline',
    color: '#1D4ED8',
  },
  {
    value: 'Imaging',
    icon: 'scan-outline',
    color: '#B45309',
  },
];

function formatDateForDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;

  return `${day} ${new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
  ).toLocaleString('en-GB', {
    month: 'short',
  })} ${year}`;
}

function formatDateForInput(value: string): string {
  const match = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, day, month, year] = match;

  const monthIndex = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ].indexOf(
    month.charAt(0).toUpperCase() +
      month.slice(1).toLowerCase(),
  );

  if (monthIndex === -1) {
    return value;
  }

  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatFileSize(size: number | null): string {
  if (size === null || !Number.isFinite(size) || size < 0) {
    return 'Size unavailable';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeTypeFromImageName(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

function getDocumentMimeType(
  mimeType: string | null | undefined,
): string {
  return mimeType || 'application/octet-stream';
}

export default function EditRecordScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id: string | string[];
  }>();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const {
    getRecordById,
    updateRecord,
    addAttachment,
    removeAttachment,
    isLoading,
    error,
    refreshRecords,
  } = useHealthRecords();

  const record = id ? getRecordById(id) : undefined;

  const [title, setTitle] = useState(record?.title ?? '');
  const [subtitle, setSubtitle] = useState(
    record?.subtitle ?? '',
  );
  const [category, setCategory] =
    useState<HealthRecordCategory>(
      record?.category ?? 'Lab Results',
    );
  const [date, setDate] = useState(
    record ? formatDateForInput(record.date) : '',
  );
  const [description, setDescription] = useState(
    record?.description ?? '',
  );

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isManagingAttachments, setIsManagingAttachments] =
    useState(false);

  const attachments = record?.attachments ?? [];

  const images = attachments.filter(
    (attachment) => attachment.type === 'image',
  );

  const documents = attachments.filter(
    (attachment) => attachment.type === 'document',
  );

  const audioAttachments = attachments.filter(
    (attachment) => attachment.type === 'audio',
  );

  const attachmentActionsDisabled =
    isSaving || isManagingAttachments;

  /**
   * Copies a selected file into MediVault and persists its metadata.
   *
   * addAttachment already handles copying, storage and rollback
   * if saving the attachment metadata fails.
   */
  const saveSelectedAttachment = async (
    attachment: NewAttachment,
  ) => {
    if (!record) {
      throw new Error('The health record could not be found.');
    }

    await addAttachment(record.id, attachment);
  };

  const handleAddImages = async () => {
    if (!record || attachmentActionsDisabled) {
      return;
    }

    setFormError('');
    setIsManagingAttachments(true);

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          quality: 1,
        });

      if (result.canceled) {
        return;
      }

      for (const asset of result.assets) {
        const name =
          asset.fileName ||
          `image-${Date.now()}.${asset.mimeType?.split('/')[1] || 'jpg'}`;

        const attachment: NewAttachment = {
          name,
          uri: asset.uri,
          mimeType:
            asset.mimeType || getMimeTypeFromImageName(name),
          size: asset.fileSize ?? null,
          type: 'image',
          source: 'gallery',
        };

        await saveSelectedAttachment(attachment);
      }

      Alert.alert(
        'Images added',
        `${result.assets.length} image(s) added to this health record.`,
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to add the selected images.',
      );
    } finally {
      setIsManagingAttachments(false);
    }
  };

  
  const handleAddDocuments = async () => {
    if (!record || attachmentActionsDisabled) {
      return;
    }

    setFormError('');
    setIsManagingAttachments(true);

    try {
      const result = await File.pickFileAsync({
        multipleFiles: true,
        mimeTypes: ['*/*'],
      });

      // Match the picker-result structure used in add.tsx.
      if (result.canceled || !result.result?.length) {
        return;
      }

      const selectedFiles = result.result;

      if (selectedFiles.length === 0) {
        return;
      }
      
      let addedCount = 0;
      const failedFiles: string[] = [];

      for (const selectedFile of selectedFiles) {
        const attachment: NewAttachment = {
          name: selectedFile.name || 'Untitled document',
          uri: selectedFile.uri,
          mimeType:
            selectedFile.type || 'application/octet-stream',
          size: selectedFile.size ?? null,
          type: 'document',
          source: 'file-picker',
        };

        try {
          await saveSelectedAttachment(attachment);
          addedCount += 1;
        } catch (err) {
          const reason =
            err instanceof Error ? err.message : String(err);

          failedFiles.push(`${attachment.name}: ${reason}`);
        }
      }

      if (failedFiles.length > 0) {
        Alert.alert(
          addedCount > 0
            ? 'Documents added with errors'
            : 'Unable to add documents',
          [
            addedCount > 0
              ? `${addedCount} document(s) added successfully.`
              : 'No documents could be added.',
            '',
            ...failedFiles,
          ].join('\n'),
        );

        return;
      }

      if (addedCount > 0) {
        Alert.alert(
          'Documents added',
          `${addedCount} document(s) added to this health record.`,
        );
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? `Could not add documents: ${err.message}`
          : 'Unable to add the selected documents.',
      );
    } finally {
      setIsManagingAttachments(false);
    }
  };


  /**
   * Replacement is deliberately add-first, remove-second.
   * This avoids deleting the existing attachment if the
   * replacement cannot be copied or persisted.
   */
  const handleReplaceAttachment = async (
  existing: HealthRecordAttachment,
) => {
  if (existing.type === 'audio') {
    Alert.alert(
      'Audio replacement not available',
      'Remove this voice note and record a new one instead.',
    );
    return;
  }

  if (!record || attachmentActionsDisabled) {
    return;
  }

  setFormError('');
  setIsManagingAttachments(true);

  let newAttachmentSaved = false;

  try {
    let replacement: NewAttachment | null = null;

    if (existing.type === 'image') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];

      const name =
        asset.fileName || `replacement-image-${Date.now()}.jpg`;

      replacement = {
        name,
        uri: asset.uri,
        mimeType:
          asset.mimeType || getMimeTypeFromImageName(name),
        size: asset.fileSize ?? null,
        type: 'image',
        source: 'gallery',
      };
    } else {
      const pickerResult = await File.pickFileAsync({
        multipleFiles: false,
        mimeTypes: ['*/*'],
      });

      // A canceled picker has result: null.
      if (pickerResult.canceled) {
        return;
      }

      // After checking canceled, TypeScript narrows result to File.
      const selectedFile = pickerResult.result;

      replacement = {
        name: selectedFile.name || 'medical-document',
        uri: selectedFile.uri,
        mimeType: getDocumentMimeType(selectedFile.type),
        size: selectedFile.size ?? null,
        type: 'document',
        source: 'file-picker',
      };
    }

    if (!replacement) {
      throw new Error('No replacement file was selected.');
    }

    console.log('[Replace attachment] Selected:', replacement);

    // Stage 1: save the new attachment.
    await saveSelectedAttachment(replacement);
    newAttachmentSaved = true;

    console.log('[Replace attachment] New attachment saved.');

    // Stage 2: remove the old attachment.
    await removeAttachment(record.id, existing.id);

    console.log('[Replace attachment] Old attachment removed.');

    Alert.alert(
      'Attachment replaced',
      'The old attachment has been replaced successfully.',
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : String(err);

    console.error('[Replace attachment] Failed:', err);

    setFormError(
      newAttachmentSaved
        ? `The new file was saved, but the old attachment could not be removed. ${message}`
        : `The replacement file could not be saved. ${message}`,
    );

    Alert.alert(
      'Replacement failed',
      newAttachmentSaved
        ? `The new file was saved, but removing the old one failed.\n\n${message}`
        : `The new file could not be saved.\n\n${message}`,
    );
  } finally {
    setIsManagingAttachments(false);
  }
};


  const handleRescanAttachment = (
  attachment: HealthRecordAttachment,
) => {
  // The record may be undefined while loading or if its ID is invalid.
  if (!record) {
    setFormError('The health record could not be found.');
    return;
  }

  if (
    attachment.type !== 'image' ||
    attachment.source !== 'camera-scan' ||
    attachmentActionsDisabled
  ) {
    return;
  }

  router.push({
    pathname: '/scan',
    params: {
      replaceRecordId: record.id,
      replaceAttachmentId: attachment.id,
    },
  });
};

  const handleRemoveAttachment = (
    attachment: HealthRecordAttachment,
  ) => {
    if (!record || attachmentActionsDisabled) {
      return;
    }

    Alert.alert(
      'Remove attachment',
      `Are you sure you want to remove "${attachment.name}" from this health record?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setFormError('');
            setIsManagingAttachments(true);

            void removeAttachment(
              record.id,
              attachment.id,
            )
              .catch((err: unknown) => {
                setFormError(
                  err instanceof Error
                    ? err.message
                    : 'Unable to remove the attachment.',
                );
              })
              .finally(() => {
                setIsManagingAttachments(false);
              });
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    setFormError('');

    const trimmedTitle = title.trim();
    const trimmedSubtitle = subtitle.trim();
    const trimmedDescription = description.trim();
    const trimmedDate = date.trim();

    if (!trimmedTitle) {
      setFormError(
        'Enter a title for this health record.',
      );
      return;
    }

    if (!trimmedDate || !isValidDate(trimmedDate)) {
      setFormError(
        'Enter a valid date in YYYY-MM-DD format.',
      );
      return;
    }

    setIsSaving(true);

    try {
      await updateRecord(record!.id, {
        title: trimmedTitle,
        subtitle:
          trimmedSubtitle || 'Personal health record',
        category,
        date: formatDateForDisplay(trimmedDate),
        description:
          trimmedDescription ||
          'No additional details provided.',
      });

      router.replace({
        pathname: '/records/[id]',
        params: {
          id: record!.id,
        },
      });
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to save changes. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <ActivityIndicator
          size="large"
          color="#047857"
        />
        <Text className="mt-4 text-base font-semibold text-[#344054]">
          Loading record
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <Ionicons
          name="alert-circle-outline"
          size={36}
          color="#B42318"
        />

        <Text className="mt-4 text-center text-xl font-bold text-[#101828]">
          Unable to load record
        </Text>

        <Text className="mt-2 text-center text-sm leading-6 text-[#667085]">
          {error}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => void refreshRecords()}
          className="mt-5 rounded-xl bg-emerald-700 px-5 py-3"
        >
          <Text className="font-bold text-white">
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!record) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <Ionicons
          name="document-text-outline"
          size={36}
          color="#667085"
        />

        <Text className="mt-4 text-center text-xl font-bold text-[#101828]">
          Record not found
        </Text>

        <Text className="mt-2 text-center text-sm leading-6 text-[#667085]">
          This record may have been removed or its identifier is invalid.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(tabs)/records')}
          className="mt-5 rounded-xl bg-emerald-700 px-5 py-3"
        >
          <Text className="font-bold text-white">
            Return to records
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8FAFC]"
      behavior={
        Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-12 pt-5"
      >
        <View className="mb-6">
          <Text className="text-2xl font-extrabold tracking-tight text-[#101828]">
            Edit health record
          </Text>

          <Text className="mt-2 text-sm leading-6 text-[#667085]">
            Update the record information and manage its
            attached medical images and documents.
          </Text>
        </View>

        {formError ? (
          <View
            accessibilityRole="alert"
            className="mb-5 flex-row items-start rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#B42318"
            />

            <Text className="ml-2 flex-1 text-sm leading-5 text-red-800">
              {formError}
            </Text>
          </View>
        ) : null}

        {/* Record information */}

        <View className="gap-5 rounded-2xl border border-[#E4E7EC] bg-white p-5">
          <View>
            <Text className="mb-2 text-sm font-bold text-[#344054]">
              Record title *
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Complete Blood Count"
              placeholderTextColor="#98A2B3"
              maxLength={120}
              accessibilityLabel="Record title"
              className="rounded-xl border border-[#D0D5DD] bg-white px-4 py-3.5 text-[15px] text-[#101828]"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-bold text-[#344054]">
              Provider or source
            </Text>

            <TextInput
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="e.g. City Medical Laboratory"
              placeholderTextColor="#98A2B3"
              maxLength={120}
              accessibilityLabel="Provider or source"
              className="rounded-xl border border-[#D0D5DD] bg-white px-4 py-3.5 text-[15px] text-[#101828]"
            />
          </View>

          <View>
            <Text className="mb-3 text-sm font-bold text-[#344054]">
              Record category *
            </Text>

            <View className="gap-2">
              {recordCategories
                .filter(
                  (
                    item,
                  ): item is HealthRecordCategory =>
                    item !== 'All',
                )
                .map((item) => {
                  const option =
                    categoryOptions.find(
                      (candidate) =>
                        candidate.value === item,
                    )!;

                  const selected = category === item;

                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: selected,
                      }}
                      onPress={() => setCategory(item)}
                      className={`flex-row items-center rounded-xl border px-4 py-3.5 ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-[#E4E7EC] bg-white'
                      }`}
                    >
                      <Ionicons
                        name={option.icon}
                        size={21}
                        color={option.color}
                      />

                      <Text
                        className={`ml-3 flex-1 text-sm font-semibold ${
                          selected
                            ? 'text-[#047857]'
                            : 'text-[#344054]'
                        }`}
                      >
                        {item}
                      </Text>

                      <Ionicons
                        name={
                          selected
                            ? 'radio-button-on'
                            : 'radio-button-off'
                        }
                        size={21}
                        color={
                          selected
                            ? '#047857'
                            : '#98A2B3'
                        }
                      />
                    </Pressable>
                  );
                })}
            </View>
          </View>

          <View>
            <Text className="mb-2 text-sm font-bold text-[#344054]">
              Record date *
            </Text>

            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#98A2B3"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              accessibilityLabel="Record date in year month day format"
              className="rounded-xl border border-[#D0D5DD] bg-white px-4 py-3.5 text-[15px] text-[#101828]"
            />

            <Text className="mt-2 text-xs leading-5 text-[#667085]">
              Use the year-month-day format, for example
              2026-09-12.
            </Text>
          </View>

          <View>
            <Text className="mb-2 text-sm font-bold text-[#344054]">
              Description
            </Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add relevant details about this record"
              placeholderTextColor="#98A2B3"
              multiline
              textAlignVertical="top"
              maxLength={3000}
              accessibilityLabel="Record description"
              className="min-h-[130px] rounded-xl border border-[#D0D5DD] bg-white px-4 py-3.5 text-[15px] leading-6 text-[#101828]"
            />
          </View>
        </View>

        {/* Attachment management */}

        <View className="mt-6">
          <View className="mb-3">
            <Text className="text-lg font-extrabold text-[#101828]">
              Medical attachments
            </Text>

            <Text className="mt-1 text-sm leading-5 text-[#667085]">
              Add new files, replace existing ones, or remove
              attachments from this record.
            </Text>
          </View>

          <View className="mb-4 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              disabled={attachmentActionsDisabled}
              onPress={() => void handleAddImages()}
              className={`flex-1 flex-row items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3.5 ${
                attachmentActionsDisabled
                  ? 'opacity-50'
                  : ''
              }`}
            >
              <Ionicons
                name="images-outline"
                size={20}
                color="#047857"
              />

              <Text className="ml-2 text-sm font-bold text-emerald-800">
                Add images
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={attachmentActionsDisabled}
              onPress={() => void handleAddDocuments()}
              className={`flex-1 flex-row items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-3.5 ${
                attachmentActionsDisabled
                  ? 'opacity-50'
                  : ''
              }`}
            >
              <Ionicons
                name="document-attach-outline"
                size={20}
                color="#1D4ED8"
              />

              <Text className="ml-2 text-sm font-bold text-blue-800">
                Add documents
              </Text>
            </Pressable>
          </View>


          {isManagingAttachments ? (
            <View className="mb-4 flex-row items-center rounded-xl border border-[#E4E7EC] bg-white p-3">
              <ActivityIndicator
                size="small"
                color="#047857"
              />

              <Text className="ml-3 text-sm text-[#475467]">
                Updating attachments...
              </Text>
            </View>
          ) : null}

          {/* Existing images */}

          <View className="mb-4 rounded-2xl border border-[#E4E7EC] bg-white p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons
                  name="image-outline"
                  size={19}
                  color="#047857"
                />

                <Text className="ml-2 text-sm font-bold text-[#344054]">
                  Images
                </Text>
              </View>

              <Text className="text-xs font-medium text-[#667085]">
                {images.length} attached
              </Text>
            </View>

            {images.length === 0 ? (
              <Text className="py-3 text-sm text-[#98A2B3]">
                No images attached.
              </Text>
            ) : (
              <View className="gap-3">
                {images.map((attachment) => (
                  <View
                    key={attachment.id}
                    className="overflow-hidden rounded-xl border border-[#E4E7EC]"
                  >
                    <Image
                      source={{
                        uri: attachment.uri,
                      }}
                      resizeMode="cover"
                      className="h-40 w-full bg-[#F2F4F7]"
                    />

                    <View className="p-3">
                      <Text
                        numberOfLines={2}
                        className="text-sm font-semibold text-[#344054]"
                      >
                        {attachment.name}
                      </Text>

                      <Text className="mt-1 text-xs text-[#667085]">
                        {formatFileSize(attachment.size)}
                      </Text>

                      <View className="mt-3 flex-row gap-2">
                        <Pressable
                          accessibilityRole="button"
                          disabled={attachmentActionsDisabled}
                          onPress={() =>
                            void handleReplaceAttachment(
                              attachment,
                            )
                          }
                          className="flex-1 flex-row items-center justify-center rounded-lg bg-emerald-50 px-3 py-2.5"
                        >
                          <Ionicons
                            name="swap-horizontal-outline"
                            size={17}
                            color="#047857"
                          />

                          <Text className="ml-1.5 text-xs font-bold text-emerald-800">
                            Replace
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          disabled={attachmentActionsDisabled}
                          onPress={() =>
                            handleRemoveAttachment(
                              attachment,
                            )
                          }
                          className="flex-1 flex-row items-center justify-center rounded-lg bg-red-50 px-3 py-2.5"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#B42318"
                          />

                          <Text className="ml-1.5 text-xs font-bold text-red-800">
                            Remove
                          </Text>
                        </Pressable>
                      </View>

                      {attachment.source === 'camera-scan' && (
                        <Pressable
                          accessibilityRole="button"
                          disabled={attachmentActionsDisabled}
                          onPress={() => handleRescanAttachment(attachment)}
                          className="mt-2 flex-row items-center justify-center rounded-lg bg-blue-50 px-3 py-2.5"
                        >
                          <Ionicons
                            name="scan-outline"
                            size={17}
                            color="#1D4ED8"
                          />

                          <Text className="ml-1.5 text-xs font-bold text-blue-800">
                            Rescan
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Existing documents */}

          <View className="mb-4 rounded-2xl border border-[#E4E7EC] bg-white p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons
                  name="document-text-outline"
                  size={19}
                  color="#1D4ED8"
                />

                <Text className="ml-2 text-sm font-bold text-[#344054]">
                  Documents
                </Text>
              </View>

              <Text className="text-xs font-medium text-[#667085]">
                {documents.length} attached
              </Text>
            </View>

            {documents.length === 0 ? (
              <Text className="py-3 text-sm text-[#98A2B3]">
                No documents attached.
              </Text>
            ) : (
              <View className="gap-3">
                {documents.map((attachment) => (
                  <View
                    key={attachment.id}
                    className="flex-row items-start rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-3"
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
                      <Ionicons
                        name="document-outline"
                        size={23}
                        color="#1D4ED8"
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text
                        numberOfLines={2}
                        className="text-sm font-semibold leading-5 text-[#344054]"
                      >
                        {attachment.name}
                      </Text>

                      <Text className="mt-1 text-xs text-[#667085]">
                        {formatFileSize(attachment.size)}
                      </Text>

                      <View className="mt-3 flex-row gap-2">
                        <Pressable
                          accessibilityRole="button"
                          disabled={attachmentActionsDisabled}
                          onPress={() =>
                            void handleReplaceAttachment(
                              attachment,
                            )
                          }
                          className="flex-row items-center rounded-lg bg-emerald-50 px-3 py-2"
                        >
                          <Ionicons
                            name="swap-horizontal-outline"
                            size={16}
                            color="#047857"
                          />

                          <Text className="ml-1 text-xs font-bold text-emerald-800">
                            Replace
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          disabled={attachmentActionsDisabled}
                          onPress={() =>
                            handleRemoveAttachment(
                              attachment,
                            )
                          }
                          className="flex-row items-center rounded-lg bg-red-50 px-3 py-2"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color="#B42318"
                          />

                          <Text className="ml-1 text-xs font-bold text-red-800">
                            Remove
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

    
          {/* Existing audio notes */}
          <View className="mb-4 rounded-2xl border border-[#E4E7EC] bg-white p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons
                  name="musical-notes-outline"
                  size={19}
                  color="#047857"
                />

                <Text className="ml-2 text-sm font-bold text-[#344054]">
                  Audio notes
                </Text>
              </View>

              <Text className="text-xs font-medium text-[#667085]">
                {audioAttachments.length} attached
              </Text>
            </View>

            {audioAttachments.length === 0 ? (
              <Text className="py-3 text-sm text-[#98A2B3]">
                No audio notes attached.
              </Text>
            ) : (
              <View className="gap-3">
                {audioAttachments.map((attachment) => (
                  <View
                    key={attachment.id}
                    className="flex-row items-center rounded-xl border border-[#E4E7EC] p-3"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                      <Ionicons
                        name="musical-notes-outline"
                        size={20}
                        color="#047857"
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text
                        numberOfLines={2}
                        className="text-sm font-semibold text-[#344054]"
                      >
                        {attachment.name}
                      </Text>

                      <Text className="mt-1 text-xs text-[#667085]">
                        Voice note
                        {attachment.durationMs !== undefined
                          ? ` · ${Math.floor(attachment.durationMs / 60000)}:${String(
                              Math.floor(
                                (attachment.durationMs % 60000) / 1000,
                              ),
                            ).padStart(2, '0')}`
                          : ''}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${attachment.name}`}
                      disabled={attachmentActionsDisabled}
                      onPress={() => handleRemoveAttachment(attachment)}
                      className="ml-2 h-10 w-10 items-center justify-center rounded-lg bg-red-50"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color="#B42318"
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="mt-4 flex-row items-start rounded-xl border border-[#E4E7EC] bg-[#F2F4F7] p-4">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#475467"
            />

            <Text className="ml-3 flex-1 text-xs leading-5 text-[#667085]">
              Attachment changes are saved to this device
              immediately. Replacing a file adds the new
              attachment before removing the old one.
            </Text>
          </View>
        </View>

        {/* Save record details */}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: isSaving,
          }}
          disabled={isSaving}
          onPress={() => void handleSave()}
          className={`mt-6 flex-row items-center justify-center rounded-xl px-5 py-4 ${
            isSaving
              ? 'bg-emerald-400'
              : 'bg-emerald-700 active:bg-emerald-800'
          }`}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons
              name="save-outline"
              size={20}
              color="#FFFFFF"
            />
          )}

          <Text className="ml-2 text-[15px] font-bold text-white">
            {isSaving
              ? 'Saving changes...'
              : 'Save changes'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={isSaving || isManagingAttachments}
          onPress={() => router.back()}
          className="mt-3 items-center rounded-xl border border-[#D0D5DD] bg-white px-5 py-4"
        >
          <Text className="text-[15px] font-bold text-[#344054]">
            Cancel
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
