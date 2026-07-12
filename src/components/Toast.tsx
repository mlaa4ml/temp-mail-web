import { useEffect, useState } from "react";

type ToastMessage = {
	id: number;
	text: string;
	kind: "info" | "error" | "success";
};

let externalAdd: ((text: string, kind?: ToastMessage["kind"]) => void) | null = null;

export function showToast(text: string, kind: ToastMessage["kind"] = "info") {
	externalAdd?.(text, kind);
}

export function ToastHost() {
	const [items, setItems] = useState<ToastMessage[]>([]);

	useEffect(() => {
		externalAdd = (text, kind = "info") => {
			const id = Date.now() + Math.random();
			setItems((s) => [...s, { id, text, kind }]);
			window.setTimeout(() => {
				setItems((s) => s.filter((it) => it.id !== id));
			}, 4000);
		};
		return () => {
			externalAdd = null;
		};
	}, []);

	return (
		<div className="toast-host" aria-live="polite" aria-atomic="true">
			{items.map((it) => (
				<div key={it.id} className={`toast toast-${it.kind}`}>
					{it.text}
				</div>
			))}
		</div>
	);
}