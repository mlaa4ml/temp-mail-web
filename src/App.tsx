import { useCallback, useState } from "react";
import { MailboxSetup } from "@/components/MailboxSetup";
import { InboxList } from "@/components/InboxList";
import { EmailView } from "@/components/EmailView";
import { ToastHost } from "@/components/Toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { storage } from "@/utils/storage";

type Screen =
	| { kind: "setup" }
	| { kind: "inbox"; email: string }
	| { kind: "email"; email: string; id: string };

export default function App() {
	const [screen, setScreen] = useState<Screen>(() => {
		const last = storage.getLastMailbox();
		return last ? { kind: "inbox", email: last } : { kind: "setup" };
	});
	// Сообщение об ошибке для экрана создания ящика (например, "имя занято").
	const [setupError, setSetupError] = useState<string | null>(null);
	// Логин, который пробовал занять пользователь — чтобы при возврате подставить
	// его обратно в поле.
	const [setupErrorLogin, setSetupErrorLogin] = useState<string | null>(null);

	const handleCreate = useCallback((email: string) => {
		storage.setLastMailbox(email);
		setSetupError(null);
		setScreen({ kind: "inbox", email });
	}, []);

	const handleChangeMailbox = useCallback(() => {
		storage.clearLastMailbox();
		setScreen({ kind: "setup" });
	}, []);

	const handleLeased = useCallback((email: string) => {
		// Прилетел 403 на открытии ящика (в т.ч. при попытке создать кастомный
		// логин, который уже занят). Возвращаемся на экран создания и
		// показываем сообщение.
		storage.clearLastMailbox();
		const at = email.indexOf("@");
		const login = at > 0 ? email.slice(0, at) : email;
		setSetupErrorLogin(login);
		setSetupError(
			"Имя занято. Этот ящик арендован или уже используется — выберите другое.",
		);
		setScreen({ kind: "setup" });
	}, []);

	const handleOpenEmail = useCallback(
		(id: string) => {
			if (screen.kind === "inbox") {
				setScreen({ kind: "email", email: screen.email, id });
			}
		},
		[screen],
	);

	const handleBack = useCallback(() => {
		if (screen.kind === "email") {
			setScreen({ kind: "inbox", email: screen.email });
		}
	}, [screen]);

	return (
		<div className="app">
			<header className="app-header">
				<button
					type="button"
					className="app-brand"
					onClick={() => {
						const last = storage.getLastMailbox();
						setScreen(last ? { kind: "inbox", email: last } : { kind: "setup" });
					}}
				>
					<span className="app-brand-icon">✉</span> Temp Mail
				</button>
				<div className="app-header-actions">
					{screen.kind !== "setup" && (
						<button
							type="button"
							className="btn btn-ghost"
							onClick={handleChangeMailbox}
						>
							Новый ящик
						</button>
					)}
					<ThemeToggle />
				</div>
			</header>

			<main className="app-main">
				{screen.kind === "setup" && (
					<MailboxSetup
						onCreate={handleCreate}
						errorMessage={setupError}
						initialLogin={setupErrorLogin}
						onErrorShown={() => setSetupError(null)}
					/>
				)}
				{screen.kind === "inbox" && (
					<InboxList
						email={screen.email}
						onOpenEmail={handleOpenEmail}
						onChangeMailbox={handleChangeMailbox}
						onLeased={() => handleLeased(screen.email)}
					/>
				)}
				{screen.kind === "email" && (
					<EmailView emailId={screen.id} onBack={handleBack} />
				)}
			</main>

			<ToastHost />
		</div>
	);
}