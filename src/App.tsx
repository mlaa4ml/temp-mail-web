import { useCallback, useState } from "react";
import { MailboxSetup } from "@/components/MailboxSetup";
import { InboxList } from "@/components/InboxList";
import { EmailView } from "@/components/EmailView";
import { ToastHost } from "@/components/Toast";
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

	const handleCreate = useCallback((email: string) => {
		storage.setLastMailbox(email);
		setScreen({ kind: "inbox", email });
	}, []);

	const handleChangeMailbox = useCallback(() => {
		storage.clearLastMailbox();
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
				{screen.kind !== "setup" && (
					<button
						type="button"
						className="btn btn-ghost"
						onClick={handleChangeMailbox}
					>
						Новый ящик
					</button>
				)}
			</header>

			<main className="app-main">
				{screen.kind === "setup" && <MailboxSetup onCreate={handleCreate} />}
				{screen.kind === "inbox" && (
					<InboxList
						email={screen.email}
						onOpenEmail={handleOpenEmail}
						onChangeMailbox={handleChangeMailbox}
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