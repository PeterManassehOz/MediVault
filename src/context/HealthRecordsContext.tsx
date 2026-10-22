import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ensureFileNameExtension,
  resolveMimeType,
} from '@/utils/attachmentFiles';


import {
  Directory,
  File,
  Paths,
} from 'expo-file-system';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  demoRecords,
  type HealthRecord,
  type HealthRecordAttachment,
  type HealthRecordCategory,
} from '@/constants/healthRecords';

import * as LegacyFileSystem from 'expo-file-system/legacy';

const STORAGE_KEY = '@medivault/health-records';
const ATTACHMENTS_DIRECTORY = 'health-record-attachments';

export type NewHealthRecord = Omit<HealthRecord, 'id' | 'initials'>;
export type UpdateHealthRecord = Partial<NewHealthRecord>;

export type NewAttachment = {
  name: string;
  uri: string;
  mimeType: string;
  size: number | null;
  type: HealthRecordAttachment['type'];
  source?: HealthRecordAttachment['source'];
  durationMs?: number;
};

interface HealthRecordsContextValue {
  records: HealthRecord[];
  isLoading: boolean;
  error: string | null;
  addRecord: (record: NewHealthRecord) => Promise<HealthRecord>;
  updateRecord: (
    id: string,
    updates: UpdateHealthRecord,
  ) => Promise<HealthRecord>;
  deleteRecord: (id: string) => Promise<void>;
  addAttachment: (
    recordId: string,
    attachment: NewAttachment,
  ) => Promise<HealthRecordAttachment>;
  removeAttachment: (
    recordId: string,
    attachmentId: string,
  ) => Promise<void>;
  getRecordById: (id: string) => HealthRecord | undefined;
  refreshRecords: () => Promise<void>;
}

const HealthRecordsContext =
  createContext<HealthRecordsContextValue | undefined>(undefined);

interface HealthRecordsProviderProps {
  children: ReactNode;
}

function getCategoryInitials(
  category: HealthRecordCategory,
): string {
  switch (category) {
    case 'Lab Results':
      return 'LB';
    case 'Prescriptions':
      return 'RX';
    case 'Reports':
      return 'MR';
    case 'Imaging':
      return 'XR';
  }
}

async function loadStoredRecords(): Promise<HealthRecord[]> {
  const storedRecords = await AsyncStorage.getItem(STORAGE_KEY);

  if (storedRecords !== null) {
    const parsedRecords: unknown = JSON.parse(storedRecords);

    if (!Array.isArray(parsedRecords)) {
      throw new Error('Stored health records have an invalid format.');
    }

    // Older records may not have an attachments property.
    return (parsedRecords as HealthRecord[]).map((record) => ({
      ...record,
      attachments: Array.isArray(record.attachments)
        ? record.attachments
        : [],
    }));
  }

  const initialRecords = demoRecords.map((record) => ({
    ...record,
    attachments: [],
  }));

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(initialRecords),
  );

  return initialRecords;
}

function getAttachmentsDirectory(): Directory {
  return new Directory(Paths.document, ATTACHMENTS_DIRECTORY);
}

function ensureAttachmentsDirectory(): Directory {
  const directory = getAttachmentsDirectory();

  if (!directory.exists) {
    directory.create({
      idempotent: true,
      intermediates: true,
    });
  }

  return directory;
}

function createAttachmentId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/]/g, '_')
    .replace(/[^\w.\- ()]/g, '_')
    .trim();

  return cleaned || 'attachment';
}

async function copyAttachmentIntoApp(
  sourceUri: string,
  attachmentId: string,
  originalName: string,
): Promise<File> {
  const directory = ensureAttachmentsDirectory();

  const destinationName =
    `${attachmentId}-${safeFileName(originalName)}`;

  const destination = new File(directory, destinationName);

  await LegacyFileSystem.copyAsync({
    from: sourceUri,
    to: destination.uri,
  });

  return destination;
}

async function persistRecords(
  records: HealthRecord[],
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function HealthRecordsProvider({
  children,
}: HealthRecordsProviderProps) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always points to the latest committed records, including updates
  // made before React has rendered the next state.
  const recordsRef = useRef<HealthRecord[]>([]);

  const commitRecords = useCallback((nextRecords: HealthRecord[]) => {
    recordsRef.current = nextRecords;
    setRecords(nextRecords);
  }, []);

  const refreshRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const storedRecords = await loadStoredRecords();
      commitRecords(storedRecords);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load health records.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [commitRecords]);

  useEffect(() => {
    void refreshRecords();
  }, [refreshRecords]);

  const addRecord = useCallback(
    async (newRecord: NewHealthRecord): Promise<HealthRecord> => {
      if (isLoading) {
        throw new Error(
          'Health records are still loading. Please try again.',
        );
      }

      if (error) {
        throw new Error(
          'Health records could not be loaded. Please retry before adding a record.',
        );
      }

      const record: HealthRecord = {
        ...newRecord,
        attachments: newRecord.attachments ?? [],
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        initials: getCategoryInitials(newRecord.category),
      };

      const updatedRecords = [record, ...recordsRef.current];

      await persistRecords(updatedRecords);
      commitRecords(updatedRecords);

      return record;
    },
    [error, isLoading, commitRecords],
  );

  const updateRecord = useCallback(
    async (
      id: string,
      updates: UpdateHealthRecord,
    ): Promise<HealthRecord> => {
      if (isLoading) {
        throw new Error(
          'Health records are still loading. Please try again.',
        );
      }

      if (error) {
        throw new Error(
          'Health records could not be loaded. Please retry before updating a record.',
        );
      }

      const currentRecords = recordsRef.current;
      const existingRecord = currentRecords.find(
        (record) => record.id === id,
      );

      if (!existingRecord) {
        throw new Error(
          'The health record you are trying to update was not found.',
        );
      }

      const updatedRecord: HealthRecord = {
        ...existingRecord,
        ...updates,
        id: existingRecord.id,
        initials: getCategoryInitials(
          updates.category ?? existingRecord.category,
        ),
        attachments:
          updates.attachments ?? existingRecord.attachments ?? [],
      };

      const updatedRecords = currentRecords.map((record) =>
        record.id === id ? updatedRecord : record,
      );

      await persistRecords(updatedRecords);
      commitRecords(updatedRecords);

      return updatedRecord;
    },
    [error, isLoading, commitRecords],
  );

  const deleteRecord = useCallback(
    async (id: string): Promise<void> => {
      if (isLoading) {
        throw new Error(
          'Health records are still loading. Please try again.',
        );
      }

      if (error) {
        throw new Error(
          'Health records could not be loaded. Please retry before deleting a record.',
        );
      }

      const currentRecords = recordsRef.current;
      const existingRecord = currentRecords.find(
        (record) => record.id === id,
      );

      if (!existingRecord) {
        throw new Error(
          'The health record you are trying to delete was not found.',
        );
      }

      const updatedRecords = currentRecords.filter(
        (record) => record.id !== id,
      );

      // Persist metadata before removing the associated physical files.
      await persistRecords(updatedRecords);
      commitRecords(updatedRecords);

      for (const attachment of existingRecord.attachments ?? []) {
        try {
          const file = new File(attachment.uri);

          if (file.exists) {
            file.delete();
          }
        } catch {
          // Metadata is already deleted. A leftover file can be
          // cleaned up later.
        }
      }
    },
    [error, isLoading, commitRecords],
  );

  const addAttachment = useCallback(
    async (
      recordId: string,
      attachment: NewAttachment,
    ): Promise<HealthRecordAttachment> => {
      if (isLoading || error) {
        throw new Error(
          'Health records are not ready. Please reload and try again.',
        );
      }

      const initialRecord = recordsRef.current.find(
        (record) => record.id === recordId,
      );

      if (!initialRecord) {
        throw new Error('The health record was not found.');
      }

      const attachmentId = createAttachmentId();
      let copiedFile: File | undefined;

            try {
        const mimeType = resolveMimeType(
          attachment.name,
          attachment.mimeType,
        );

        const name = ensureFileNameExtension(attachment.name, mimeType);

        copiedFile = await copyAttachmentIntoApp(
          attachment.uri,
          attachmentId,
          name,
        );

        const savedAttachment: HealthRecordAttachment = {
          ...attachment,
          name,
          mimeType,
          id: attachmentId,
          uri: copiedFile.uri,
          addedAt: new Date().toISOString(),
        };
        
        // Re-read the latest records after the file copy. The record
        // could have changed while the asynchronous operation ran.
        const currentRecords = recordsRef.current;
        const currentRecord = currentRecords.find(
          (record) => record.id === recordId,
        );

        if (!currentRecord) {
          throw new Error(
            'The health record no longer exists. The attachment was not saved.',
          );
        }

        const updatedRecord: HealthRecord = {
          ...currentRecord,
          attachments: [
            ...(currentRecord.attachments ?? []),
            savedAttachment,
          ],
        };

        const updatedRecords = currentRecords.map((record) =>
          record.id === recordId ? updatedRecord : record,
        );

        // Save metadata first. If persistence fails, remove the copied file.
        await persistRecords(updatedRecords);
        commitRecords(updatedRecords);

        return savedAttachment;
      } catch (err) {
        try {
          if (copiedFile?.exists) {
            copiedFile.delete();
          }
        } catch {
          // Preserve the original error.
        }

        throw err;
      }
    },
    [error, isLoading, commitRecords],
  );

  const removeAttachment = useCallback(
    async (
      recordId: string,
      attachmentId: string,
    ): Promise<void> => {
      if (isLoading || error) {
        throw new Error(
          'Health records are not ready. Please reload and try again.',
        );
      }

      const currentRecords = recordsRef.current;
      const existingRecord = currentRecords.find(
        (record) => record.id === recordId,
      );

      if (!existingRecord) {
        throw new Error('The health record was not found.');
      }

      const attachment = (existingRecord.attachments ?? []).find(
        (item) => item.id === attachmentId,
      );

      if (!attachment) {
        throw new Error('The attachment was not found.');
      }

      const updatedRecord: HealthRecord = {
        ...existingRecord,
        attachments: (existingRecord.attachments ?? []).filter(
          (item) => item.id !== attachmentId,
        ),
      };

      const updatedRecords = currentRecords.map((record) =>
        record.id === recordId ? updatedRecord : record,
      );

      // Do not remove the physical file until metadata has been saved.
      await persistRecords(updatedRecords);
      commitRecords(updatedRecords);

      try {
        const file = new File(attachment.uri);

        if (file.exists) {
          file.delete();
        }
      } catch {
        // Metadata is removed. A leftover file can be cleaned up later.
      }
    },
    [error, isLoading, commitRecords],
  );

  const getRecordById = useCallback(
    (id: string) => records.find((record) => record.id === id),
    [records],
  );

  return (
    <HealthRecordsContext.Provider
      value={{
        records,
        isLoading,
        error,
        addRecord,
        updateRecord,
        deleteRecord,
        addAttachment,
        removeAttachment,
        getRecordById,
        refreshRecords,
      }}
    >
      {children}
    </HealthRecordsContext.Provider>
  );
}

export function useHealthRecords() {
  const context = useContext(HealthRecordsContext);

  if (!context) {
    throw new Error(
      'useHealthRecords must be used within a HealthRecordsProvider.',
    );
  }

  return context;
}