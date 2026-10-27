import { useEffect, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppLock } from "@/context/AppLockContext";
import { resolveAttachmentAccessUrl } from "@/utils/attachmentAccessCache";

type Props = {
  recordId: string;
  attachmentId: string;
  uri?: string;
  className?: string;
  resizeMode?: "cover" | "contain";
  onError?: () => void;
};

export function RemoteAttachmentImage({
  recordId,
  attachmentId,
  uri,
  className,
  resizeMode = "cover",
  onError,
}: Props) {
  const { isLocked } = useAppLock();

  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Remove any previously resolved URL whenever this component
    // is locked or its attachment identity changes.
    setRemoteUrl(null);
    setFailed(false);

    if (isLocked || uri) {
      return;
    }

    let cancelled = false;

    resolveAttachmentAccessUrl(recordId, attachmentId)
      .then((url) => {
        if (!cancelled) {
          setRemoteUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          onError?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [recordId, attachmentId, uri, isLocked]);

  // Do not display either remote or local attachment images
  // while the vault is locked.
  const source = isLocked ? null : uri || remoteUrl;

  if (!source) {
    return (
      <View
        className={`items-center justify-center bg-[#F2F4F7] ${className ?? ""}`}
      >
        {failed && !isLocked ? (
          <Ionicons
            name="image-outline"
            size={28}
            color="#667085"
          />
        ) : (
          <ActivityIndicator
            size="small"
            color="#047857"
          />
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: source }}
      className={className}
      resizeMode={resizeMode}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}