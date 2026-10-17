"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPreferences, savePreferences } from "./api";

export const preferencesKey = ["preferences"] as const;

export function usePreferences() {
  return useQuery({ queryKey: preferencesKey, queryFn: fetchPreferences });
}

export function useSavePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savePreferences,
    onSuccess: (data) => queryClient.setQueryData(preferencesKey, data),
  });
}