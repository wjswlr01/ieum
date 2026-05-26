"use client";

const BREW_TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "전체" },
  { value: "MAKGEOLLI", label: "막걸리" },
  { value: "CHEONGJU", label: "청주" },
  { value: "SOJU", label: "증류주" },
  { value: "FRUIT_WINE", label: "과실주" },
  { value: "BEER", label: "맥주" },
];

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function BrewTypeFilter({ value, onChange }: Props) {
  const isAllActive = value.length === 0;

  function toggle(type: string) {
    if (type === "") {
      onChange([]);
      return;
    }
    if (value.includes(type)) {
      onChange(value.filter((v) => v !== type));
    } else {
      onChange([...value, type]);
    }
  }

  return (
    <>
      {BREW_TYPES.map((item) => {
        const isActive = item.value === "" ? isAllActive : value.includes(item.value);
        return (
          <button
            key={item.value || "all"}
            type="button"
            onClick={() => toggle(item.value)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-brew-text text-brew-text-light"
                : "border border-brew-border bg-white text-brew-text hover:bg-brew-surface-dark"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </>
  );
}
