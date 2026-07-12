import { useInbox } from "@/hooks/useInbox";
import type { EmailSummary } from "@/api/types";
import { formatDate } from "@/utils/time";
import { CopyButton } from "./CopyButton";

type Props = {
	email: string;
	onOpenEmail: (id: string) => void;
	onChangeMailbox: () => void;
	/**
	 * Вызывается один раз при первом 403 на ящике (арендован через Telegram
	 * или имя занято другим ящиком). Используется для возврата на экран
	 * создания ящика с сообщением «имя занято».
	 */
	onLeased?: () => void;
};

export function InboxList({ email, onOpenEmail, onChangeMailbox, onLeased }: Props) {
	const { emails, loading, refreshing, error, leased, lastFetchedAt, refresh } = useInbox(
		email,
		true,
		onLeased,
	);

	return (
		<div className="inbox">
			<header className="inbox-header">
				<div className="inbox-address">
					<div className="inbox-address-label">Ваш временный ящик</div>
					<div className="inbox-address-row">
						<code className="address">{email}</code>
						<CopyButton value={email} />
						<button
							type="button"
							className="btn btn-ghost"
							onClick={onChangeMailbox}
							title="Создать новый ящик"
						>
							↻ Сменить
						</button>
					</div>
				</div>
				<div className="inbox-actions">
					<button
						type="button"
						className="btn btn-ghost"
						onClick={refresh}
						disabled={refreshing}
					>
						{refreshing ? "Загрузка…" : "⟳ Обновить"}
					</button>
					<DeleteAllButton email={email} disabled={emails.length === 0} />
				</div>
			</header>

			{loading && <div className="state">Загружаем письма…</div>}

			{leased && (
				<div className="state state-error">
					Этот ящик арендован через Telegram-бота и недоступен через веб-интерфейс.
					<br />
					Создайте новый ящик или обратитесь к @TempMail_on11_bot.
				</div>
			)}

			{error && !leased && (
				<div className="state state-error">
					Ошибка: {error}
					<button type="button" className="btn btn-ghost" onClick={refresh}>
						Повторить
					</button>
				</div>
			)}

			{!loading && !error && !leased && emails.length === 0 && (
				<div className="state">
					Писем пока нет. Ожидайте входящие — обновление автоматически каждые 5 секунд.
				</div>
			)}

			{emails.length > 0 && (
				<ul className="email-list">
					{emails.map((m) => (
						<EmailRow key={m.id} email={m} onClick={() => onOpenEmail(m.id)} />
					))}
				</ul>
			)}

			{lastFetchedAt && (
				<div className="inbox-footer">
					Обновлено: {new Date(lastFetchedAt).toLocaleTimeString("ru-RU")}
				</div>
			)}
		</div>
	);
}

function EmailRow({ email, onClick }: { email: EmailSummary; onClick: () => void }) {
	return (
		<li className="email-row" onClick={onClick} role="button" tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
		>
			<div className="email-row-main">
				<div className="email-row-from">{email.from_address}</div>
				<div className="email-row-subject">{email.subject || "(без темы)"}</div>
			</div>
			<div className="email-row-meta">
				{email.has_attachments && (
					<span className="badge" title={`${email.attachment_count} вложений`}>
						📎 {email.attachment_count}
					</span>
				)}
				<span className="email-row-time">{formatDate(email.received_at)}</span>
			</div>
		</li>
	);
}

function DeleteAllButton({ email, disabled }: { email: string; disabled: boolean }) {
	const handleDelete = async () => {
		if (disabled) return;
		const ok = window.confirm("Удалить все письма в этом ящике?");
		if (!ok) return;
		try {
			const { api } = await import("@/api/client");
			const { showToast } = await import("./Toast");
			const result = await api.deleteAllEmails(email);
			showToast(`Удалено писем: ${result.deleted_count}`, "success");
		} catch (e) {
			const { showToast } = await import("./Toast");
			const msg = e instanceof Error ? e.message : "Ошибка удаления";
			showToast(msg, "error");
		}
	};
	return (
		<button
			type="button"
			className="btn btn-danger"
			onClick={handleDelete}
			disabled={disabled}
		>
			🗑 Очистить
		</button>
	);
}