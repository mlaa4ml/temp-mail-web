import { useCallback, useEffect, useState } from "react";
import { storage, type ThemePreference } from "@/utils/storage";

export type EffectiveTheme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: light)";

function getSystemTheme(): EffectiveTheme {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia(DARK_QUERY).matches ? "light" : "dark";
}

function applyTheme(theme: EffectiveTheme): void {
	document.documentElement.dataset.theme = theme;
}

/**
 * Управление темой оформления.
 *
 * Хранит явный выбор пользователя ("light" | "dark") в localStorage.
 * Если выбора нет — следует системной настройке `prefers-color-scheme`
 * и обновляется при её изменении.
 *
 * Возвращает:
 *  - `theme` — текущее применённое значение ("light" | "dark");
 *  - `toggle` — переключатель light ↔ dark.
 */
export function useTheme() {
	const [theme, setThemeState] = useState<EffectiveTheme>(() => {
		const saved = storage.getTheme();
		return saved ?? getSystemTheme();
	});

	// Применяем тему к <html> при каждом изменении
	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// Следим за системной темой, пока пользователь не сделал явный выбор
	useEffect(() => {
		if (storage.getTheme() !== null) return;
		const mql = window.matchMedia(DARK_QUERY);
		const handler = (e: MediaQueryListEvent) => {
			setThemeState(e.matches ? "light" : "dark");
		};
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	const setTheme = useCallback((next: ThemePreference) => {
		storage.setTheme(next);
		setThemeState(next);
	}, []);

	const toggle = useCallback(() => {
		setThemeState((prev) => {
			const next: ThemePreference = prev === "dark" ? "light" : "dark";
			storage.setTheme(next);
			return next;
		});
	}, []);

	return { theme, setTheme, toggle };
}