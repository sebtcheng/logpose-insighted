import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { HomeResponse, PersonItemsDto, SearchResponse, WorkloadResponse } from "@myapp/shared";
import { api } from "./client";

// ---------------------------------------------------------------- home, workload, search
export const useHome = (params: { assigneeId?: string; subprojectId?: string }) =>
  useQuery({
    queryKey: ["home", params.assigneeId ?? null, params.subprojectId ?? null],
    placeholderData: keepPreviousData,
    queryFn: () => api.get<HomeResponse>("/home", params),
  });

export const useWorkload = () =>
  useQuery({
    queryKey: ["workload"],
    queryFn: () => api.get<WorkloadResponse>("/workload"),
  });

export const usePersonItems = (userId: string | null) =>
  useQuery({
    queryKey: ["workload-items", userId],
    enabled: !!userId,
    queryFn: () => api.get<PersonItemsDto>(`/workload/${userId}/items`),
  });

export const useSearch = (q: string) =>
  useQuery({
    queryKey: ["search", q],
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
    queryFn: () => api.get<SearchResponse>("/search", { q }),
  });
