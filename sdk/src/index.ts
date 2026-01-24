import Phase from '@phase.dev/phase-node';
import type { GetSecretOptions } from '@phase.dev/phase-node';

const DEFAULTS = {
    API_URL: process.env.APPROVAL_API_URL || "https://crion.up.railway.app",
    ENV: process.env.PHASE_ENV_NAME || "production",
    APP_ID: process.env.PHASE_APP_ID
};

export interface ApprovalOptions {
    apiUrl?: string;
    timeout?: number;
    pollInterval?: number;
    envName?: string;
    appId?: string; // Optional override, usually comes from bot
}

export class ApprovalError extends Error {
    constructor(message: string, public code: "DENIED" | "TIMEOUT" | "EXPIRED" | "NETWORK") {
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

export async function createApprovedPhase(path: string, options: ApprovalOptions = {}): Promise<ApprovedPhase> {
    const { token, appId } = await getApprovedToken(path, options);

    const phase = new Phase(token);
    const envName = options.envName || DEFAULTS.ENV;

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
            // Convert array to object map
            return result.reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {});
        }
    };
}

export async function getApprovedToken(path: string, options: ApprovalOptions = {}): Promise<{ token: string; appId: string }> {
    const config = {
        apiUrl: options.apiUrl || DEFAULTS.API_URL,
        timeout: options.timeout ?? 300000,
        pollInterval: options.pollInterval ?? 2000,
        envName: options.envName || DEFAULTS.ENV,
        appId: options.appId || DEFAULTS.APP_ID
    };

    console.log(`🔐 Requesting approval for: ${path}`);

    const res = await fetch(`${config.apiUrl}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: config.appId, envName: config.envName, path })
    });

    if (!res.ok) throw new ApprovalError(`Request failed: ${res.status}`, "NETWORK");

    const { requestId } = await res.json() as { requestId: string };
    console.log(`⏳ Waiting for approval...`);

    const start = Date.now();
    while (Date.now() - start < config.timeout) {
        await new Promise(r => setTimeout(r, config.pollInterval));

        try {
            const statusRes = await fetch(`${config.apiUrl}/status/${requestId}`);
            const data = await statusRes.json() as any;

            if (data.status === "approved" && data.phaseToken) {
                console.log(`✅ Approved!`);
                return { token: data.phaseToken, appId: data.appId || config.appId || "" };
            }
            if (data.status === "denied") throw new ApprovalError("Denied", "DENIED");
            if (["expired", "consumed"].includes(data.status)) throw new ApprovalError("Expired", "EXPIRED");
        } catch (err) {
            if (err instanceof ApprovalError) throw err;
        }
    }

    throw new ApprovalError("Timeout", "TIMEOUT");
}

export async function getSecret(secretPath: string, options: ApprovalOptions = {}): Promise<Record<string, string>> {
    const phase = await createApprovedPhase(secretPath, options);
    return phase.get({ path: secretPath });
}

export default { createApprovedPhase, getApprovedToken, getSecret, ApprovalError };
