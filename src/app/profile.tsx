
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  Pressable,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";

const settingsSections = [
  {
    title: "Security",
    description: "Control how you access your health vault.",
    items: [
      {
        id: "biometrics",
        icon: "finger-print",
        title: "Biometric unlock",
        subtitle: "Fingerprint or device biometrics",
        message:
          "Biometric authentication will be implemented in the device-security phase.",
      },
      {
        id: "app-lock",
        icon: "lock-closed-outline",
        title: "App lock",
        subtitle: "Protect access to your vault",
        message:
          "App-lock controls will be implemented alongside device security.",
      },
    ],
  },
  {
    title: "Privacy",
    description: "Manage your information and permissions.",
    items: [
      {
        id: "permissions",
        icon: "shield-checkmark-outline",
        title: "Device permissions",
        subtitle: "Camera, microphone and file access",
        message:
          "Device permissions are requested when their corresponding features need them.",
      },
      {
        id: "sharing",
        icon: "share-social-outline",
        title: "Record sharing",
        subtitle: "Manage access to your health records",
        message:
          "Record sharing will be designed with explicit access controls in a later phase.",
      },
    ],
  },
  {
    title: "App preferences",
    description: "Personalize your MediVault experience.",
    items: [
      {
        id: "notifications",
        icon: "notifications-outline",
        title: "Notifications",
        subtitle: "Health reminders and updates",
        message:
          "Notification preferences will become functional when notifications are implemented.",
      },
    ],
  },
] as const;

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export default function ProfileScreen() {
  const [notice, setNotice] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out of MediVault?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            void performLogout();
          },
        },
      ],
    );
  }

  async function performLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace("/login");
    } catch {
      Alert.alert(
        "Sign-out failed",
        "Your session could not be cleared. Please try again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  const displayName = user?.name?.trim() || "MediVault user";
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "M";

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-12"
      >
        <View className="w-full self-center px-5 pb-8 pt-5 md:max-w-3xl">
          {/* Page introduction */}
          <View className="flex-row items-start">
            <View className="mr-3 mt-1 h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100">
              <Ionicons
                name="settings-outline"
                size={23}
                color="#047857"
              />
            </View>

            <View className="flex-1">
              <Text className="text-3xl font-extrabold tracking-tight text-[#101828]">
                Profile & Settings
              </Text>

              <Text className="mt-2 text-sm leading-5 text-[#667085]">
                Manage your preferences and how you protect your health
                information.
              </Text>
            </View>
          </View>

          {/* Authenticated profile */}
          <View className="mt-6 flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <View className="mr-4 h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Text className="text-lg font-extrabold text-emerald-800">
                {initials}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-base font-extrabold text-[#101828]">
                {displayName}
              </Text>

              <Text className="mt-1 text-sm text-[#667085]">
                {user?.email || "Email unavailable"}
              </Text>

              <View className="mt-2 flex-row items-center self-start rounded-full bg-emerald-50 px-2.5 py-1">
                <Ionicons
                  name="checkmark-circle"
                  size={13}
                  color="#047857"
                />

                <Text className="ml-1 text-xs font-semibold text-emerald-700">
                  Signed in
                </Text>
              </View>
            </View>

            <Ionicons
              name="person-circle-outline"
              size={24}
              color="#98A2B3"
            />
          </View>

          {/* Account actions */}
          <View className="mt-4 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out of MediVault"
              disabled={isLoggingOut}
              onPress={() => void handleLogout()}
              className="flex-row items-center p-4 active:bg-[#F8FAFC]"
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color="#B42318"
                />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-bold text-[#B42318]">
                  Sign out
                </Text>

                <Text className="mt-1 text-xs leading-[18px] text-[#667085]">
                  End your current MediVault session.
                </Text>
              </View>

              {isLoggingOut ? (
                <ActivityIndicator color="#B42318" />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color="#98A2B3"
                />
              )}
            </Pressable>
          </View>

          {/* Appearance */}
          <View className="mt-8">
            <Text className="text-xl font-bold text-[#101828]">
              Appearance
            </Text>

            <Text className="mt-1 text-sm leading-5 text-[#667085]">
              MediVault currently uses its default light theme. App-wide
              theme preferences will be introduced with theme management.
            </Text>

            <View className="mt-4 flex-row items-center rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-white">
                <Ionicons
                  name="sunny-outline"
                  size={23}
                  color="#047857"
                />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-bold text-emerald-900">
                  Light appearance
                </Text>

                <Text className="mt-1 text-xs leading-[18px] text-emerald-800">
                  Default appearance
                </Text>
              </View>

              <View className="h-6 w-6 items-center justify-center rounded-full border-2 border-emerald-600">
                <View className="h-3 w-3 rounded-full bg-emerald-600" />
              </View>
            </View>
          </View>

          {/* Settings sections */}
          {settingsSections.map((section) => (
            <View key={section.title} className="mt-8">
              <Text className="text-xl font-bold text-[#101828]">
                {section.title}
              </Text>

              <Text className="mt-1 text-sm leading-5 text-[#667085]">
                {section.description}
              </Text>

              <View className="mt-4 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                {section.items.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 ? (
                      <View className="ml-[60px] h-px bg-[#F1F5F9]" />
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title}. ${item.subtitle}`}
                      onPress={() => setNotice(item.message)}
                      className="flex-row items-center p-4 active:bg-[#F8FAFC]"
                    >
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                        <Ionicons
                          name={item.icon as IoniconName}
                          size={21}
                          color="#047857"
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="text-sm font-bold text-[#101828]">
                          {item.title}
                        </Text>

                        <Text className="mt-1 text-xs leading-[18px] text-[#667085]">
                          {item.subtitle}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={19}
                        color="#98A2B3"
                        style={{ marginLeft: 8 }}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* About */}
          <View className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color="#047857"
                />
              </View>

              <View className="flex-1">
                <Text className="text-base font-extrabold text-[#101828]">
                  About MediVault
                </Text>

                <Text className="mt-1 text-xs text-[#667085]">
                  Personal health record management
                </Text>
              </View>
            </View>

            <Text className="mt-3 text-sm leading-5 text-[#667085]">
              Your personal space for organizing health records,
              prescriptions, laboratory results and medical documents.
            </Text>

            <View className="mt-4 flex-row items-center border-t border-[#F1F5F9] pt-3">
              <Ionicons
                name="code-slash-outline"
                size={15}
                color="#98A2B3"
              />

              <Text className="ml-2 flex-1 text-xs leading-5 text-[#98A2B3]">
                Development version · Authentication enabled
              </Text>
            </View>
          </View>

          {/* Feedback notice */}
          {notice ? (
            <View
              accessibilityLiveRegion="polite"
              className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <View className="flex-row items-start">
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color="#047857"
                  style={{ marginRight: 8, marginTop: 1 }}
                />

                <Text className="flex-1 text-sm leading-[21px] text-emerald-900">
                  {notice}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setNotice("")}
                className="mt-3 self-start flex-row items-center rounded-md py-1 active:opacity-60"
              >
                <Text className="text-sm font-extrabold text-emerald-800">
                  Dismiss
                </Text>

                <Ionicons
                  name="close"
                  size={16}
                  color="#065F46"
                  style={{ marginLeft: 4 }}
                />
              </Pressable>
            </View>
          ) : null}

          {/* Security reminder */}
          <View className="mt-6 flex-row items-start px-1">
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color="#98A2B3"
              style={{ marginRight: 7, marginTop: 2 }}
            />

            <Text className="flex-1 text-xs leading-5 text-[#98A2B3]">
              Keep your sign-in credentials private. Biometric unlock
              and additional app-lock controls are planned for a later phase.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
