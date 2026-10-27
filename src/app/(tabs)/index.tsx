import { useState, type ComponentProps } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useHealthRecords } from '@/context/HealthRecordsContext';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type QuickAction = {
  id: string;
  icon: IoniconName;
  title: string;
  description: string;
  message: string;
  iconContainer: string;
  iconColor: string;
};

const quickActions: QuickAction[] = [
  {
    id: 'record',
    icon: 'add-circle-outline',
    title: 'Add record',
    description: 'Save health information',
    message: '',
    iconContainer: 'bg-emerald-100',
    iconColor: '#047857',
  },
  {
    id: 'scan',
    icon: 'scan-outline',
    title: 'Scan document',
    description: 'Capture a medical document',
    message:
      '',
    iconContainer: 'bg-blue-100',
    iconColor: '#1D4ED8',
  },
  {
    id: 'voice',
    icon: 'mic-outline',
    title: 'Voice note',
    description: 'Record health notes',
    message: '',
    iconContainer: 'bg-violet-100',
    iconColor: '#6D28D9',
  },
];

const categoryStyles = {
  'Lab Results': {
    icon: 'flask-outline',
    iconContainer: 'bg-emerald-100',
    iconColor: '#047857',
  },
  Prescriptions: {
    icon: 'medkit-outline',
    iconContainer: 'bg-violet-100',
    iconColor: '#6D28D9',
  },
  Reports: {
    icon: 'document-text-outline',
    iconContainer: 'bg-blue-100',
    iconColor: '#1D4ED8',
  },
  Imaging: {
    icon: 'scan-outline',
    iconContainer: 'bg-amber-100',
    iconColor: '#B45309',
  },
} satisfies Record<
  'Lab Results' | 'Prescriptions' | 'Reports' | 'Imaging',
  {
    icon: IoniconName;
    iconContainer: string;
    iconColor: string;
  }
>;

export default function HomeScreen() {
  const [notice, setNotice] = useState('');
  const router = useRouter();

  const { records, isLoading, error, refreshRecords } = useHealthRecords();

  // The context places newly added records first.
  const recentRecords = records.slice(0, 2);

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="w-full self-center px-5 pb-12 pt-4 md:max-w-3xl">
          {/* Welcome */}
          <Text className="text-[27px] font-extrabold leading-[35px] tracking-tight text-[#101828]">
            Your health,{'\n'}all in one place.
          </Text>

          <Text className="mt-2 text-[15px] leading-[23px] text-[#667085]">
            Keep your medical documents and health information organized in
            one personal space.
          </Text>

          {/* Health vault card */}
          <View className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <View className="flex-row items-start">
              <View className="mr-4 h-[46px] w-[46px] items-center justify-center rounded-xl bg-emerald-100">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={25}
                  color="#047857"
                />
              </View>

              <View className="flex-1">
                <Text className="text-lg font-extrabold text-[#101828]">
                  Your health vault
                </Text>

                <Text className="mt-1 text-sm leading-[21px] text-[#667085]">
                  A personal space for health records, prescriptions, test
                  results, and medical documents.
                </Text>
              </View>
            </View>

            <View className="my-4 h-px bg-[#F1F5F9]" />

            <View className="flex-row items-center">
              <Ionicons
                name="time-outline"
                size={17}
                color="#B45309"
              />

              <Text className="ml-2 flex-1 text-[13px] leading-[19px] text-[#667085]">
                Biometric authentication and encrypted storage are planned
                security features.
              </Text>
            </View>
          </View>

          {/* Quick actions */}
          <View className="mt-8">
            <View className="mb-4">
              <Text className="text-xl font-bold leading-7 text-[#101828]">
                Quick actions
              </Text>

              <Text className="mt-1 text-sm leading-5 text-[#667085]">
                Manage your health information
              </Text>
            </View>

            <View className="gap-3">
              {quickActions.map((action) => (
                <Pressable
                  key={action.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${action.title}. ${action.description}`}
                  onPress={() => {
                    if (action.id === 'record') {
                      setNotice('');
                      router.push('/records/add');
                      return;
                    }

                    if (action.id === 'scan') {
                      setNotice('');
                      router.push('/scan');
                      return;
                    }

                    setNotice('');
                    router.push('/voice-note');
                  }}
                  className="flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white p-4 active:opacity-75"
                >
                  <View
                    className={`mr-4 h-[46px] w-[46px] items-center justify-center rounded-xl ${action.iconContainer}`}
                  >
                    <Ionicons
                      name={action.icon}
                      size={24}
                      color={action.iconColor}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-[#101828]">
                      {action.title}
                    </Text>

                    <Text className="mt-1 text-[13px] leading-[19px] text-[#667085]">
                      {action.description}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#98A2B3"
                  />
                </Pressable>
              ))}
            </View>

            {notice ? (
              <View className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <View className="flex-row items-start">
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#047857"
                  />

                  <Text className="ml-2 flex-1 text-sm leading-[21px] text-emerald-800">
                    {notice}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss notification"
                  onPress={() => setNotice('')}
                  className="mt-3 self-start"
                  hitSlop={8}
                >
                  <Text className="text-sm font-extrabold text-emerald-800">
                    Dismiss
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Recent records */}
          <View className="mt-8">
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-xl font-bold leading-7 text-[#101828]">
                  Recent records
                </Text>

                <Text className="mt-1 text-sm leading-5 text-[#667085]">
                  Your saved health information
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View all health records"
                onPress={() => router.push('/(tabs)/records')}
                className="flex-row items-center rounded-lg px-2 py-2 active:opacity-60"
                hitSlop={4}
              >
                <Text className="text-sm font-bold text-emerald-700">
                  View all
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#047857"
                />
              </Pressable>
            </View>

            {isLoading ? (
              <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white px-5 py-8">
                <Ionicons
                  name="sync-outline"
                  size={25}
                  color="#047857"
                />

                <Text className="mt-3 text-sm font-semibold text-[#344054]">
                  Loading your records...
                </Text>
              </View>
            ) : error ? (
              <View className="rounded-2xl border border-red-200 bg-white p-4">
                <View className="flex-row items-start">
                  <Ionicons
                    name="alert-circle-outline"
                    size={21}
                    color="#B42318"
                  />

                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-[#101828]">
                      Could not load your records
                    </Text>

                    <Text className="mt-1 text-sm leading-5 text-[#667085]">
                      {error}
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refreshRecords()}
                  className="mt-4 self-start rounded-xl bg-emerald-700 px-4 py-2.5 active:bg-emerald-800"
                >
                  <Text className="text-sm font-bold text-white">
                    Try again
                  </Text>
                </Pressable>
              </View>
            ) : recentRecords.length > 0 ? (
              <View className="gap-3">
                {recentRecords.map((record) => {
                  const style = categoryStyles[record.category];

                  return (
                    <Pressable
                      key={record.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${record.title}, ${record.category}`}
                      onPress={() =>
                        router.push({
                          pathname: '/records/[id]',
                          params: { id: record.id },
                        })
                      }
                      className="flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white p-4 active:opacity-75"
                    >
                      <View
                        className={`mr-4 h-[46px] w-[46px] items-center justify-center rounded-xl ${style.iconContainer}`}
                      >
                        <Ionicons
                          name={style.icon}
                          size={23}
                          color={style.iconColor}
                        />
                      </View>

                      <View className="flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-[15px] font-bold text-[#101828]"
                        >
                          {record.title}
                        </Text>

                        <Text
                          numberOfLines={1}
                          className="mt-1 text-xs leading-[18px] text-[#667085]"
                        >
                          {record.subtitle}
                        </Text>

                        <Text className="mt-1 text-xs font-medium text-[#98A2B3]">
                          {record.date} · {record.category}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#98A2B3"
                      />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View className="items-center rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-5 py-8">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                  <Ionicons
                    name="folder-open-outline"
                    size={27}
                    color="#047857"
                  />
                </View>

                <Text className="mt-4 text-base font-bold text-[#101828]">
                  Your vault is ready
                </Text>

                <Text className="mt-2 max-w-[260px] text-center text-sm leading-5 text-[#667085]">
                  Add your first health record to start organizing your
                  information here.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/records/add')}
                  className="mt-5 flex-row items-center rounded-xl bg-emerald-700 px-4 py-3 active:bg-emerald-800"
                >
                  <Ionicons
                    name="add"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text className="ml-1 text-sm font-bold text-white">
                    Add health record
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Privacy notice */}
          <View className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-4 mb-10">
            <View className="flex-row items-center">
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color="#344054"
              />

              <Text className="ml-2 text-[15px] font-extrabold text-[#101828]">
                Your privacy matters
              </Text>
            </View>

            <Text className="mt-2 text-[13px] leading-5 text-[#667085]">
              Records are stored in a database, and you can request for it anytime you deem necessary.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}