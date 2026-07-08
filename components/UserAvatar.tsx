import { AVATAR_PRESETS, presetIndex } from "@/lib/avatars";

/** 프로필 아바타 — 프리셋 그라데이션 / 구글 사진 / 기본값 모두 처리 */
export default function UserAvatar({
  image,
  size = 32,
}: {
  image: string | null | undefined;
  size?: number;
}) {
  const idx = presetIndex(image);
  if (idx !== null) {
    const [a, b] = AVATAR_PRESETS[idx];
    return (
      <div
        aria-hidden
        className="rounded-full shrink-0"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${a}, ${b})`,
        }}
      />
    );
  }
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className="rounded-full shrink-0 object-cover"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,#93c5fd,#6ee7b7)",
      }}
    />
  );
}
