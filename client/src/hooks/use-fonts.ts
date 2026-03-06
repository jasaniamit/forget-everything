import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useFonts(filters: {
  search?: string;
  category?: string;
  useCase?: string;
  weight?: string;
  width?: string;
  xHeight?: string;
  contrast?: string;
  italics?: string;
  caps?: string;
  story?: string;
  figures?: string;
  minFamilySize?: number;
  maxFamilySize?: number;
  style?: string | string[];
  characteristic?: string | string[];
  serifType?: string;
  aStory?: string;
  gStory?: string;
  subset?: string;
  page?: number;
  limit?: number;
  seed?: number;
} = {}) {
  return useQuery({
    queryKey: [api.fonts.list.path, JSON.stringify(filters)],
    queryFn: async () => {
      const url = new URL(api.fonts.list.path, window.location.origin);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "All") {
            if (Array.isArray(value)) {
              value.forEach(v => {
                if (v) url.searchParams.append(key, String(v));
              });
            } else if (value !== "") {
              url.searchParams.append(key, String(value));
            }
          }
        });
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch fonts');
      return await res.json() as { fonts: any[]; total: number; page: number; limit: number };
    },
  });
}

export function useFont(id: number) {
  return useQuery({
    queryKey: [api.fonts.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.fonts.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch font');
      return api.fonts.get.responses[200].parse(await res.json());
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useIncrementDownload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.fonts.incrementDownload.path, { id });
      const res = await fetch(url, {
        method: api.fonts.incrementDownload.method,
        credentials: "include"
      });
      if (!res.ok) throw new Error('Failed to record download');
      return api.fonts.incrementDownload.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.fonts.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.fonts.list.path] });
    },
  });
}
