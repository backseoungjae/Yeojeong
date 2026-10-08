import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createTourClient } from '../../../shared/api/tour/tourClient';
import { configurationStatus, getTourEnvironment } from '../../../shared/api/tour/tourConfig';
import { runTourDiagnostics, type DiagnosticResult } from '../services/tourDiagnostics';
export function useTourDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [state, setState] = useState<'idle' | 'running' | 'finished' | 'cancelled' | 'failed'>('idle');
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => { current.current?.abort(); current.current = null; }, []);
  const run = async () => {
    if (current.current) return;
    const controller = new AbortController(); current.current = controller;
    setResults([]); setState('running');
    const client = createTourClient(getTourEnvironment(), undefined, Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'AND' : 'WEB');
    try {
      await runTourDiagnostics(client, controller.signal, result => {
        if (current.current === controller && !controller.signal.aborted) setResults(previous => [...previous, result]);
      });
      if (current.current === controller) setState('finished');
    } catch {
      if (current.current === controller) setState(controller.signal.aborted ? 'cancelled' : 'failed');
    } finally { if (current.current === controller) current.current = null; }
  };
  const cancel = () => { current.current?.abort(); current.current = null; setState('cancelled'); };
  return { results, state, run, cancel, configuration: configurationStatus(getTourEnvironment()) };
}
