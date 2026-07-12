import { useEffect, useState } from "react";
import { useDomains } from "@/hooks/useDomains";
import { storage } from "@/utils/storage";
import { generateRandomId } from "@/utils/random";
import { DomainSelect } from "./DomainSelect";
import { CopyButton } from "./CopyButton";

type Props = {
	onCreate: (email: string) => void;
};

export function MailboxSetup({ onCreate }: Props) {
	const { domains, loading, error } = useDomains();
	const [domain, setDomain] = useState<string>("");
	const [preview, setPreview] = useState<string | null>(null);

	// Восстанавливаем последний ящик при загрузке
	useEffect(() => {
		const last = storage.getLastMailbox();
		if (last && last.includes("@")) {
			setPreview(last);
		}
	}, []);

	// Когда домены загрузились — выбираем первый
	useEffect(() => {
		if (domains.length > 0 && !domain) {
			setDomain(domains[0]);
		}
	}, [domains, domain]);

	const handleCreate = () => {
		if (!domain) return;
		const login = generateRandomId(10);
		const email = `${login}@${domain}`;
		storage.setLastMailbox(email);
		onCreate(email);
	};

	const handleOpenExisting = () => {
		if (preview) onCreate(preview);
	};

	return (
		<div className="setup">
			<h1 className="setup-title">Temp Mail</h1>
			<p className="setup-subtitle">
				Бесплатный одноразовый email. Без регистрации.
			</p>

			{loading && <div className="state">Загружаем доступные домены…</div>}

			{error && (
				<div className="state state-error">
					Не удалось получить список доменов: {error}
				</div>
			)}

			{!loading && !error && domains.length > 0 && (
				<div className="setup-card">
					<label className="setup-label" htmlFor="domain-select">Выберите домен:</label>
					<DomainSelect
						id="domain-select"
						domains={domains}
						value={domain}
						onChange={setDomain}
					/>
					<button
						type="button"
						className="btn btn-primary btn-large"
						onClick={handleCreate}
						disabled={!domain}
					>
						Создать новый ящик
					</button>
				</div>
			)}

			{preview && (
				<div className="setup-recent">
					<div className="setup-recent-label">Последний использованный:</div>
					<div className="inbox-address-row">
						<code className="address">{preview}</code>
						<button type="button" className="btn btn-secondary" onClick={handleOpenExisting}>
							Открыть
						</button>
						<CopyButton value={preview} />
					</div>
				</div>
			)}

			<footer className="setup-footer">
				Письма хранятся 3 часа. Исходный код сервиса:{" "}
				<a
					href="https://github.com/EmailTempMailWorker/temp-mail-on11"
					target="_blank"
					rel="noopener noreferrer"
				>
					temp-mail-on11
				</a>
			</footer>
		</div>
	);
}