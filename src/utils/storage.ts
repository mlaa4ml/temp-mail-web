/**
 * Тонкая обёртка над localStorage с защитой от ошибок
 * (например, в Safari Private Mode или при заполненной квоте).
 */

const PREFIX = "temp-mail-web:";

function safeGet<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(PREFIX + key);
		if (raw === null) return null;
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function safeSet<T>(key: string, value: T): void {
	try {
		localStorage.setItem(PREFIX + key, JSON.stringify(value));
	} catch {
		// Игнорируем — просто не сохранится
	}
}

function safeRemove(key: string): void {
	try {
		localStorage.removeItem(PREFIX + key);
	} catch {
		// noop
	}
}

export type ThemePreference = "light" | "dark";

export const storage = {
	getLastMailbox(): string | null {
		return safeGet<string>("last-mailbox");
	},
	setLastMailbox(email: string): void {
		safeSet("last-mailbox", email);
	},
	clearLastMailbox(): void {
		safeRemove("last-mailbox");
	},

	getTheme(): ThemePreference | null {
		const v = safeGet<ThemePreference>("theme");
		return v === "light" || v === "dark" ? v : null;
	},
	setTheme(theme: ThemePreference): void {
		safeSet("theme", theme);
	},
};
