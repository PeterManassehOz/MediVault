import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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

/**
 * Returns a usable MIME type. If the picker reported nothing useful
 * (missing, "*\/*" or application/octet-stream), derive it from the
 * file extension instead.
 */
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

/**
 * Guarantees a known extension on the file name. If the name already
 * ends in a recognised extension it is left alone; otherwise the
 * extension that matches the MIME type is appended.
 */
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

/**
 * Shares a stored attachment with a correct file name and MIME type.
 * Works for attachments saved before this fix too, as long as the
 * stored name or MIME type still identifies the file type.
 */
export async function shareAttachment(attachment: {
  name: string;
  uri: string;
  mimeType: string;
}): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  const source = new File(attachment.uri);

  if (!source.exists) {
    throw new Error(
      'The attachment file could not be found on this device.',
    );
  }

  const mimeType = resolveMimeType(attachment.name, attachment.mimeType);

  const shareName = sanitizeFileName(
    ensureFileNameExtension(attachment.name, mimeType),
  );

  // Share a copy that has the correct name, so receiving apps see a
  // real extension instead of an extension-less (or ID-prefixed) file.
  const target = new File(Paths.cache, shareName);

  if (target.exists) {
    target.delete();
  }

  await LegacyFileSystem.copyAsync({
    from: source.uri,
    to: target.uri,
  });

  await Sharing.shareAsync(target.uri, {
    mimeType,
    dialogTitle: shareName,
  });
}