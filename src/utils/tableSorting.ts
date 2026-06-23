export type SortDirection = "asc" | "desc";

export type SortState<Key extends string> = {
  key: Key | null;
  direction: SortDirection;
};

export function cycleSort<Key extends string>(
  current: SortState<Key>,
  key: Key
): SortState<Key> {
  if (current.key !== key) {
    return { key, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { key, direction: "desc" };
  }

  return { key: null, direction: "asc" };
}

export function getSortIndicator<Key extends string>(
  current: SortState<Key>,
  key: Key
) {
  if (current.key !== key) return "↕";
  return current.direction === "asc" ? "↑" : "↓";
}

export function getSortLabel<Key extends string>(
  current: SortState<Key>,
  key: Key,
  label: string
) {
  if (current.key !== key) {
    return `Ordenar ${label} em ordem crescente`;
  }

  return current.direction === "asc"
    ? `Ordenar ${label} em ordem decrescente`
    : `Voltar ${label} para a ordem padrão`;
}

export function compareText(left?: string | null, right?: string | null) {
  return String(left ?? "").localeCompare(String(right ?? ""), "pt-BR", {
    sensitivity: "base",
  });
}

export function compareNumber(left?: number | null, right?: number | null) {
  return Number(left ?? 0) - Number(right ?? 0);
}

export function compareDate(left?: string | null, right?: string | null) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return leftTime - rightTime;
}

export function applyDirection(value: number, direction: SortDirection) {
  return direction === "asc" ? value : value * -1;
}
