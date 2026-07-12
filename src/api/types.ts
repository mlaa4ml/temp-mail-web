/**
 * Типы данных, повторяющие Zod-схемы из temp-mail-on11/src/schemas.
 * Дублируем вручную, чтобы не тянуть серверные пакеты в клиент.
 */

export type EmailSummary = {
	id: string;
	from_address: string;
	to_address: string;
	subject: string | null;
	received_at: number;
	has_attachments: boolean;
	attachment_count: number;
};

export type Email = EmailSummary & {
	html_content: string | null;
	text_content: string | null;
};

export type AttachmentSummary = {
	id: string;
	filename: string;
	content_type: string;
	size: number;
	created_at: number;
};

export type EmailCount = {
	count: number;
};

export type DeleteAllResult = {
	message: string;
	deleted_count: number;
};

export type DeleteOneResult = {
	message: string;
};

/**
 * Структура ошибки, возвращаемой API.
 */
export type ApiErrorBody = {
	success: false;
	error: { name: string; message: string };
	note?: Record<string, unknown>;
};