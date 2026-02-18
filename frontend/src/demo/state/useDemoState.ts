import { useCallback, useEffect, useMemo, useState } from "react";
import {
    applyAction,
    getDemoState,
    getKpiSnapshot,
    getTraceability,
    resetDemo,
    runGuidedStep,
    setPersona,
} from "./api";
import type {
    DemoAction,
    DemoActionResult,
    DemoKpi,
    DemoState,
    Persona,
    TraceabilityGraph,
} from "../types";

type UseDemoStateResult = {
    state: DemoState | null;
    kpi: DemoKpi | null;
    traceability: TraceabilityGraph | null;
    lastResult: DemoActionResult | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    runStep: (stepId: string) => Promise<void>;
    runAction: (action: DemoAction) => Promise<DemoActionResult | null>;
    reset: (seedProfile: string) => Promise<void>;
    changePersona: (persona: Persona) => Promise<void>;
    loadTraceability: (batchCode: string) => Promise<void>;
};

export function useDemoState(): UseDemoStateResult {
    const [state, setState] = useState<DemoState | null>(null);
    const [kpi, setKpi] = useState<DemoKpi | null>(null);
    const [traceability, setTraceability] = useState<TraceabilityGraph | null>(
        null,
    );
    const [lastResult, setLastResult] = useState<DemoActionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runWithGuard = useCallback(async (fn: () => Promise<void>) => {
        setLoading(true);
        setError(null);
        try {
            await fn();
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Unknown demo error";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const refresh = useCallback(async () => {
        await runWithGuard(async () => {
            const [nextState, nextKpi] = await Promise.all([
                getDemoState(),
                getKpiSnapshot(),
            ]);
            setState(nextState);
            setKpi(nextKpi);
        });
    }, [runWithGuard]);

    const runStep = useCallback(
        async (stepId: string) => {
            await runWithGuard(async () => {
                const nextState = await runGuidedStep(stepId);
                setState(nextState);
                const nextKpi = await getKpiSnapshot();
                setKpi(nextKpi);
            });
        },
        [runWithGuard],
    );

    const runAction = useCallback(
        async (action: DemoAction): Promise<DemoActionResult | null> => {
            let output: DemoActionResult | null = null;
            await runWithGuard(async () => {
                const result = await applyAction(action);
                output = result;
                setLastResult(result);
                setState(result.state);
                setKpi(result.kpi);
            });
            return output;
        },
        [runWithGuard],
    );

    const reset = useCallback(
        async (seedProfile: string) => {
            await runWithGuard(async () => {
                const nextState = await resetDemo(seedProfile);
                setState(nextState);
                const nextKpi = await getKpiSnapshot();
                setKpi(nextKpi);
                setLastResult(null);
                setTraceability(null);
            });
        },
        [runWithGuard],
    );

    const changePersona = useCallback(
        async (persona: Persona) => {
            await runWithGuard(async () => {
                const nextState = await setPersona(persona);
                setState(nextState);
            });
        },
        [runWithGuard],
    );

    const loadTraceability = useCallback(
        async (batchCode: string) => {
            await runWithGuard(async () => {
                const graph = await getTraceability(batchCode);
                setTraceability(graph);
            });
        },
        [runWithGuard],
    );

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return useMemo(
        () => ({
            state,
            kpi,
            traceability,
            lastResult,
            loading,
            error,
            refresh,
            runStep,
            runAction,
            reset,
            changePersona,
            loadTraceability,
        }),
        [
            state,
            kpi,
            traceability,
            lastResult,
            loading,
            error,
            refresh,
            runStep,
            runAction,
            reset,
            changePersona,
            loadTraceability,
        ],
    );
}
