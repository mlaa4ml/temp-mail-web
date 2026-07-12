import type {
	ApiErrorBody,
	AttachmentSummary,
	DeleteAllResult,
	DeleteOneResult,
	Email,
	EmailCount,
	EmailSummary,
	MailboxAvailability,
} from "./types";

/**
 * Базовый URL API. По умолчанию — публичный API temp-mail-on11.
 * Можно переопределить через переменную окружения VITE_API_BASE_URL на этапе сборки.
 */
const BASE_URL: string =
	import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "https://api.on11.ru";

/**
 * Ошибка с HTTP-статусом и телом ответа API.
 */
export class ApiError extends Error {
	readonly status: number;
	readonly body?: ApiErrorBody | unknown;
	readonly isLeased: boolean;

	constructor(status: number, message: string, body?: unknown) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
		// Признак арендованного через Telegram ящика (см. checkMailboxLease в temp-mail-on11)
		this.isLeased = status === 403;
	}
}

type Envelope<T> = { success: true; result: T };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${BASE_URL}${path}`, {
			...init,
			headers: {
				Accept: "application/json",
				...init?.headers,
			},
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : "Network error";
		throw new ApiError(0, `Сетевая ошибка: ${message}`);
	}

	let body: Envelope<T> | ApiErrorBody | null = null;
	try {
		body = (await response.json()) as Envelope<T> | ApiErrorBody;
	} catch {
		body = null;
	}

	if (!response.ok || (body && body.success === false)) {
		const errBody = body && body.success === false ? body : null;
		const message =
			errBody?.error?.message ?? `HTTP ${response.status} ${response.statusText}`;
		throw new ApiError(response.status, message, body);
	}

	// Для DELETE-ответов с { success: true, result: {...} }
	if (body && body.success === true) {
		return body.result;
	}

	// Фоллбэк: вернуть весь JSON, если формат неожиданный
	return body as unknown as T;
}

export const api = {
	baseUrl: BASE_URL,

	getDomains(): Promise<string[]> {
		return request<string[]>("/domains");
	},

	/**
	 * Проверяет доступность custom-логина для указанного домена.
	 * Используется на экране создания ящика, чтобы отсекать занятые/недопустимые имена.
	 */
	checkMailboxAvailability(
		login: string,
		domain: string,
		init?: RequestInit,
	): Promise<MailboxAvailability> {
		const q = new URLSearchParams({ login, domain });
		return request<MailboxAvailability>(`/mailbox/availability?${q.toString()}`, init);
	},

	getEmails(
		emailAddress: string,
		limit = 50,
		offset = 0,
		init?: RequestInit,
	): Promise<EmailSummary[]> {
		const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
		return request<EmailSummary[]>(
			`/emails/${encodeURIComponent(emailAddress)}?${q.toString()}`,
			init,
		);
	},

	getEmailCount(emailAddress: string): Promise<EmailCount> {
		return request<EmailCount>(`/emails/count/${encodeURIComponent(emailAddress)}`);
	},

	getEmail(emailId: string): Promise<Email> {
		return request<Email>(`/inbox/${encodeURIComponent(emailId)}`);
	},

	getEmailAttachments(emailId: string): Promise<AttachmentSummary[]> {
		return request<AttachmentSummary[]>(`/inbox/${encodeURIComponent(emailId)}/attachments`);
	},

	deleteAllEmails(emailAddress: string): Promise<DeleteAllResult> {
		return request<DeleteAllResult>(`/emails/${encodeURIComponent(emailAddress)}`, {
			method: "DELETE",
		});
	},

	deleteEmail(emailId: string): Promise<DeleteOneResult> {
		return request<DeleteOneResult>(`/inbox/${encodeURIComponent(emailId)}`, {
			method: "DELETE",
		});
	},

	/**
	 * Возвращает прямой URL для скачивания вложения (используется в <a download>).
	 * Не выполняет fetch, чтобы не блокировать UI.
	 */
	attachmentUrl(attachmentId: string): string {
		return `${BASE_URL}/attachments/${encodeURIComponent(attachmentId)}`;
	},
};