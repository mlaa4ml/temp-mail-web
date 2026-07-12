import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/api/client";
import type { AttachmentSummary, Email } from "@/api/types";
import { formatDate, formatSize } from "@/utils/time";
import { showToast } from "./Toast";

type Props = {
	emailId: string;
	onBack: () => void;
};

type Mode = "html" | "text";

export function EmailView({ emailId, onBack }: Props) {
	const [email, setEmail] = useState<Email | null>(null);
	const [attachments, setAttachments] = useState<AttachmentSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<Mode>("html");

	useEffect(() => {
		let aborted = false;
		setLoading(true);
		setError(null);
		Promise.all([api.getEmail(emailId), api.getEmailAttachments(emailId).catch(() => [])])
			.then(([em, atts]) => {
				if (aborted) return;
				setEmail(em);
				setAttachments(atts);
				// Если HTML пустой — сразу переключаем на текст
				if (!em.html_content && em.text_content) setMode("text");
			})
			.catch((e) => {
				if (aborted) return;
				const msg = e instanceof Error ? e.message : "Ошибка загрузки";
				setError(e instanceof ApiError && e.isLeased
					? "Этот ящик арендован через Telegram-бота"
					: msg);
			})
			.finally(() => {
				if (!aborted) setLoading(false);
			});
		return () => {
			aborted = true;
		};
	}, [emailId]);

	const handleDelete = useCallback(async () => {
		if (!email) return;
		const ok = window.confirm("Удалить это письмо?");
		if (!ok) return;
		try {
			await api.deleteEmail(email.id);
			showToast("Письмо удалено", "success");
			onBack();
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Ошибка удаления";
			showToast(msg, "error");
		}
	}, [email, onBack]);

	if (loading) {
		return (
			<div className="email-view">
				<button type="button" className="btn btn-ghost" onClick={onBack}>← Назад</button>
				<div className="state">Загружаем письмо…</div>
			</div>
		);
	}

	if (error || !email) {
		return (
			<div className="email-view">
				<button type="button" className="btn btn-ghost" onClick={onBack}>← Назад</button>
				<div className="state state-error">{error ?? "Письмо не найдено"}</div>
			</div>
		);
	}

	const hasHtml = !!email.html_content;
	const hasText = !!email.text_content;

	return (
		<div className="email-view">
			<div className="email-view-toolbar">
				<button type="button" className="btn btn-ghost" onClick={onBack}>← К списку</button>
				<button type="button" className="btn btn-danger" onClick={handleDelete}>
					🗑 Удалить письмо
				</button>
			</div>

			<article className="email-card">
				<header className="email-card-head">
					<h2 className="email-subject">{email.subject || "(без темы)"}</h2>
					<div className="email-meta">
						<div>
							<span className="email-meta-label">От:</span> {email.from_address}
						</div>
						<div>
							<span className="email-meta-label">Кому:</span> {email.to_address}
						</div>
						<div>
							<span className="email-meta-label">Получено:</span>{" "}
							{formatDate(email.received_at)}
						</div>
					</div>
				</header>

				{(hasHtml || hasText) && (
					<div className="email-modes" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={mode === "html"}
							className={`mode-btn ${mode === "html" ? "active" : ""}`}
							onClick={() => setMode("html")}
							disabled={!hasHtml}
						>
							HTML
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={mode === "text"}
							className={`mode-btn ${mode === "text" ? "active" : ""}`}
							onClick={() => setMode("text")}
							disabled={!hasText}
						>
							Текст
						</button>
					</div>
				)}

				<div className="email-body">
					{mode === "html" && hasHtml ? (
						<iframe
							title="email-html"
							className="email-iframe"
							srcDoc={email.html_content ?? ""}
							sandbox=""
						/>
					) : hasText ? (
						<pre className="email-text">{email.text_content}</pre>
					) : (
						<div className="state">Письмо пустое.</div>
					)}
				</div>

				{attachments.length > 0 && (
					<section className="email-attachments">
						<h3>Вложения ({attachments.length})</h3>
						<ul className="attachment-list">
							{attachments.map((a) => (
								<li key={a.id} className="attachment-item">
									<a
										className="attachment-link"
										href={api.attachmentUrl(a.id)}
										download={a.filename}
										target="_blank"
										rel="noopener noreferrer"
									>
										📎 {a.filename}
									</a>
									<span className="attachment-meta">
										{a.content_type} · {formatSize(a.size)}
									</span>
								</li>
							))}
						</ul>
					</section>
				)}
			</article>
		</div>
	);
}