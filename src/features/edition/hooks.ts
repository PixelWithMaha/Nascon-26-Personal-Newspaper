"use client";

import { useMutation } from "@tanstack/react-query";
import { generateEdition } from "./api";

export function useGenerateEdition() {
  return useMutation({ mutationFn: () => generateEdition() });
}