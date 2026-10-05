import { ipcBridge } from '@/common';
import useSWR from 'swr';

/** Unknown or older backends stay disabled until support is explicitly advertised. */
export function useRuntimeCapabilities(backend: string | undefined) {
  const { data, error } = useSWR('runtime-capabilities', () => ipcBridge.runtimeCapabilities.invoke(), {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  const capability = data?.backends.find((item) => item.backend === backend);
  return {
    fastSupported: capability?.fast_supported === true,
    capabilityKnown: Boolean(capability),
    loading: !data && !error,
  };
}
