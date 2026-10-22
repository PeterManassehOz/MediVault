import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { HealthRecordCategory } from '@/constants/healthRecords';
import { useHealthRecords } from '@/context/HealthRecordsContext';

type PendingAttachment = {
  name: string;
  uri: string;
  mimeType: string;
  size: number | null;
  type: 'document' | 'image';
};

const categories: {
  label: HealthRecordCategory;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  background: string;
}[] = [
  {
    label: 'Lab Results',
    icon: 'flask-outline',
    color: '#047857',
    background: '#ECFDF3',
  },
  {
    label: 'Prescriptions',
    icon: 'medkit-outline',
    color: '#6D28D9',
    background: '#F5F3FF',
  },
  {
    label: 'Reports',
    icon: 'document-text-outline',
    color: '#1D4ED8',
    background: '#EFF6FF',
  },
  {
    label: 'Imaging',
    icon: 'scan-outline',
    color: '#B45309',
    background: '#FFFAEB',
  },
];

function isValidDate(value: string): boolean {
  const parsed = new Date(value);

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function formatRecordDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number | null): string {
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
}

export default function AddRecordScreen() {
  const router = useRouter();

  const {
    addRecord,
    addAttachment,
    isLoading,
    error: recordsError,
  } = useHealthRecords();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] =
    useState<HealthRecordCategory>('Lab Results');

  const [date, setDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  });

  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isPickingFiles, setIsPickingFiles] = useState(false);

  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedCategory = categories.find(
    (item) => item.label === category,
  )!;

  const isBusy = isSaving || isLoading || isPickingFiles;

  function addPendingAttachments(incoming: PendingAttachment[]) {
    setAttachments((current) => {
      const existingUris = new Set(current.map((item) => item.uri));
      const uniqueIncoming = incoming.filter((item) => {
        if (existingUris.has(item.uri)) {
          return false;
        }

        existingUris.add(item.uri);
        return true;
      });

      return [...current, ...uniqueIncoming];
    });

    setFormError('');
  }

  
async function handlePickDocuments() {
  if (isBusy) return;

  setIsPickingFiles(true);
  setFormError('');

  try {
    const result = await File.pickFileAsync({
      multipleFiles: true,
      mimeTypes: ['*/*'],
    });

    if (result.canceled || !result.result) {
      return;
    }

    const picked: PendingAttachment[] = result.result.map((file) => ({
      name: file.name || 'Untitled document',
      uri: file.uri,
      mimeType: file.type || 'application/octet-stream',
      size: file.size ?? null,
      type: 'document',
    }));

    console.log(
      '[MediVault] Native file picker results:',
      JSON.stringify(
        picked.map(({ name, uri, mimeType, size }) => ({
          name,
          uri,
          mimeType,
          size,
        })),
        null,
        2,
      ),
    );

    addPendingAttachments(picked);
  } catch (error) {
    console.error('[MediVault] Document selection failed:', error);

    setFormError(
      error instanceof Error
        ? `Could not select documents: ${error.message}`
        : 'Could not select documents. Please try again.',
    );
  } finally {
    setIsPickingFiles(false);
  }
}


  async function handlePickImages() {
    if (isBusy) return;

    setIsPickingFiles(true);
    setFormError('');

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setFormError(
          'Photo-library permission is needed to attach images. Enable it in your device settings and try again.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled) return;

      const picked: PendingAttachment[] = result.assets.map(
        (asset, index) => ({
          name:
            asset.fileName ||
            `Health image ${index + 1}.${asset.mimeType?.split('/')[1] || 'jpg'}`,
          uri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize ?? null,
          type: 'image',
        }),
      );

      addPendingAttachments(picked);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? `Could not select images: ${error.message}`
          : 'Could not select images. Please try again.',
      );
    } finally {
      setIsPickingFiles(false);
    }
  }

  function removePendingAttachment(uri: string) {
    setAttachments((current) =>
      current.filter((attachment) => attachment.uri !== uri),
    );
  }

  async function handleSave() {
    Keyboard.dismiss();

    const trimmedTitle = title.trim();
    const trimmedSubtitle = subtitle.trim();
    const trimmedDescription = description.trim();

    let hasValidationError = false;

    setTitleError('');
    setDateError('');
    setFormError('');

    if (!trimmedTitle) {
      setTitleError('Enter a title for this record.');
      hasValidationError = true;
    }

    if (!isValidDate(date.trim())) {
      setDateError('Enter a valid date in YYYY-MM-DD format.');
      hasValidationError = true;
    }

    if (hasValidationError) return;

    if (isLoading) {
      setFormError(
        'Your records are still loading. Please try again shortly.',
      );
      return;
    }

    if (recordsError) {
      setFormError(
        'Your existing records could not be loaded. Please resolve that issue before saving.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const savedRecord = await addRecord({
        title: trimmedTitle,
        subtitle: trimmedSubtitle || 'Personal health record',
        category,
        date: formatRecordDate(date.trim()),
        description:
          trimmedDescription ||
          'No additional notes were provided for this record.',
      });

      const failedAttachments: string[] = [];

      for (const attachment of attachments) {
        try {
          await addAttachment(savedRecord.id, attachment);
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : String(error);

          console.error(
            `[MediVault] Failed to attach "${attachment.name}":`,
            error,
          );

          failedAttachments.push(`${attachment.name}: ${reason}`);
        }
      }

      if (failedAttachments.length > 0) {
        Alert.alert(
          'Record saved with attachment issues',
          `Your health record was saved, but these files could not be attached:\n\n${failedAttachments.join('\n\n')}`,
          [
            {
              text: 'View record',
              onPress: () =>
                router.replace({
                  pathname: '/records/[id]',
                  params: { id: savedRecord.id },
                }),
            },
          ],
        );

        return;
      }

      router.replace({
        pathname: '/records/[id]',
        params: { id: savedRecord.id },
      });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'The record could not be saved. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12 pt-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View className="mb-6">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <Ionicons
              name="document-attach-outline"
              size={27}
              color="#047857"
            />
          </View>

          <Text className="text-xs font-bold uppercase tracking-[2px] text-emerald-700">
            HEALTH LIBRARY
          </Text>

          <Text className="mt-2 text-[28px] font-bold tracking-tight text-[#101828]">
            Add a health record
          </Text>

          <Text className="mt-2 text-sm leading-6 text-[#667085]">
            Create an entry for a medical document, laboratory result,
            prescription, or other health information.
          </Text>
        </View>

        {/* Record details */}
        <View className="rounded-2xl border border-[#E4E7EC] bg-white p-5">
          <View className="mb-5">
            <Text className="text-base font-bold text-[#101828]">
              Record details
            </Text>

            <Text className="mt-1 text-xs leading-5 text-[#667085]">
              Fields marked with an asterisk (*) are required.
            </Text>
          </View>

          {/* Title */}
          <View className="mb-5">
            <Text className="mb-2 text-sm font-semibold text-[#344054]">
              Record title *
            </Text>

            <TextInput
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (value.trim()) setTitleError('');
              }}
              placeholder="e.g. Complete Blood Count"
              placeholderTextColor="#98A2B3"
              accessibilityLabel="Record title, required"
              returnKeyType="next"
              maxLength={120}
              className={`min-h-12 rounded-xl border bg-white px-4 py-3 text-[15px] text-[#101828] ${
                titleError ? 'border-red-400' : 'border-[#D0D5DD]'
              }`}
            />

            {titleError ? (
              <Text className="mt-2 text-xs text-red-600">
                {titleError}
              </Text>
            ) : null}
          </View>

          {/* Provider */}
          <View className="mb-5">
            <Text className="mb-2 text-sm font-semibold text-[#344054]">
              Source or provider
            </Text>

            <TextInput
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="e.g. City Medical Laboratory"
              placeholderTextColor="#98A2B3"
              accessibilityLabel="Source or healthcare provider"
              returnKeyType="next"
              maxLength={120}
              className="min-h-12 rounded-xl border border-[#D0D5DD] bg-white px-4 py-3 text-[15px] text-[#101828]"
            />

            <Text className="mt-2 text-xs leading-5 text-[#98A2B3]">
              Optional. Enter the hospital, clinic, laboratory, or other source.
            </Text>
          </View>

          {/* Category */}
          <View className="mb-5">
            <Text className="mb-3 text-sm font-semibold text-[#344054]">
              Record category *
            </Text>

            <View className="gap-2">
              {categories.map((item) => {
                const active = category === item.label;

                return (
                  <Pressable
                    key={item.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setCategory(item.label)}
                    className={`flex-row items-center rounded-xl border p-3 ${
                      active
                        ? 'border-emerald-700 bg-emerald-50'
                        : 'border-[#E4E7EC] bg-white'
                    }`}
                  >
                    <View
                      className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: item.background }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={21}
                        color={item.color}
                      />
                    </View>

                    <Text className="flex-1 text-sm font-semibold text-[#344054]">
                      {item.label}
                    </Text>

                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={21}
                      color={active ? '#047857' : '#D0D5DD'}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Date */}
          <View className="mb-5">
            <Text className="mb-2 text-sm font-semibold text-[#344054]">
              Record date *
            </Text>

            <View
              className={`flex-row items-center rounded-xl border bg-white px-3 ${
                dateError ? 'border-red-400' : 'border-[#D0D5DD]'
              }`}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#667085"
              />

              <TextInput
                value={date}
                onChangeText={(value) => {
                  setDate(value);
                  if (isValidDate(value.trim())) setDateError('');
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#98A2B3"
                accessibilityLabel="Record date in year-month-day format"
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                maxLength={10}
                className="min-h-12 flex-1 px-3 py-3 text-[15px] text-[#101828]"
              />
            </View>

            {dateError ? (
              <Text className="mt-2 text-xs text-red-600">
                {dateError}
              </Text>
            ) : (
              <Text className="mt-2 text-xs leading-5 text-[#98A2B3]">
                Use YYYY-MM-DD, for example 2026-10-14.
              </Text>
            )}
          </View>

          {/* Description */}
          <View>
            <Text className="mb-2 text-sm font-semibold text-[#344054]">
              Description and notes
            </Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add relevant details about this record..."
              placeholderTextColor="#98A2B3"
              accessibilityLabel="Record description and notes"
              multiline
              textAlignVertical="top"
              maxLength={2000}
              className="min-h-32 rounded-xl border border-[#D0D5DD] bg-white px-4 py-3 text-[15px] leading-6 text-[#101828]"
            />

            <Text className="mt-2 text-right text-xs text-[#98A2B3]">
              {description.length}/2000
            </Text>
          </View>
        </View>

        {/* Attachments */}
        <View className="mt-5 rounded-2xl border border-[#E4E7EC] bg-white p-5">
          <View className="mb-4 flex-row items-start">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Ionicons
                name="attach-outline"
                size={22}
                color="#047857"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-[#101828]">
                Attach documents and images
              </Text>
              <Text className="mt-1 text-xs leading-5 text-[#667085]">
                Add laboratory PDFs, prescriptions, scanned reports, or
                photos of medical documents.
              </Text>
            </View>
          </View>

          <View className="gap-3">
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void handlePickDocuments()}
              className="min-h-12 flex-row items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4"
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#047857"
              />
              <Text className="ml-2 text-sm font-bold text-emerald-800">
                Choose documents
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void handlePickImages()}
              className="min-h-12 flex-row items-center justify-center rounded-xl border border-[#D0D5DD] bg-white px-4"
            >
              <Ionicons
                name="images-outline"
                size={20}
                color="#344054"
              />
              <Text className="ml-2 text-sm font-bold text-[#344054]">
                Choose images
              </Text>
            </Pressable>
          </View>

          {isPickingFiles ? (
            <View className="mt-4 flex-row items-center">
              <ActivityIndicator size="small" color="#047857" />
              <Text className="ml-2 text-xs text-[#667085]">
                Opening file picker...
              </Text>
            </View>
          ) : null}

          <View className="mt-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-bold text-[#344054]">
                Selected files
              </Text>
              <Text className="text-xs text-[#667085]">
                {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
              </Text>
            </View>

            {attachments.length === 0 ? (
              <View className="items-center rounded-xl border border-dashed border-[#D0D5DD] px-4 py-6">
                <Ionicons
                  name="cloud-upload-outline"
                  size={28}
                  color="#98A2B3"
                />
                <Text className="mt-2 text-sm font-medium text-[#667085]">
                  No files selected
                </Text>
                <Text className="mt-1 text-center text-xs leading-5 text-[#98A2B3]">
                  Selected files will appear here before you save.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {attachments.map((attachment, index) => (
                  <View
                    key={`${attachment.uri}-${index}`}
                    className="flex-row items-center rounded-xl border border-[#E4E7EC] bg-[#FCFCFD] p-3"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                      <Ionicons
                        name={
                          attachment.type === 'image'
                            ? 'image-outline'
                            : 'document-outline'
                        }
                        size={21}
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
                      <Text className="mt-1 text-xs text-[#98A2B3]">
                        {formatFileSize(attachment.size)}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${attachment.name}`}
                      onPress={() =>
                        removePendingAttachment(attachment.uri)
                      }
                      disabled={isSaving}
                      hitSlop={8}
                      className="ml-2 h-9 w-9 items-center justify-center rounded-full"
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={22}
                        color="#B42318"
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Category summary */}
        <View className="mt-5 flex-row items-start rounded-xl border border-[#E4E7EC] bg-white p-4">
          <View
            className="h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: selectedCategory.background }}
          >
            <Ionicons
              name={selectedCategory.icon}
              size={21}
              color={selectedCategory.color}
            />
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-sm font-bold text-[#344054]">
              {category}
            </Text>
            <Text className="mt-1 text-xs leading-5 text-[#667085]">
              Your record will be saved under this category.
            </Text>
          </View>
        </View>

        {/* Storage disclosure */}
        <View className="mt-5 flex-row items-start rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#B45309"
            style={{ marginTop: 1 }}
          />

          <View className="ml-3 flex-1">
            <Text className="text-sm font-bold text-amber-900">
              Development storage
            </Text>
            <Text className="mt-1 text-xs leading-5 text-amber-800">
              Records and attachments are stored locally on this device.
              This prototype does not yet provide encrypted health-data
              storage, account synchronization, or secure backups. Avoid
              storing sensitive medical information until those protections
              are implemented.
            </Text>
          </View>
        </View>

        {/* Error */}
        {formError ? (
          <View
            accessibilityRole="alert"
            className="mt-5 flex-row items-start rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#B42318"
            />
            <Text className="ml-2 flex-1 text-sm leading-5 text-red-700">
              {formError}
            </Text>
          </View>
        ) : null}

        {/* Actions */}
        <View className="mt-7 gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save health record"
            accessibilityState={{
              disabled: isBusy,
              busy: isSaving,
            }}
            disabled={isBusy}
            onPress={() => void handleSave()}
            className={`min-h-14 flex-row items-center justify-center rounded-xl px-5 ${
              isBusy
                ? 'bg-emerald-800/70'
                : 'bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons
                name="save-outline"
                size={20}
                color="#FFFFFF"
              />
            )}

            <Text className="ml-2 text-sm font-bold text-white">
              {isLoading
                ? 'Loading records...'
                : isPickingFiles
                  ? 'Selecting files...'
                  : isSaving
                    ? 'Saving record...'
                    : 'Save health record'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel and return"
            disabled={isSaving}
            onPress={() => router.back()}
            className="min-h-12 items-center justify-center rounded-xl border border-[#D0D5DD] bg-white px-5 active:bg-[#F9FAFB]"
          >
            <Text className="text-sm font-bold text-[#344054]">
              Cancel
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
