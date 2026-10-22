export const recordCategories = [
  'All',
  'Lab Results',
  'Prescriptions',
  'Reports',
  'Imaging',
] as const;

export type RecordCategory = (typeof recordCategories)[number];

export type HealthRecordCategory = Exclude<RecordCategory, 'All'>;

export type HealthRecordAttachment = {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  size: number | null;
  type: 'document' | 'image' | 'audio';
  source?: 'camera-scan' | 'gallery' | 'file-picker' | 'microphone';
  durationMs?: number;
  addedAt: string;
};

export type HealthRecord = {
  id: string;
  title: string;
  subtitle: string;
  category: HealthRecordCategory;
  date: string;
  initials: string;
  description: string;
  attachments?: HealthRecordAttachment[];
};

export const demoRecords: HealthRecord[] = [
  {
    id: '1',
    title: 'Complete Blood Count',
    subtitle: 'City Medical Laboratory',
    category: 'Lab Results',
    date: '12 Sep 2026',
    initials: 'LB',
    description:
      'A sample laboratory record representing a complete blood count result. Actual test values and the original laboratory document have not been added.',
  },
  {
    id: '2',
    title: 'Prescription Record',
    subtitle: 'General consultation',
    category: 'Prescriptions',
    date: '04 Sep 2026',
    initials: 'RX',
    description:
      'A sample prescription entry. Medication names, dosages, prescribing clinician details, and instructions are not available in this demo record.',
  },
  {
    id: '3',
    title: 'Medical Consultation',
    subtitle: 'General health assessment',
    category: 'Reports',
    date: '28 Aug 2026',
    initials: 'MR',
    description:
      'A sample medical consultation record. Clinical findings, recommendations, and the original report have not been added.',
  },
  {
    id: '4',
    title: 'Chest X-ray',
    subtitle: 'Radiology report',
    category: 'Imaging',
    date: '16 Aug 2026',
    initials: 'XR',
    description:
      'A sample imaging record. No X-ray image or radiologist interpretation is attached to this demo entry.',
  },
];