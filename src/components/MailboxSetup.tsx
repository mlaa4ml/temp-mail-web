import { useEffect, useRef, useState } from "react";
import { useDomains } from "@/hooks/useDomains";
import { storage } from "@/utils/storage";
import { generateRandomId } from "@/utils/random";
// import { api } from "@/api/client"; // см. DISABLED-блок ниже
import { DomainSelect } from "./DomainSelect";
import { CopyButton } from "./CopyButton";

type Props = {
	onCreate: (email: string) => void;
	/**
	 * Сообщение об ошибке, которое нужно показать на экране создания ящика
	 * (например, «имя занято» после 403). После первого показа App сбрасывает
	 * его через `onErrorShown`.
	 */
	errorMessage?: string | null;
	/**
	 * Логин, который нужно подставить в поле ввода при возврате с ошибкой.
	 */
	initialLogin?: string | null;
	/**
	 * Колбэк, который MailboxSetup дёргает, когда сообщение об ошибке
	 * отображено (чтобы App мог его сбросить).
	 */
	onErrorShown?: () => void;
};

type Mode = "random" | "custom";

// Локальная синтаксическая проверка (зеркало серверной из temp-mail-on11/utils/validateEmailLogin.ts).
// Используется только для мгновенной валидации ввода (чтобы кнопка не светилась
// при очевидно битом логине). Реальная занятость проверяется воркером по 403.
const LOGIN_REGEX = /^[a-z0-9._-]+$/;
const RESERVED = new Set(["on11"]);

function clientValidateLogin(
	raw: string,
): { ok: true } | { ok: false; message: string } {
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

export function MailboxSetup({
	onCreate,
	errorMessage,
	initialLogin,
	onErrorShown,
}: Props) {
	const { domains, loading, error } = useDomains();
	const [mode, setMode] = useState<Mode>("random");
	const [domain, setDomain] = useState<string>("");
	const [preview, setPreview] = useState<string | null>(null);
	const [login, setLogin] = useState<string>("");
	const [loginError, setLoginError] = useState<string | null>(null);

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

	// При возврате с 403 (errorMessage + initialLogin) — переключаемся в custom
	// и подставляем введённый логин в поле.
	const lastSeenErrorRef = useRef<string | null>(null);
	useEffect(() => {
		if (
			errorMessage &&
			initialLogin &&
			lastSeenErrorRef.current !== errorMessage
		) {
			lastSeenErrorRef.current = errorMessage;
			setMode("custom");
			setLogin(initialLogin);
			setLoginError(null);
			onErrorShown?.();
		}
	}, [errorMessage, initialLogin, onErrorShown]);

	// === Случайный режим ===
	const handleCreateRandom = () => {
		if (!domain) return;
		const newLogin = generateRandomId(10);
		const email = `${newLogin}@${domain}`;
		storage.setLastMailbox(email);
		onCreate(email);
	};

	// === Custom-режим: локальная синтаксическая проверка, без серверного availability ===
	const handleLoginChange = (raw: string) => {
		setLogin(raw);
		const trimmed = raw.trim();
		if (!trimmed) {
			setLoginError(null);
			return;
		}
		const local = clientValidateLogin(raw);
		setLoginError(local.ok ? null : local.message);
	};

	const handleDomainChange = (newDomain: string) => {
		setDomain(newDomain);
	};

	const handleModeChange = (newMode: Mode) => {
		setMode(newMode);
		setLoginError(null);
	};

	const handleCreateCustom = () => {
		if (!domain) return;
		if (loginError) return;
		const trimmed = login.trim();
		if (!trimmed) return;
		const local = clientValidateLogin(trimmed);
		if (!local.ok) {
			setLoginError(local.message);
			return;
		}
		const email = `${trimmed.toLowerCase()}@${domain}`;
		storage.setLastMailbox(email);
		onCreate(email);
	};

	const handleSuggestLogin = () => {
		const suggested = generateRandomId(10);
		setLogin(suggested);
		setLoginError(null);
	};

	const handleOpenExisting = () => {
		if (preview) onCreate(preview);
	};

	const trimmedLogin = login.trim();
	const localCheck = trimmedLogin ? clientValidateLogin(trimmedLogin) : null;
	const isCustomValid =
		Boolean(domain) &&
		trimmedLogin.length > 0 &&
		!loginError &&
		(localCheck?.ok ?? false);

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

			{errorMessage && (
				<div className="state state-error" role="alert">
					{errorMessage}
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

							{loginError ? (
								<div className="availability availability--bad" role="alert">
									⚠ {loginError}
								</div>
							) : (
								<div className="availability availability--idle">
									Имя пройдёт локальную проверку. Занятость определяется по 403 при попытке открыть ящик.
								</div>
							)}

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

/* =============================================================================
 * DISABLED: предварительная проверка занятости через /mailbox/availability.
 *
 * Сейчас (пока воркер на сервере ещё не задеплоен с эндпоинтом
 * `GET /mailbox/availability`) проверка делается неявно через 403 на
 * `GET /emails/{email}`. Когда сервер будет обновлён, нужно:
 *   1. снять `// import { api } from "@/api/client";` в шапке файла
 *   2. вернуть типы ниже и `runAvailabilityCheck` + `useEffect`-подписку
 *   3. вернуть условие `disabled={!isCustomValid}` где `isCustomValid = status.kind === "ok"`
 *   4. вернуть `AvailabilityView` (его определение тоже ниже)
 *
 * До тех пор ручной ввод логина проходит только локальную синтаксическую
 * проверку, а реальная занятость ловится на 403 в `useInbox` и превращается
 * в возврат на экран создания с сообщением.
 * ============================================================================= */

/*
import type { MailboxAvailability, UnavailabilityReason } from "@/api/types";

type AvailabilityStatus =
	| { kind: "idle" }
	| { kind: "checking" }
	| { kind: "ok"; email: string }
	| { kind: "unavailable"; reason: UnavailabilityReason; message: string }
	| { kind: "error"; message: string };

const DEBOUNCE_MS = 400;

// ... и весь старый код проверки ...
*/