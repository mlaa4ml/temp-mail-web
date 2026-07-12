/**
 * Форматирование Unix-timestamp (секунды) в человекочитаемую дату.
 */

const MONTHS = [
	"янв",
	"фев",
	"мар",
	"апр",
	"мая",
	"июн",
	"июл",
	"авг",
	"сен",
	"окт",
	"ноя",
	"дек",
];

function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

export function formatTime(timestamp: number): string {
	const d = new Date(timestamp * 1000);
	return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDate(timestamp: number): string {
	const d = new Date(timestamp * 1000);
	const now = new Date();
	const sameDay =
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate();
	if (sameDay) return formatTime(timestamp);
	return `${d.getDate()} ${MONTHS[d.getMonth()]} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} Б`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}