"use client";

import { useMutation } from "@tanstack/react-query";
import { sendLearnedAction } from "./api";

export function useLearnedAction() {
  return useMutation({ mutationFn: sendLearnedAction });
}