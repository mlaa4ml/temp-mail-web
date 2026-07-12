import { useCallback, useState } from "react";

type Props = {
	value: string;
	className?: string;
	label?: string;
};

export function CopyButton({ value, className, label = "Копировать" }: Props) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			// Фоллбэк для нестандартных окружений
			const ta = document.createElement("textarea");
			ta.value = value;
			ta.style.position = "fixed";
			ta.style.opacity = "0";
			document.body.appendChild(ta);
			ta.select();
			try {
				document.execCommand("copy");
				setCopied(true);
				window.setTimeout(() => setCopied(false), 1500);
			} catch {
				// noop
			} finally {
				document.body.removeChild(ta);
			}
		}
	}, [value]);

	return (
		<button
			type="button"
			className={className ?? "btn btn-secondary"}
			onClick={handleCopy}
			aria-label="Скопировать адрес"
		>
			{copied ? "✓ Скопировано" : label}
		</button>
	);
}