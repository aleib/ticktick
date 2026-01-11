import type { Category, Task } from "@ticktick/shared";

export const DEFAULT_PRIMARY_COLOR = "hsl(var(--primary))";

export const getTaskAccentColor = (
  task: Task | null | undefined,
  categories?: Category[]
): string => {
  if (task?.color) {
    return task.color;
  }

  if (task?.category && categories?.length) {
    const match = categories.find((category) => category.name === task.category);
    if (match?.color) {
      return match.color;
    }
  }

  return DEFAULT_PRIMARY_COLOR;
};


