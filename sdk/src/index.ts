/**
 * @cryptoistaken/approval
 *
 * Telegram-based approval system for Phase.dev secrets.
 * Request approval via Telegram before accessing secrets.
 */

export interface ApprovalOptions {
    /** API URL of the approval bot server */
    apiUrl?: string;
    /** Environment name (e.g., "production", "staging") */
    environment?: string;
    /** Timeout in milliseconds (default: 300000 = 5 minutes) */
    timeout?: number;
    /** Polling interval in milliseconds (default: 2000 = 2 seconds) */
    pollInterval?: number;
    /** Name of the requester (for logging purposes) */
    requester?: string;
}

export interface ApprovalResponse {
    status: "pending" | "approved" | "denied";
    token?: string;
}

export class ApprovalError extends Error {
    constructor(
        message: string,
        public code: "DENIED" | "TIMEOUT" | "NETWORK" | "UNKNOWN"
    ) {
        super(message);
        this.name = "ApprovalError";
    }
}

/**
 * Request approval for accessing a resource and wait for the token.
 *
 * @param resource - Name of the resource being requested (e.g., "production-secrets")
 * @param options - Configuration options
 * @returns Promise that resolves with the Phase token when approved
 * @throws ApprovalError if denied, timed out, or network error
 *
 * @example
 * ```typescript
 * import { getApprovedToken } from '@cryptoistaken/approval';
 * import Phase from '@phase.dev/phase-node';
 *
 * const token = await getApprovedToken('production-secrets');
 * const phase = new Phase(token);
 * const secrets = await phase.get({ appId: '...', envName: 'Production' });
 * ```
 */
export async function getApprovedToken(
    resource: string,
    options: ApprovalOptions = {}
): Promise<string> {
    const apiUrl = options.apiUrl || process.env.APPROVAL_API_URL || "https://approval.up.railway.app";
    const timeout = options.timeout ?? 300000; // 5 minutes
    const pollInterval = options.pollInterval ?? 2000; // 2 seconds
    const requester = options.requester || "sdk";
    const environment = options.environment || "default";

    if (!apiUrl) {
        throw new ApprovalError(
            "APPROVAL_API_URL environment variable or apiUrl option is required",
            "UNKNOWN"
        );
    }

    // Create approval request
    let requestId: string;
    try {
        const response = await fetch(`${apiUrl}/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resource, requester, environment }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as { requestId: string };
        requestId = data.requestId;
    } catch (error) {
        throw new ApprovalError(
            `Failed to create approval request: ${error}`,
            "NETWORK"
        );
    }

    console.log(`Approval requested for "${resource}" (${requestId})`);
    console.log("Waiting for approval via Telegram...");

    // Poll for status
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        await sleep(pollInterval);

        try {
            const response = await fetch(`${apiUrl}/status/${requestId}`);

            if (!response.ok) {
                continue; // Retry on error
            }

            const data = (await response.json()) as ApprovalResponse;

            if (data.status === "approved" && data.token) {
                console.log("Approved!");
                return data.token;
            }

            if (data.status === "denied") {
                throw new ApprovalError(
                    `Access denied for resource "${resource}"`,
                    "DENIED"
                );
            }

            // Still pending, continue polling
        } catch (error) {
            if (error instanceof ApprovalError) {
                throw error;
            }
            // Network error, continue polling
        }
    }

    throw new ApprovalError(
        `Approval timeout after ${timeout / 1000} seconds`,
        "TIMEOUT"
    );
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Default export for convenience
export default { getApprovedToken, ApprovalError };
