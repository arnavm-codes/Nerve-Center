import * as http from 'http';
import * as crypto from 'crypto';
import type { AddressInfo } from 'net';
import { shell } from 'electron';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const FLOW_TIMEOUT_MS = 120_000;

export interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
}

function base64url(buf: Buffer): string {
	return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makePkce(): { verifier: string; challenge: string } {
	const verifier = base64url(crypto.randomBytes(32));
	const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
	return { verifier, challenge };
}

/**
 * Runs the OAuth 2.0 loopback + PKCE flow (RFC 8252): spins up a temporary
 * localhost listener on an OS-assigned port, opens the system browser to
 * Google's consent screen, and exchanges the returned code for tokens.
 */
export async function runAuthFlow(clientId: string, clientSecret: string): Promise<TokenResponse> {
	const { verifier, challenge } = makePkce();
	const state = base64url(crypto.randomBytes(16));
	let redirectUri = '';

	return new Promise<TokenResponse>((resolve, reject) => {
		const timeout = setTimeout(() => {
			server.close();
			reject(new Error('OAuth flow timed out waiting for browser sign-in.'));
		}, FLOW_TIMEOUT_MS);

		const server = http.createServer((req, res) => {
			void (async () => {
				const url = new URL(req.url ?? '/', 'http://127.0.0.1');
				if (url.pathname !== '/callback') {
					res.writeHead(404).end();
					return;
				}

				const error = url.searchParams.get('error');
				const returnedState = url.searchParams.get('state');
				const code = url.searchParams.get('code');

				if (error || returnedState !== state || !code) {
					res.writeHead(400, { 'Content-Type': 'text/html' }).end(
						'<h3>Authorization failed.</h3><p>You can close this tab and try again in Obsidian.</p>',
					);
					clearTimeout(timeout);
					server.close();
					reject(new Error(error ? `OAuth error: ${error}` : 'OAuth state mismatch or missing code.'));
					return;
				}

				res.writeHead(200, { 'Content-Type': 'text/html' }).end(
					'<h3>Connected.</h3><p>You can close this tab and return to Obsidian.</p>',
				);
				clearTimeout(timeout);
				server.close();

				try {
					const body = new URLSearchParams({
						code,
						client_id: clientId,
						client_secret: clientSecret,
						redirect_uri: redirectUri,
						grant_type: 'authorization_code',
						code_verifier: verifier,
					});
					const tokenRes = await fetch(TOKEN_ENDPOINT, {
						method: 'POST',
						headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
						body: body.toString(),
					});
					if (!tokenRes.ok) {
						reject(new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`));
						return;
					}
					resolve((await tokenRes.json()) as TokenResponse);
				} catch (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			})();
		});

		server.listen(0, '127.0.0.1', () => {
			const port = (server.address() as AddressInfo).port;
			redirectUri = `http://127.0.0.1:${port}/callback`;

			const authUrl = new URL(AUTH_ENDPOINT);
			authUrl.searchParams.set('client_id', clientId);
			authUrl.searchParams.set('redirect_uri', redirectUri);
			authUrl.searchParams.set('response_type', 'code');
			authUrl.searchParams.set('scope', SCOPE);
			authUrl.searchParams.set('access_type', 'offline');
			authUrl.searchParams.set('prompt', 'consent');
			authUrl.searchParams.set('code_challenge', challenge);
			authUrl.searchParams.set('code_challenge_method', 'S256');
			authUrl.searchParams.set('state', state);
			void shell.openExternal(authUrl.toString());
		});
	});
}

export async function refreshAccessToken(
	clientId: string,
	clientSecret: string,
	refreshToken: string,
): Promise<TokenResponse> {
	const body = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		refresh_token: refreshToken,
		grant_type: 'refresh_token',
	});
	const res = await fetch(TOKEN_ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: body.toString(),
	});
	if (!res.ok) {
		throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
	}
	return (await res.json()) as TokenResponse;
}
