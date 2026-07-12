type Props = {
	id?: string;
	domains: string[];
	value: string;
	onChange: (domain: string) => void;
	disabled?: boolean;
};

export function DomainSelect({ id, domains, value, onChange, disabled }: Props) {
	if (domains.length === 0) {
		return (
			<select id={id} className="select" disabled>
				<option>Загрузка доменов…</option>
			</select>
		);
	}
	return (
		<select
			id={id}
			className="select"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
		>
			{domains.map((d) => (
				<option key={d} value={d}>
					@{d}
				</option>
			))}
		</select>
	);
}