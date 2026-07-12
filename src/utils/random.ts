/**
 * Генерация случайного логина для временного ящика.
 * Используем Web Crypto, если доступен, иначе Math.random как фоллбэк.
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateRandomId(length = 10): string {
	const bytes = new Uint8Array(length);
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
	}
	let out = "";
	for (let i = 0; i < length; i++) {
		out += ALPHABET[bytes[i] % ALPHABET.length];
	}
	return out;
}