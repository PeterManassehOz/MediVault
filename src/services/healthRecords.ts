
import { apiRequest } from "@/services/api";

import type {
  HealthRecord,
  HealthRecordAttachment,
  HealthRecordCategory,
} from "@/constants/healthRecords";

const HEALTH_RECORDS_ENDPOINT = "/health-records";

type ServerHealthRecord = {
  _id: string;
  id?: string;
  clientRecordId?: string;
  title: string;
  subtitle?: string;
  category: HealthRecordCategory;
  date: string;
  initials?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ServerAttachment = {
  id: string;
  healthRecord: string;
  type: HealthRecordAttachment["type"];
  originalName: string;
  mimeType: string;
  format: string;
  size: number;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

type ListRecordsResponse = {
  success: boolean;
  results: number;
  data: {
    records: ServerHealthRecord[];
  };
};

type RecordResponse = ApiResponse<{
  record: ServerHealthRecord;
}>;

type AttachmentListResponse = {
  success: boolean;
  results: number;
  data: ServerAttachment[];
};

type AttachmentResponse = ApiResponse<{
  id: string;
  healthRecord: string;
  type: HealthRecordAttachment["type"];
  originalName: string;
  mimeType: string;
  format: string;
  size: number;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
}>;

type AttachmentAccessResponse = ApiResponse<{
  url: string;
  expiresAt: string;
}>;

export type AttachmentAccess = {
  url: string;
  expiresAt: string;
};

export type CreateRecordInput = Omit<
  HealthRecord,
  'id' | 'clientRecordId' | 'initials' | 'attachments'
>;

export type UpdateRecordInput = Partial<CreateRecordInput>;

export type UploadAttachmentInput = {
  name: string;
  uri: string;
  mimeType: string;
  size: number | null;
  type: HealthRecordAttachment['type'];
  durationMs?: number;
};

function getInitials(category: HealthRecordCategory): string {
  switch (category) {
    case "Lab Results":
      return "LB";
    case "Prescriptions":
      return "RX";
    case "Reports":
      return "MR";
    case "Imaging":
      return "XR";
  }
}

/**
 * Convert a date to the YYYY-MM-DD format required by the API.
 * Supports existing display dates such as "12 Sep 2026".
 */
export function toApiDate(value: string): string {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );

    if (
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() === Number(month) - 1 &&
      parsed.getUTCDate() === Number(day)
    ) {
      return value;
    }

    throw new Error("Please provide a valid record date.");
  }

  const displayMatch =
    /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/.exec(value.trim());

  if (!displayMatch) {
    throw new Error("Record date must be a valid date.");
  }

  const [, dayText, monthText, yearText] = displayMatch;
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];

  const monthIndex = months.indexOf(
    monthText.slice(0, 3).toLowerCase(),
  );

  if (monthIndex < 0) {
    throw new Error("Please provide a valid record date.");
  }

  const day = Number(dayText);
  const year = Number(yearText);
  const parsed = new Date(Date.UTC(year, monthIndex, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Please provide a valid record date.");
  }

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function mapServerRecord(
  record: ServerHealthRecord,
): HealthRecord {
  return {
    id: record._id || record.id || '',
    clientRecordId: record.clientRecordId,
    title: record.title,
    subtitle: record.subtitle ?? '',
    category: record.category,
    date: record.date,
    initials: record.initials || getInitials(record.category),
    description: record.description ?? '',
    attachments: [],
  };
}


function mapServerAttachment(
  attachment: ServerAttachment,
): HealthRecordAttachment {
  return {
    id: attachment.id,
    name: attachment.originalName,
    // A remote attachment has no device-local URI.
    // Request a temporary access URL when opening it.
    uri: "",
    mimeType: attachment.mimeType,
    size: attachment.size,
    type: attachment.type,
    ...(attachment.durationMs !== undefined
      ? { durationMs: attachment.durationMs }
      : {}),
    addedAt: attachment.createdAt,
  };
}

export async function listHealthRecords(): Promise<HealthRecord[]> {
  const response = await apiRequest<ListRecordsResponse>(
    HEALTH_RECORDS_ENDPOINT,
  );

  return response.data.records.map(mapServerRecord);
}

export async function getHealthRecord(
  recordId: string,
): Promise<HealthRecord> {
  const response = await apiRequest<RecordResponse>(
    `${HEALTH_RECORDS_ENDPOINT}/${encodeURIComponent(recordId)}`,
  );

  return mapServerRecord(response.data.record);
}

export async function createHealthRecord(
  record: CreateRecordInput,
  clientRecordId: string,
): Promise<HealthRecord> {
  const payload = {
    clientRecordId,
    title: record.title.trim(),
    subtitle: record.subtitle.trim(),
    category: record.category,
    date: toApiDate(record.date),
    description: record.description.trim(),
  };

  const response = await apiRequest<RecordResponse>(
    HEALTH_RECORDS_ENDPOINT,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return mapServerRecord(response.data.record);
}

export async function updateHealthRecord(
  recordId: string,
  updates: UpdateRecordInput,
): Promise<HealthRecord> {
  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    payload.title = updates.title.trim();
  }

  if (updates.subtitle !== undefined) {
    payload.subtitle = updates.subtitle.trim();
  }

  if (updates.category !== undefined) {
    payload.category = updates.category;
  }

  if (updates.date !== undefined) {
    payload.date = toApiDate(updates.date);
  }

  if (updates.description !== undefined) {
    payload.description = updates.description.trim();
  }

  const response = await apiRequest<RecordResponse>(
    `${HEALTH_RECORDS_ENDPOINT}/${encodeURIComponent(recordId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return mapServerRecord(response.data.record);
}

export async function deleteHealthRecord(
  recordId: string,
): Promise<void> {
  await apiRequest<ApiResponse<never>>(
    `${HEALTH_RECORDS_ENDPOINT}/${encodeURIComponent(recordId)}`,
    { method: "DELETE" },
  );
}

export async function listRecordAttachments(
  recordId: string,
): Promise<HealthRecordAttachment[]> {
  const response = await apiRequest<AttachmentListResponse>(
    `${HEALTH_RECORDS_ENDPOINT}/${encodeURIComponent(recordId)}/attachments`,
  );

  return response.data.map(mapServerAttachment);
}


export async function uploadRecordAttachment(
  recordId: string,
  attachment: UploadAttachmentInput,
): Promise<HealthRecordAttachment> {
  const formData = new FormData();

  formData.append(
    'file',
    {
      uri: attachment.uri,
      name: attachment.name,
      type: attachment.mimeType,
    } as unknown as Blob,
  );

  if (attachment.durationMs !== undefined) {
    formData.append('durationMs', String(attachment.durationMs));
  }

  const response = await apiRequest<AttachmentResponse>(
    `${HEALTH_RECORDS_ENDPOINT}/${encodeURIComponent(recordId)}/attachments`,
    {
      method: 'POST',
      body: formData,
    },
  );

  return mapServerAttachment(response.data);
}

export async function getAttachmentAccess(
  recordId: string,
  attachmentId: string,
): Promise<AttachmentAccess> {
  const response = await apiRequest<AttachmentAccessResponse>(
    `${HEALTH_RECORDS_ENDPOINT}/${encodeURIComponent(recordId)}/attachments/${encodeURIComponent(attachmentId)}/access`,
  );

  return response.data;
}

export async function deleteRecordAttachment(
  recordId: string,
  attachmentId: string,
): Promise<void> {
  await apiRequest<ApiResponse<never>>(
    `${HEALTH_RECORDS_ENDPOINT}/${encodeURIComponent(recordId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { method: "DELETE" },
  );
}
