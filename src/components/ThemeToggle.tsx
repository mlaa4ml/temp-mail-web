import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
	const { theme, toggle } = useTheme();
	const isDark = theme === "dark";
	const label = isDark ? "Светлая тема" : "Тёмная тема";
	return (
		<button
			type="button"
			className="btn btn-ghost theme-toggle"
			onClick={toggle}
			aria-label={label}
			title={label}
			aria-pressed={isDark}
		>
			<span aria-hidden="true">{isDark ? "☀" : "🌙"}</span>
		</button>
	);
}