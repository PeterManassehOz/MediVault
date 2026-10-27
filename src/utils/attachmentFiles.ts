
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getAttachmentAccess } from '@/services/healthRecords';

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  rtf: 'application/rtf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  '3gp': 'audio/3gpp',
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/rtf': 'rtf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/3gpp': '3gp',
};

function getExtension(name: string): string | null {
  const index = name.lastIndexOf('.');

  if (index <= 0 || index === name.length - 1) {
    return null;
  }

  return name.slice(index + 1).toLowerCase();
}

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[\\/]/g, '_')
      .replace(/[^\w.\- ()]/g, '_')
      .trim() || 'attachment'
  );
}

export function resolveMimeType(
  name: string,
  mimeType: string | null | undefined,
): string {
  const normalized = mimeType?.split(';')[0].trim().toLowerCase();

  if (
    normalized &&
    normalized !== 'application/octet-stream' &&
    normalized !== '*/*'
  ) {
    return normalized;
  }

  const extension = getExtension(name);

  return (
    (extension && MIME_BY_EXTENSION[extension]) ||
    normalized ||
    'application/octet-stream'
  );
}

export function ensureFileNameExtension(
  name: string,
  mimeType: string | null | undefined,
): string {
  const extension = getExtension(name);

  if (extension && extension in MIME_BY_EXTENSION) {
    return name;
  }

  const expected = EXTENSION_BY_MIME[resolveMimeType(name, mimeType)];

  return expected ? `${name}.${expected}` : name;
}

type ShareableAttachment = {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  type?: 'document' | 'image' | 'audio';
};

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function getShareTargetName(
  name: string,
  mimeType: string,
): string {
  return sanitizeFileName(ensureFileNameExtension(name, mimeType));
}

/**
 * Resolves a local or private server attachment to a local file,
 * then shares a correctly named copy.
 *
 * Supply recordId for server attachments whose uri is empty.
 */

export async function shareAttachment(
  attachment: ShareableAttachment,
  recordId?: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  const mimeType = resolveMimeType(
    attachment.name,
    attachment.mimeType,
  );

  const shareName = getShareTargetName(
    attachment.name,
    mimeType,
  );

  let downloadedFileUri: string | null = null;
  let shareCopyUri: string | null = null;

  try {
    let sourceUri = attachment.uri;

    // Resolve private server attachments through a temporary access URL.
    if (!sourceUri || isRemoteUri(sourceUri)) {
      if (!sourceUri && !recordId) {
        throw new Error(
          'The record ID is required to access this server attachment.',
        );
      }

      if (!sourceUri) {
        const access = await getAttachmentAccess(
          recordId!,
          attachment.id,
        );

        if (!access.url) {
          throw new Error(
            'The server did not provide an attachment access URL.',
          );
        }

        sourceUri = access.url;
      }

      const downloadName = `${Date.now()}-${shareName}`;
      const downloadedFile = new File(
        Paths.cache,
        downloadName,
      );

      if (downloadedFile.exists) {
        downloadedFile.delete();
      }

      // Track the destination before downloading so the finally
      // block can remove it even if the download fails partway.
      downloadedFileUri = downloadedFile.uri;

      const download = await LegacyFileSystem.downloadAsync(
        sourceUri,
        downloadedFile.uri,
      );

      if (download.status < 200 || download.status >= 300) {
        throw new Error(
          `The attachment download failed (HTTP ${download.status}).`,
        );
      }

      downloadedFileUri = download.uri;
      sourceUri = download.uri;
    }

    const source = new File(sourceUri);

    if (!source.exists) {
      throw new Error(
        'The attachment file could not be found on this device.',
      );
    }

    const target = new File(
      Paths.cache,
      `${Date.now()}-${shareName}`,
    );

    if (target.exists) {
      target.delete();
    }

    shareCopyUri = target.uri;

    await LegacyFileSystem.copyAsync({
      from: source.uri,
      to: target.uri,
    });

    await Sharing.shareAsync(target.uri, {
      mimeType,
      dialogTitle: shareName,
    });
  } finally {
    // Delete only the temporary files created by this function.
    // Never delete the original local attachment.
    for (const uri of [shareCopyUri, downloadedFileUri]) {
      if (!uri) continue;

      try {
        const file = new File(uri);

        if (file.exists) {
          file.delete();
        }
      } catch (error) {
        console.warn(
          'Could not remove a temporary attachment file:',
          error,
        );
      }
    }
  }
}

