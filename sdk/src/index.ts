import Phase from '@phase.dev/phase-node';
import type { GetSecretOptions } from '@phase.dev/phase-node';

const DEFAULT_API_URL = process.env.APPROVAL_API_URL || "https://crion.up.railway.app";
const DEFAULT_ENV = process.env.PHASE_ENV_NAME || "production";
const DEFAULT_APP_ID = process.env.PHASE_APP_ID;

export interface ApprovalOptions {
    apiUrl?: string;
    timeout?: number;
    pollInterval?: number;
    envName?: string;
    appId?: string;
}

export class ApprovalError extends Error {
    constructor(
        message: string,
        public code: "DENIED" | "TIMEOUT" | "EXPIRED" | "NETWORK"
    ) {
        super(message);
        this.name = "ApprovalError";
    }
}

export interface ApprovedPhase {
    get(options?: Partial<GetSecretOptions>): Promise<Record<string, string>>;
    phase: Phase;
    appId: string;
    envName: string;
}

export async function createApprovedPhase(
    path: string,
    options: ApprovalOptions = {}
): Promise<ApprovedPhase> {
    const apiUrl = options.apiUrl || DEFAULT_API_URL;
    const timeout = options.timeout ?? 300000;
    const pollInterval = options.pollInterval ?? 2000;
    const envName = options.envName || DEFAULT_ENV;
    const requestAppId = options.appId || DEFAULT_APP_ID;

    console.log(`Requesting approval for: ${path}`);

    const response = await fetch(`${apiUrl}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            appId: requestAppId,
            envName: envName,
            path: path
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new ApprovalError(
            `Failed to create request: ${(err as any).error || response.status}`,
            "NETWORK"
        );
    }

    const { requestId } = await response.json() as { requestId: string };
    console.log(`Waiting for Telegram approval...`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        await sleep(pollInterval);

        try {
            const statusRes = await fetch(`${apiUrl}/status/${requestId}`);
            const data = await statusRes.json() as {
                status: string;
                phaseToken?: string;
                appId?: string;
            };

            if (data.status === "approved" && data.phaseToken) {
                console.log(`Approved!`);
                const appId = data.appId || requestAppId;
                if (!appId) {
                    throw new ApprovalError("No appId returned from server", "NETWORK");
                }
                const phase = new Phase(data.phaseToken);
                return {
                    phase,
                    appId,
                    envName,
                    async get(opts: Partial<GetSecretOptions> = {}) {
                        const result = await phase.get({
                            appId: opts.appId || appId,
                            envName: opts.envName || envName,
                            path: opts.path,
                            key: opts.key,
                        });
                        const secrets: Record<string, string> = {};
                        for (const item of result) {
                            secrets[item.key] = item.value;
                        }
                        return secrets;
                    }
                };
            }

            if (data.status === "denied") {
                throw new ApprovalError("Access denied", "DENIED");
            }

            if (data.status === "expired") {
                throw new ApprovalError("Request expired", "EXPIRED");
            }

            if (data.status === "consumed") {
                throw new ApprovalError("Token already consumed", "EXPIRED");
            }
        } catch (error) {
            if (error instanceof ApprovalError) throw error;
        }
    }

    throw new ApprovalError(`Timeout after ${timeout / 1000}s`, "TIMEOUT");
}

export async function getApprovedToken(
    path: string,
    options: ApprovalOptions = {}
): Promise<{ token: string; appId: string }> {
    const apiUrl = options.apiUrl || DEFAULT_API_URL;
    const timeout = options.timeout ?? 300000;
    const pollInterval = options.pollInterval ?? 2000;
    const envName = options.envName || DEFAULT_ENV;
    const requestAppId = options.appId || DEFAULT_APP_ID;

    const response = await fetch(`${apiUrl}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            appId: requestAppId,
            envName: envName,
            path: path
        }),
    });

    if (!response.ok) {
        throw new ApprovalError("Failed to create request", "NETWORK");
    }

    const { requestId } = await response.json() as { requestId: string };
    console.log(`Waiting for approval: ${path}`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        await sleep(pollInterval);

        const statusRes = await fetch(`${apiUrl}/status/${requestId}`);
        const data = await statusRes.json() as { status: string; phaseToken?: string; appId?: string };

        if (data.status === "approved" && data.phaseToken) {
            console.log(`Approved!`);
            return { token: data.phaseToken, appId: data.appId || requestAppId || "" };
        }

        if (data.status === "denied") {
            throw new ApprovalError("Denied", "DENIED");
        }

        if (data.status === "expired" || data.status === "consumed") {
            throw new ApprovalError("Expired", "EXPIRED");
        }
    }

    throw new ApprovalError("Timeout", "TIMEOUT");
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default { createApprovedPhase, getApprovedToken, ApprovalError };
