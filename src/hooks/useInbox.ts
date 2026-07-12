import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/api/client";
import type { EmailSummary } from "@/api/types";

const POLL_INTERVAL_MS = 5_000;

export type InboxState = {
	emails: EmailSummary[];
	loading: boolean;
	refreshing: boolean;
	error: string | null;
	leased: boolean;
	lastFetchedAt: number | null;
};

export function useInbox(
	email: string | null,
	pollEnabled = true,
	onLeased?: () => void,
) {
	const [state, setState] = useState<InboxState>({
		emails: [],
		loading: false,
		refreshing: false,
		error: null,
		leased: false,
		lastFetchedAt: null,
	});
	const abortRef = useRef<AbortController | null>(null);
	const timerRef = useRef<number | null>(null);
	const leasedNotifiedRef = useRef<boolean>(false);

	const fetchEmails = useCallback(
		async (isInitial: boolean) => {
			if (!email) {
				setState({
					emails: [],
					loading: false,
					refreshing: false,
					error: null,
					leased: false,
					lastFetchedAt: null,
				});
				leasedNotifiedRef.current = false;
				return;
			}

			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setState((s) => ({
				...s,
				loading: isInitial,
				refreshing: !isInitial,
				error: null,
			}));

			try {
				const list = await api.getEmails(email, 50, 0, {
					signal: controller.signal,
				});
				if (controller.signal.aborted) return;
				setState({
					emails: list,
					loading: false,
					refreshing: false,
					error: null,
					leased: false,
					lastFetchedAt: Date.now(),
				});
			} catch (e) {
				if (controller.signal.aborted) return;
				if (e instanceof ApiError) {
					setState({
						emails: [],
						loading: false,
						refreshing: false,
						error: e.message,
						leased: e.isLeased,
						lastFetchedAt: null,
					});
					if (e.isLeased && !leasedNotifiedRef.current) {
						leasedNotifiedRef.current = true;
						onLeased?.();
					}
					return;
				}
				setState({
					emails: [],
					loading: false,
					refreshing: false,
					error: e instanceof Error ? e.message : "Неизвестная ошибка",
					leased: false,
					lastFetchedAt: null,
				});
			}
		},
		[email],
	);

	useEffect(() => {
		fetchEmails(true);
		return () => {
			abortRef.current?.abort();
		};
	}, [fetchEmails]);

	useEffect(() => {
		if (!email || !pollEnabled) return;
		timerRef.current = window.setInterval(() => {
			fetchEmails(false);
		}, POLL_INTERVAL_MS);
		return () => {
			if (timerRef.current !== null) {
				window.clearInterval(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [email, pollEnabled, fetchEmails]);

	const refresh = useCallback(() => {
		fetchEmails(false);
	}, [fetchEmails]);

	return { ...state, refresh };
}