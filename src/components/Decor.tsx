// Вырезанные декор-наклейки (PNG без фона от пользователя → public/decor/*.webp)
export function Decor({ name, className = "", reveal = "drop" }: { name: string; className?: string; reveal?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}decor/${name}.webp`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`decor ${className}`}
      data-reveal={reveal}
    />
  );
}
