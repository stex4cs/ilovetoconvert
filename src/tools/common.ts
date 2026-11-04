import { useCallback, useState } from "react";
import type { Output } from "../lib/files";

/** Busy flag, error message and outputs for one tool run. */
export function useRunner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);

  const run = useCallback(async (job: () => Promise<Output[]>, fallbackError: string) => {
    setBusy(true);
    setError(null);
    setOutputs([]);
    try {
      setOutputs(await job());
    } catch (e) {
      console.error(e);
      setError(e instanceof UserError ? e.message : fallbackError);
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOutputs([]);
    setError(null);
  }, []);

  return { busy, error, outputs, run, reset };
}

/** An error whose message is meant for the person using the tool. */
export class UserError extends Error {}
