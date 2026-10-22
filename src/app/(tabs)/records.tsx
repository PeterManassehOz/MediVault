
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  recordCategories,
  type RecordCategory,
} from '@/constants/healthRecords';
import { useHealthRecords } from '@/context/HealthRecordsContext';

const categoryStyles = {
  'Lab Results': {
    background: 'bg-emerald-50',
    foreground: 'text-emerald-800',
    icon: 'flask-outline' as const,
    iconColor: '#047857',
  },
  Prescriptions: {
    background: 'bg-violet-50',
    foreground: 'text-violet-800',
    icon: 'medkit-outline' as const,
    iconColor: '#6D28D9',
  },
  Reports: {
    background: 'bg-blue-50',
    foreground: 'text-blue-800',
    icon: 'document-text-outline' as const,
    iconColor: '#1D4ED8',
  },
  Imaging: {
    background: 'bg-amber-50',
    foreground: 'text-amber-800',
    icon: 'scan-outline' as const,
    iconColor: '#B45309',
  },
};

export default function RecordsScreen() {
  const router = useRouter();
  const {
    records,
    isLoading,
    error,
    refreshRecords,
  } = useHealthRecords();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<RecordCategory>('All');

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        record.category === selectedCategory;

      const matchesSearch =
        !query ||
        record.title.toLowerCase().includes(query) ||
        record.subtitle.toLowerCase().includes(query) ||
        record.category.toLowerCase().includes(query) ||
        record.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [records, search, selectedCategory]);

  function openRecord(id: string) {
    router.push({
      pathname: '/records/[id]',
      params: { id },
    });
  }

  function openAddRecord() {
    router.push('/records/add');
  }

  function resetFilters() {
    setSearch('');
    setSelectedCategory('All');
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-32 pt-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View className="mb-7">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-emerald-700">
            HEALTH LIBRARY
          </Text>

          <Text className="mt-2 text-[28px] font-bold tracking-tight text-[#101828]">
            Medical records
          </Text>

          <Text className="mt-2 max-w-sm text-sm leading-6 text-[#667085]">
            Your medical documents, organised and accessible in one place.
          </Text>
        </View>

        {/* Add record action */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a new health record"
          onPress={openAddRecord}
          className="mb-6 flex-row items-center justify-center rounded-xl bg-emerald-700 px-4 py-4 active:bg-emerald-800"
        >
          <Ionicons
            name="add-circle-outline"
            size={21}
            color="#FFFFFF"
          />

          <Text className="ml-2 text-sm font-bold text-white">
            Add health record
          </Text>
        </Pressable>

        {/* Search */}
        <View className="mb-6 min-h-14 flex-row items-center rounded-xl border border-[#E4E7EC] bg-white px-4">
          <Ionicons
            name="search-outline"
            size={20}
            color="#667085"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search records"
            placeholderTextColor="#98A2B3"
            accessibilityLabel="Search medical records"
            returnKeyType="search"
            autoCapitalize="none"
            className="ml-3 h-14 flex-1 text-[15px] text-[#101828]"
          />

          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              className="p-2"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#98A2B3"
              />
            </Pressable>
          ) : null}
        </View>

        {/* Category filters */}
        <View className="mb-3">
          <Text className="text-sm font-bold text-[#344054]">
            Filter by category
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-7"
          contentContainerClassName="gap-2 pr-2"
        >
          {recordCategories.map((category) => {
            const active = selectedCategory === category;

            return (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`min-h-10 justify-center rounded-lg border px-4 ${
                  active
                    ? 'border-emerald-700 bg-emerald-700'
                    : 'border-[#E4E7EC] bg-white'
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    active ? 'text-white' : 'text-[#475467]'
                  }`}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Record count */}
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-[#101828]">
              Your records
            </Text>

            <Text className="mt-1 text-xs text-[#667085]">
              {isLoading
                ? 'Loading your saved health records...'
                : 'Browse your saved health documents'}
            </Text>
          </View>

          <View className="rounded-lg bg-[#EAECF0] px-2.5 py-1.5">
            <Text className="text-xs font-bold text-[#344054]">
              {filteredRecords.length}
            </Text>
          </View>
        </View>

        {/* Loading state */}
        {isLoading ? (
          <View className="items-center rounded-xl border border-[#E4E7EC] bg-white px-6 py-10">
            <ActivityIndicator size="large" color="#047857" />

            <Text className="mt-4 text-sm font-semibold text-[#344054]">
              Loading health records
            </Text>

            <Text className="mt-2 text-center text-xs leading-5 text-[#667085]">
              Please wait while your saved records are retrieved.
            </Text>
          </View>
        ) : null}

        {/* Storage error state */}
        {!isLoading && error ? (
          <View className="rounded-xl border border-red-200 bg-white p-5">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <Ionicons
                name="alert-circle-outline"
                size={23}
                color="#B42318"
              />
            </View>

            <Text className="mt-4 text-base font-bold text-[#101828]">
              Unable to load records
            </Text>

            <Text className="mt-2 text-sm leading-6 text-[#667085]">
              {error}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshRecords()}
              className="mt-5 self-start rounded-lg bg-emerald-700 px-4 py-3 active:bg-emerald-800"
            >
              <Text className="text-sm font-bold text-white">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Record list */}
        {!isLoading && !error ? (
          <View className="gap-3">
            {filteredRecords.map((record) => {
              const style = categoryStyles[record.category];

              return (
                <Pressable
                  key={record.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${record.title}, ${record.category}`}
                  onPress={() => openRecord(record.id)}
                  className="rounded-xl border border-[#E4E7EC] bg-white p-4 active:bg-[#F9FAFB]"
                >
                  <View className="flex-row items-start">
                    <View
                      className={`mr-3 h-11 w-11 items-center justify-center rounded-xl ${style.background}`}
                    >
                      <Ionicons
                        name={style.icon}
                        size={21}
                        color={style.iconColor}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15px] font-bold leading-5 text-[#101828]">
                        {record.title}
                      </Text>

                      <Text className="mt-1 text-[13px] leading-5 text-[#667085]">
                        {record.subtitle}
                      </Text>

                      <View className="mt-3 flex-row flex-wrap items-center gap-2">
                        <View
                          className={`rounded-md px-2 py-1 ${style.background}`}
                        >
                          <Text
                            className={`text-[11px] font-semibold ${style.foreground}`}
                          >
                            {record.category}
                          </Text>
                        </View>

                        <Text className="text-xs text-[#98A2B3]">
                          {record.date}
                        </Text>
                      </View>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#98A2B3"
                      style={{ marginLeft: 8, marginTop: 2 }}
                    />
                  </View>
                </Pressable>
              );
            })}

            {/* Empty state */}
            {filteredRecords.length === 0 ? (
              <View className="items-center rounded-xl border border-dashed border-[#D0D5DD] bg-white px-6 py-10">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F2F4F7]">
                  <Ionicons
                    name={
                      records.length === 0
                        ? 'folder-open-outline'
                        : 'search-outline'
                    }
                    size={22}
                    color="#667085"
                  />
                </View>

                <Text className="mt-4 text-base font-bold text-[#101828]">
                  {records.length === 0
                    ? 'Your library is empty'
                    : 'No records found'}
                </Text>

                <Text className="mt-2 text-center text-sm leading-5 text-[#667085]">
                  {records.length === 0
                    ? 'Start building your health library by adding your first record.'
                    : 'Try another search term or adjust your category filter.'}
                </Text>

                {records.length === 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={openAddRecord}
                    className="mt-5 flex-row items-center rounded-lg bg-emerald-700 px-4 py-3 active:bg-emerald-800"
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text className="ml-1 text-sm font-bold text-white">
                      Create first record
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={resetFilters}
                    className="mt-5 rounded-lg bg-emerald-700 px-4 py-3 active:bg-emerald-800"
                  >
                    <Text className="text-sm font-bold text-white">
                      Reset filters
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Storage disclosure */}
        <View className="mt-6 flex-row rounded-xl border border-[#E4E7EC] bg-[#F2F4F7] p-4">
          <Ionicons
            name="information-circle-outline"
            size={19}
            color="#475467"
          />

          <View className="ml-3 flex-1">
            <Text className="text-xs font-bold text-[#344054]">
              Local development storage
            </Text>

            <Text className="mt-1 text-xs leading-5 text-[#667085]">
              Records are stored locally on this device. Encrypted health-data
              storage, account synchronization, and document attachments are
              not yet implemented. Do not store sensitive medical information
              in this development build.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
