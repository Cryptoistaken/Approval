/**
 * Crion SDK - Simple Mode
 * Request human approval for Phase.dev secrets via Telegram
 */

import Phase from '@phase.dev/phase-node';
import type { GetSecretOptions } from '@phase.dev/phase-node';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_API_URL = process.env.APPROVAL_API_URL || "https://crion.up.railway.app";
const DEFAULT_ENV = process.env.PHASE_ENV_NAME || "production";
const DEFAULT_APP_ID = process.env.PHASE_APP_ID; // Only if explicitly set

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalOptions {
    apiUrl?: string;
    timeout?: number;
    pollInterval?: number;
    envName?: string;
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

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Request approval and get a Phase instance
 * 
 * @param path - Path/identifier for this request (shown in Telegram)
 * @param options - Optional configuration
 * @returns Phase instance ready to fetch secrets
 * 
 * @example
 * const phase = await createApprovedPhase('/my-script');
 * const secrets = await phase.get();
 * console.log(secrets.API_KEY);
 */
export async function createApprovedPhase(
    path: string,
    options: ApprovalOptions = {}
): Promise<Phase> {
    const apiUrl = options.apiUrl || DEFAULT_API_URL;
    const timeout = options.timeout ?? 300000; // 5 min default
    const pollInterval = options.pollInterval ?? 2000;
    const envName = options.envName || DEFAULT_ENV;

    // Create request
    console.log(`🔐 Requesting approval for: ${path}`);

    const response = await fetch(`${apiUrl}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            appId: DEFAULT_APP_ID,
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
    console.log(`⏳ Waiting for Telegram approval...`);

    // Poll for approval
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
                console.log(`✅ Approved!`);
                // Use appId from response, falling back to env var
                const appId = data.appId || process.env.PHASE_APP_ID;
                if (appId) {
                    process.env.PHASE_APP_ID = appId;
                }
                return new Phase(data.phaseToken);
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
            // Network error, retry
        }
    }

    throw new ApprovalError(`Timeout after ${timeout / 1000}s`, "TIMEOUT");
}

/**
 * Request approval and return just the Phase token
 */
export async function getApprovedToken(
    path: string,
    options: ApprovalOptions = {}
): Promise<string> {
    const apiUrl = options.apiUrl || DEFAULT_API_URL;
    const timeout = options.timeout ?? 300000;
    const pollInterval = options.pollInterval ?? 2000;
    const envName = options.envName || DEFAULT_ENV;

    const response = await fetch(`${apiUrl}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            appId: DEFAULT_APP_ID,
            envName: envName,
            path: path
        }),
    });

    if (!response.ok) {
        throw new ApprovalError("Failed to create request", "NETWORK");
    }

    const { requestId } = await response.json() as { requestId: string };
    console.log(`⏳ Waiting for approval: ${path}`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        await sleep(pollInterval);

        const statusRes = await fetch(`${apiUrl}/status/${requestId}`);
        const data = await statusRes.json() as { status: string; phaseToken?: string };

        if (data.status === "approved" && data.phaseToken) {
            console.log(`✅ Approved!`);
            return data.phaseToken;
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
