import { useCallback, useEffect, useRef, useState } from "react";
import { useDomains } from "@/hooks/useDomains";
import { storage } from "@/utils/storage";
import { generateRandomId } from "@/utils/random";
import { api } from "@/api/client";
import type { MailboxAvailability, UnavailabilityReason } from "@/api/types";
import { DomainSelect } from "./DomainSelect";
import { CopyButton } from "./CopyButton";

type Props = {
	onCreate: (email: string) => void;
};

type Mode = "random" | "custom";

type AvailabilityStatus =
	| { kind: "idle" }
	| { kind: "checking" }
	| { kind: "ok"; email: string }
	| { kind: "unavailable"; reason: UnavailabilityReason; message: string }
	| { kind: "error"; message: string };

const DEBOUNCE_MS = 400;

// Локальная синтаксическая проверка (зеркало серверной из temp-mail-on11/utils/validateEmailLogin.ts)
const LOGIN_REGEX = /^[a-z0-9._-]+$/;
const RESERVED = new Set(["on11"]);

function clientValidateLogin(raw: string): { ok: true } | { ok: false; message: string } {
	const v = raw.trim().toLowerCase();
	if (!v) return { ok: false, message: "Введите имя ящика." };
	if (v.length > 64) return { ok: false, message: "Слишком длинное имя (макс. 64)." };
	if (!LOGIN_REGEX.test(v)) {
		return { ok: false, message: "Только латиница, цифры, ., _, -." };
	}
	if (/^[.-]/.test(v) || /[.-]$/.test(v)) {
		return { ok: false, message: "Не может начинаться/заканчиваться на . или -." };
	}
	if (v.includes("..")) {
		return { ok: false, message: "Две точки подряд запрещены." };
	}
	if (RESERVED.has(v)) {
		return { ok: false, message: `Имя "${v}" зарезервировано.` };
	}
	return { ok: true };
}

export function MailboxSetup({ onCreate }: Props) {
	const { domains, loading, error } = useDomains();
	const [mode, setMode] = useState<Mode>("random");
	const [domain, setDomain] = useState<string>("");
	const [preview, setPreview] = useState<string | null>(null);
	const [login, setLogin] = useState<string>("");
	const [status, setStatus] = useState<AvailabilityStatus>({ kind: "idle" });

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

	// === Случайный режим ===
	const handleCreateRandom = () => {
		if (!domain) return;
		const newLogin = generateRandomId(10);
		const email = `${newLogin}@${domain}`;
		storage.setLastMailbox(email);
		onCreate(email);
	};

	// === Custom-режим: проверка доступности с дебаунсом ===
	const checkRef = useRef<{ controller: AbortController; timer: number | null } | null>(null);

	const runAvailabilityCheck = useCallback(
		(loginValue: string, domainValue: string) => {
			// Отменяем предыдущий запрос/таймер
			if (checkRef.current) {
				if (checkRef.current.timer !== null) {
					window.clearTimeout(checkRef.current.timer);
				}
				checkRef.current.controller.abort();
			}

			const controller = new AbortController();
			const ref = { controller, timer: null as number | null };
			checkRef.current = ref;

			const run = async () => {
				setStatus({ kind: "checking" });
				try {
					const result: MailboxAvailability = await api.checkMailboxAvailability(
						loginValue,
						domainValue,
						{ signal: controller.signal },
					);
					if (controller.signal.aborted) return;
					if (result.available) {
						setStatus({ kind: "ok", email: result.email ?? `${loginValue}@${domainValue}` });
					} else {
						setStatus({
							kind: "unavailable",
							reason: result.reason ?? "invalid_login",
							message: result.message ?? "Имя недоступно.",
						});
					}
				} catch (e) {
					if (controller.signal.aborted) return;
					const msg = e instanceof Error ? e.message : "Ошибка проверки";
					setStatus({ kind: "error", message: msg });
				}
			};

			ref.timer = window.setTimeout(run, DEBOUNCE_MS);
		},
		[],
	);

	const handleLoginChange = (raw: string) => {
		setLogin(raw);
		const trimmed = raw.trim().toLowerCase();
		if (!trimmed) {
			setStatus({ kind: "idle" });
			return;
		}
		// Сначала локальная синтаксическая проверка (быстрый отклик)
		const local = clientValidateLogin(raw);
		if (!local.ok) {
			setStatus({ kind: "unavailable", reason: "invalid_login", message: local.message });
			return;
		}
		if (!domain) {
			// Домен ещё не выбран — отложим проверку
			setStatus({ kind: "idle" });
			return;
		}
		runAvailabilityCheck(trimmed, domain);
	};

	const handleDomainChange = (newDomain: string) => {
		setDomain(newDomain);
		if (mode === "custom" && login.trim()) {
			runAvailabilityCheck(login.trim().toLowerCase(), newDomain);
		}
	};

	const handleModeChange = (newMode: Mode) => {
		setMode(newMode);
		setStatus({ kind: "idle" });
	};

	const handleCreateCustom = () => {
		if (status.kind !== "ok") return;
		const email = status.email;
		storage.setLastMailbox(email);
		onCreate(email);
	};

	const handleSuggestLogin = () => {
		const suggested = generateRandomId(10);
		setLogin(suggested);
		if (domain) {
			runAvailabilityCheck(suggested, domain);
		}
	};

	const handleOpenExisting = () => {
		if (preview) onCreate(preview);
	};

	const isCustomValid = status.kind === "ok";

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
					{/* Переключатель режима */}
					<div className="mode-switch" role="tablist" aria-label="Режим создания ящика">
						<button
							type="button"
							role="tab"
							aria-selected={mode === "random"}
							className={`mode-switch-btn ${mode === "random" ? "active" : ""}`}
							onClick={() => handleModeChange("random")}
						>
							🎲 Случайный
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={mode === "custom"}
							className={`mode-switch-btn ${mode === "custom" ? "active" : ""}`}
							onClick={() => handleModeChange("custom")}
						>
							✍️ Свой логин
						</button>
					</div>

					{/* Выбор домена */}
					<label className="setup-label" htmlFor="domain-select">Домен:</label>
					<DomainSelect
						id="domain-select"
						domains={domains}
						value={domain}
						onChange={handleDomainChange}
					/>

					{mode === "random" && (
						<button
							type="button"
							className="btn btn-primary btn-large"
							onClick={handleCreateRandom}
							disabled={!domain}
						>
							Создать новый ящик
						</button>
					)}

					{mode === "custom" && (
						<>
							<label className="setup-label" htmlFor="custom-login">
								Имя ящика (до @):
							</label>
							<div className="input-with-suffix">
								<input
									id="custom-login"
									type="text"
									className="text-input"
									placeholder="например, ivan.petrov"
									value={login}
									onChange={(e) => handleLoginChange(e.target.value)}
									autoComplete="off"
									spellCheck={false}
									maxLength={64}
									disabled={!domain}
								/>
								<span className="input-suffix">@{domain}</span>
								<button
									type="button"
									className="btn btn-ghost input-suffix-btn"
									onClick={handleSuggestLogin}
									disabled={!domain}
									title="Сгенерировать предложение"
									aria-label="Сгенерировать случайный логин"
								>
									🎲
								</button>
							</div>

							<AvailabilityView status={status} domain={domain} />

							<button
								type="button"
								className="btn btn-primary btn-large"
								onClick={handleCreateCustom}
								disabled={!isCustomValid}
							>
								Создать ящик
							</button>
						</>
					)}
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

function AvailabilityView({
	status,
	domain,
}: {
	status: AvailabilityStatus;
	domain: string;
}) {
	if (status.kind === "idle") {
		return (
			<div className="availability availability--idle">
				Введите имя — мы проверим, свободно ли оно.
			</div>
		);
	}
	if (status.kind === "checking") {
		return <div className="availability availability--checking">Проверяем…</div>;
	}
	if (status.kind === "ok") {
		return (
			<div className="availability availability--ok">
				✓ Свободно: <strong>{status.email || `${domain}`}</strong>
			</div>
		);
	}
	if (status.kind === "unavailable") {
		return <div className="availability availability--bad">⚠ {status.message}</div>;
	}
	return <div className="availability availability--bad">⚠ {status.message}</div>;
}