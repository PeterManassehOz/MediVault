import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ensureFileNameExtension,
  resolveMimeType,
} from '@/utils/attachmentFiles';


import { File } from 'expo-file-system';

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

import {
  listHealthRecords as fetchServerRecords,
  listRecordAttachments,
  createHealthRecord as createServerRecord,
  updateHealthRecord as updateServerRecord,
  deleteHealthRecord as deleteServerRecord,
  uploadRecordAttachment,
  deleteRecordAttachment,
} from '@/services/healthRecords';


const STORAGE_KEY = '@medivault/health-records';


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
      const cachedJson = await AsyncStorage.getItem(STORAGE_KEY);

      const parsedCache: unknown = cachedJson
        ? JSON.parse(cachedJson)
        : [];

      if (!Array.isArray(parsedCache)) {
        throw new Error('Stored health records have an invalid format.');
      }

      const cachedRecords = (parsedCache as HealthRecord[]).map(
        (record) => ({
          ...record,
          attachments: Array.isArray(record.attachments)
            ? record.attachments
            : [],
        }),
      );

      // Preserve the original local data before synchronizing.
      if (cachedJson !== null) {
        const backupKey = `${STORAGE_KEY}:pre-sync-backup`;
        const existingBackup = await AsyncStorage.getItem(backupKey);

        if (existingBackup === null) {
          await AsyncStorage.setItem(backupKey, cachedJson);
        }
      }

      let serverRecords = await fetchServerRecords();

      const demoRecordIds = new Set(
        demoRecords.map((record) => record.id),
      );

      const legacyRecords = cachedRecords.filter(
        (record) => !demoRecordIds.has(record.id),
      );

      // Avoid duplicate migration attempts for records already on
      // the server, including records from a previous interrupted sync.
      const migratedClientIds = new Set(
        serverRecords
          .map((record) => record.clientRecordId)
          .filter((id): id is string => Boolean(id)),
      );

      const serverIds = new Set(
        serverRecords.map((record) => record.id),
      );

      for (const legacyRecord of legacyRecords) {
        if (
          serverIds.has(legacyRecord.id) ||
          migratedClientIds.has(legacyRecord.id)
        ) {
          continue;
        }

        await createServerRecord(
          {
            title: legacyRecord.title,
            subtitle: legacyRecord.subtitle,
            category: legacyRecord.category,
            date: legacyRecord.date,
            description: legacyRecord.description,
          },
          legacyRecord.id,
        );

        // Prevent another cached entry from reusing the same key.
        migratedClientIds.add(legacyRecord.id);
      }

      // Fetch again to get the authoritative MongoDB IDs.
      serverRecords = await fetchServerRecords();

      // Index the cache by both local IDs and known client IDs.
      const cachedRecordsById = new Map<string, HealthRecord>();

      for (const cachedRecord of cachedRecords) {
        cachedRecordsById.set(cachedRecord.id, cachedRecord);

        if (cachedRecord.clientRecordId) {
          cachedRecordsById.set(
            cachedRecord.clientRecordId,
            cachedRecord,
          );
        }
      }

      const synchronizedRecords = await Promise.all(
        serverRecords.map(async (serverRecord) => {
          const cachedRecord =
            cachedRecordsById.get(serverRecord.id) ??
            (serverRecord.clientRecordId
              ? cachedRecordsById.get(serverRecord.clientRecordId)
              : undefined);

          const cachedAttachments = cachedRecord?.attachments ?? [];

          try {
            // Retrieve the authoritative attachment metadata from the server.
            const serverAttachments = await listRecordAttachments(
              serverRecord.id,
            );

            // Preserve device-specific metadata that the server does not store.
            const cachedAttachmentsById = new Map(
              cachedAttachments.map((attachment) => [
                attachment.id,
                attachment,
              ]),
            );

            const synchronizedAttachments = serverAttachments.map(
              (serverAttachment) => {
                const cachedAttachment = cachedAttachmentsById.get(
                  serverAttachment.id,
                );

                return {
                  ...cachedAttachment,
                  ...serverAttachment,
                  ...(cachedAttachment?.source
                    ? { source: cachedAttachment.source }
                    : {}),
                  ...(serverAttachment.durationMs == null &&
                  cachedAttachment?.durationMs !== undefined
                    ? { durationMs: cachedAttachment.durationMs }
                    : {}),
                };
              },
            );

            return {
              ...serverRecord,
              attachments: synchronizedAttachments,
            };
          } catch {
            // If attachment retrieval fails, preserve the cached attachments
            // for this record rather than failing the entire synchronization.
            return {
              ...serverRecord,
              attachments: cachedAttachments,
            };
          }
        }),
      );

      await persistRecords(synchronizedRecords);
      commitRecords(synchronizedRecords);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to synchronize health records.',
      );

      // Preserve the local cache if the server is unreachable.
      try {
        const cachedJson = await AsyncStorage.getItem(STORAGE_KEY);

        if (cachedJson !== null) {
          const cachedRecords: unknown = JSON.parse(cachedJson);

          if (Array.isArray(cachedRecords)) {
            commitRecords(
              (cachedRecords as HealthRecord[]).map((record) => ({
                ...record,
                attachments: Array.isArray(record.attachments)
                  ? record.attachments
                  : [],
              })),
            );
          }
        }
      } catch {
        // Keep the original synchronization error.
      }
    } finally {
      setIsLoading(false);
    }
  }, [commitRecords]);

  useEffect(() => {
    void refreshRecords();
  }, [refreshRecords]);

  const addRecord = useCallback(
    async (newRecord: NewHealthRecord): Promise<HealthRecord> => {
      if (isLoading || error) {
        throw new Error(
          'Health records are not ready. Please synchronize and try again.',
        );
      }

      // Generate a stable client ID so the backend can safely handle
      // a retried create request without creating duplicate records.
      const clientRecordId =
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const createdRecord = await createServerRecord(
        {
          title: newRecord.title,
          subtitle: newRecord.subtitle,
          category: newRecord.category,
          date: newRecord.date,
          description: newRecord.description,
        },
        clientRecordId,
      );

      const record: HealthRecord = {
        ...createdRecord,
        attachments: [],
      };

      const updatedRecords = [
        record,
        ...recordsRef.current.filter(
          (item) => item.id !== record.id,
        ),
      ];

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
      if (isLoading || error) {
        throw new Error(
          'Health records are not ready. Please synchronize and try again.',
        );
      }

      const existingRecord = recordsRef.current.find(
        (record) => record.id === id,
      );

      if (!existingRecord) {
        throw new Error('The health record was not found.');
      }

      // Attachments are managed through their own API endpoints.
      const {
        attachments: _ignoredAttachments,
        ...recordUpdates
      } = updates;

      const updatedFromServer = await updateServerRecord(
        id,
        recordUpdates,
      );

      const updatedRecord: HealthRecord = {
        ...updatedFromServer,
        attachments: existingRecord.attachments ?? [],
      };

      const updatedRecords = recordsRef.current.map((record) =>
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
      if (isLoading || error) {
        throw new Error(
          'Health records are not ready. Please synchronize and try again.',
        );
      }

      const existingRecord = recordsRef.current.find(
        (record) => record.id === id,
      );

      if (!existingRecord) {
        throw new Error('The health record was not found.');
      }

      // Delete from MongoDB first. If this fails, retain the local record.
      await deleteServerRecord(id);

      const updatedRecords = recordsRef.current.filter(
        (record) => record.id !== id,
      );

      await persistRecords(updatedRecords);
      commitRecords(updatedRecords);

      // Clean up files stored locally on this device.
      for (const attachment of existingRecord.attachments ?? []) {
        if (!attachment.uri) continue;

        try {
          const file = new File(attachment.uri);

          if (file.exists) {
            file.delete();
          }
        } catch {
          // The server deletion succeeded; local cleanup can be retried.
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

      const existingRecord = recordsRef.current.find(
        (record) => record.id === recordId,
      );

      if (!existingRecord) {
        throw new Error('The health record was not found.');
      }

      const mimeType = resolveMimeType(
        attachment.name,
        attachment.mimeType,
      );

      const name = ensureFileNameExtension(
        attachment.name,
        mimeType,
      );

      const uploadedAttachment = await uploadRecordAttachment(
        recordId,
        {
          name,
          uri: attachment.uri,
          mimeType,
          size: attachment.size,
          type: attachment.type,
          ...(attachment.durationMs !== undefined
            ? { durationMs: attachment.durationMs }
            : {}),
        },
      );

      const savedAttachment: HealthRecordAttachment = {
        ...uploadedAttachment,
        source: attachment.source,
      };

      const currentRecords = recordsRef.current;
      const currentRecord = currentRecords.find(
        (record) => record.id === recordId,
      );

      if (!currentRecord) {
        throw new Error(
          'The health record no longer exists. Refresh your records.',
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

      await persistRecords(updatedRecords);
      commitRecords(updatedRecords);

      return savedAttachment;
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

      const attachment = (
        existingRecord.attachments ?? []
      ).find((item) => item.id === attachmentId);

      if (!attachment) {
        throw new Error('The attachment was not found.');
      }

      // Delete remote attachments through the authenticated API.
      if (!attachment.uri) {
        await deleteRecordAttachment(recordId, attachmentId);
      }

      const updatedRecord: HealthRecord = {
        ...existingRecord,
        attachments: (
          existingRecord.attachments ?? []
        ).filter((item) => item.id !== attachmentId),
      };

      const updatedRecords = currentRecords.map((record) =>
        record.id === recordId ? updatedRecord : record,
      );

      await persistRecords(updatedRecords);
      commitRecords(updatedRecords);

      // Remove legacy files from the device when applicable.
      if (attachment.uri) {
        try {
          const file = new File(attachment.uri);

          if (file.exists) {
            file.delete();
          }
        } catch {
          // Preserve the successful metadata update.
        }
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