/**
 * @cryptoistaken/approval
 *
 * Telegram-based approval system for Phase.dev secrets.
 * Request approval via Telegram before accessing secrets.
 */

export interface ApprovalOptions {
    /** API URL of the approval bot server */
    apiUrl?: string;
    /** Timeout in milliseconds (default: 300000 = 5 minutes) */
    timeout?: number;
    /** Polling interval in milliseconds (default: 2000 = 2 seconds) */
    pollInterval?: number;
}

export interface ApprovalRequestParams {
    /** Phase App ID */
    appId: string;
    /** Environment name (e.g., "Production", "Staging") */
    envName: string;
    /** Optional path for secrets */
    path?: string;
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
 * Request approval for accessing secrets and wait for the token.
 *
 * @param params - The appId, envName, and optional path to request approval for
 * @param options - Configuration options
 * @returns Promise that resolves with the Phase token when approved
 * @throws ApprovalError if denied, timed out, or network error
 *
 * @example
 * ```typescript
 * import { getApprovedToken } from '@cryptoistaken/approval';
 * import Phase from '@phase.dev/phase-node';
 *
 * const token = await getApprovedToken({
 *   appId: 'my-app-id',
 *   envName: 'Production',
 *   path: '/database'
 * });
 * const phase = new Phase(token);
 * const secrets = await phase.get({ appId: 'my-app-id', envName: 'Production' });
 * ```
 */
export async function getApprovedToken(
    params: ApprovalRequestParams,
    options: ApprovalOptions = {}
): Promise<string> {
    const apiUrl = options.apiUrl || process.env.APPROVAL_API_URL || "https://approval.up.railway.app";
    const timeout = options.timeout ?? 300000; // 5 minutes
    const pollInterval = options.pollInterval ?? 2000; // 2 seconds

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
            body: JSON.stringify({
                appId: params.appId,
                envName: params.envName,
                path: params.path
            }),
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

    console.log(`Approval requested for appId="${params.appId}", envName="${params.envName}"${params.path ? `, path="${params.path}"` : ""}`);
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
                    `Access denied for appId="${params.appId}", envName="${params.envName}"`,
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
export default { getApprovedToken, createApprovedPhase, ApprovalError };

// --- Phase Integration ---

import Phase from '@phase.dev/phase-node';
import type { GetSecretOptions } from '@phase.dev/phase-node';

/**
 * Options for configuring the Phase client defaults.
 * Any options provided here will be automatically applied to phase.get() calls
 * unless overridden.
 */
export interface PhaseDefaults extends Partial<GetSecretOptions> {
    // We can add other Phase-specific defaults here if needed later
}

/**
 * Combined options for approval and Phase defaults.
 */
export interface CreateApprovedPhaseOptions extends ApprovalOptions, PhaseDefaults { }

/**
 * A wrapper around the Phase client that applies default options.
 */
export type WrappedPhase = Omit<Phase, 'get'> & {
    /**
     * Fetch secrets with automatic default options application.
     */
    get(options?: Partial<GetSecretOptions>): Promise<any>;
    /**
     * Access to the underlying raw Phase client instance.
     */
    _raw: Phase;
};

/**
 * Request approval and return an initialized, configured Phase client.
 *
 * @param params - The appId, envName, and optional path to request approval for
 * @param options - Configuration for both the approval process and Phase defaults
 * @returns Promise resolving to a wrapped Phase client
 *
 * @example
 * ```typescript
 * const phase = await createApprovedPhase(
 *   { appId: 'my-app-id', envName: 'Production', path: '/database' },
 *   { timeout: 60000 }
 * );
 *
 * // Automatically uses 'Production' and 'my-app-id'
 * const secrets = await phase.get();
 * ```
 */
export async function createApprovedPhase(
    params: ApprovalRequestParams,
    options: CreateApprovedPhaseOptions = {}
): Promise<WrappedPhase> {
    // 1. Get the approved token
    const token = await getApprovedToken(params, options);

    // 2. Initialize Phase
    const phase = new Phase(token);

    // 3. Set defaults from params
    const defaults: PhaseDefaults = {
        appId: params.appId,
        envName: params.envName,
        path: params.path,
        ...options
    };

    // 4. Wrap it with defaults
    return wrapPhase(phase, defaults);
}

/**
 * Helper to wrap a Phase instance with default options.
 */
function wrapPhase(phase: Phase, defaults: PhaseDefaults): WrappedPhase {
    // Create a proxy to intercept .get() calls
    const wrapper = new Proxy(phase, {
        get(target, prop, receiver) {
            if (prop === 'get') {
                return async (options: Partial<GetSecretOptions> = {}) => {
                    // Merge defaults with provided options
                    // Provided options take precedence
                    const mergedOptions = { ...defaults, ...options };

                    // Ensure required fields are present if possible, though Phase SDK validation will handle missing ones
                    return target.get(mergedOptions as GetSecretOptions);
                };
            }
            if (prop === '_raw') {
                return target;
            }
            // Forward all other properties/methods to the original instance
            return Reflect.get(target, prop, receiver);
        }
    });

    return wrapper as unknown as WrappedPhase;
}
