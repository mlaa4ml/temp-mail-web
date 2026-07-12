import { useEffect, useState } from "react";
import { api } from "@/api/client";

const CACHE_KEY = "temp-mail-web:domains";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час

type CachedDomains = { ts: number; domains: string[] };

function readCache(): string[] | null {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CachedDomains;
		if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
		return parsed.domains;
	} catch {
		return null;
	}
}

function writeCache(domains: string[]): void {
	try {
		const data: CachedDomains = { ts: Date.now(), domains };
		localStorage.setItem(CACHE_KEY, JSON.stringify(data));
	} catch {
		// noop
	}
}

export function useDomains() {
	const [domains, setDomains] = useState<string[]>(() => readCache() ?? []);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (domains.length > 0) return; // есть кеш
		let aborted = false;
		setLoading(true);
		api
			.getDomains()
			.then((list) => {
				if (aborted) return;
				setDomains(list);
				writeCache(list);
			})
			.catch((e) => {
				if (aborted) return;
				setError(e instanceof Error ? e.message : "Не удалось загрузить домены");
			})
			.finally(() => {
				if (!aborted) setLoading(false);
			});
		return () => {
			aborted = true;
		};
	}, [domains.length]);

	return { domains, loading, error };
}