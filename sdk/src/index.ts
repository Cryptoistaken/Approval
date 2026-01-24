import Phase from '@phase.dev/phase-node';
import type { GetSecretOptions } from '@phase.dev/phase-node';

export interface ApprovalOptions {
    apiUrl?: string;
    timeout?: number;
    pollInterval?: number;
}

export interface ApprovalRequestParams {
    appId: string;
    envName: string;
    path: string;
}

export interface ApprovalResult {
    phaseToken: string;
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

export async function getApproval(
    params: ApprovalRequestParams,
    options: ApprovalOptions = {}
): Promise<ApprovalResult> {
    const apiUrl = options.apiUrl || process.env.APPROVAL_API_URL || "https://crion-bot-production.up.railway.app";
    const timeout = options.timeout ?? 60000;
    const pollInterval = options.pollInterval ?? 2000;

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

    console.log(`Approval requested for path="${params.path}"`);
    console.log("Waiting for approval via Telegram");

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        await sleep(pollInterval);

        try {
            const response = await fetch(`${apiUrl}/status/${requestId}`);

            if (!response.ok) {
                continue;
            }

            const data = (await response.json()) as {
                status: string;
                phaseToken?: string;
            };

            if (data.status === "approved" && data.phaseToken) {
                return {
                    phaseToken: data.phaseToken
                };
            }

            if (data.status === "denied") {
                throw new ApprovalError(
                    `Access denied for path="${params.path}"`,
                    "DENIED"
                );
            }
        } catch (error) {
            if (error instanceof ApprovalError) {
                throw error;
            }
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

export interface PhaseDefaults extends Partial<GetSecretOptions> { }

export interface CreateApprovedPhaseOptions extends ApprovalOptions, PhaseDefaults {
    appId?: string;
    envName?: string;
}

export type WrappedPhase = Omit<Phase, 'get'> & {
    get(options?: Partial<GetSecretOptions>): Promise<any>;
    _raw: Phase;
};

export async function createApprovedPhase(
    path: string,
    options: CreateApprovedPhaseOptions = {}
): Promise<WrappedPhase> {
    const appId = options.appId || process.env.PHASE_APP_ID;
    const envName = options.envName || process.env.PHASE_ENV_NAME || "Production";

    if (!appId) {
        throw new Error("appId is required (set via options or PHASE_APP_ID env var)");
    }

    const params: ApprovalRequestParams = {
        appId: appId,
        envName: envName,
        path: path
    };

    const approval = await getApproval(params, {
        ...options,
        timeout: 60000
    });

    const phase = new Phase(approval.phaseToken);

    const defaults: PhaseDefaults = {
        appId: params.appId,
        envName: params.envName,
        path: params.path,
        ...options
    };

    return wrapPhase(phase, defaults);
}

function wrapPhase(
    phase: Phase,
    defaults: PhaseDefaults
): WrappedPhase {
    const wrapper = new Proxy(phase, {
        get(target, prop, receiver) {
            if (prop === 'get') {
                return async (options: Partial<GetSecretOptions> = {}) => {
                    const mergedOptions = { ...defaults, ...options };
                    return target.get(mergedOptions as GetSecretOptions);
                };
            }
            if (prop === '_raw') {
                return target;
            }
            return Reflect.get(target, prop, receiver);
        }
    });

    return wrapper as unknown as WrappedPhase;
}

export interface GetApprovedTokenOptions extends ApprovalOptions {
    appId?: string;
    envName?: string;
}

export async function getApprovedToken(
    path: string,
    options: GetApprovedTokenOptions = {}
): Promise<string> {
    const appId = options.appId || process.env.PHASE_APP_ID;
    const envName = options.envName || process.env.PHASE_ENV_NAME || "Production";

    if (!appId) {
        throw new Error("appId is required (set via options or PHASE_APP_ID env var)");
    }

    const params: ApprovalRequestParams = {
        appId: appId,
        envName: envName,
        path: path
    };

    const result = await getApproval(params, {
        ...options,
        timeout: 60000
    });
    return result.phaseToken;
}

export default { getApproval, getApprovedToken, createApprovedPhase, ApprovalError };
