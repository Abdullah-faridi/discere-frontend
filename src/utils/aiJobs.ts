import { JobResult } from "../types/domain";

type JobEnvelope = {
  jobId?: string;
  state?: string;
  type?: string;
  postId?: string;
  answer?: unknown;
  result?: unknown;
  failedReason?: string;
};

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "string") {
    try { return toRecord(JSON.parse(value)); } catch { return undefined; }
  }
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : undefined;
}

function resultRecord(value: unknown, field: "summary" | "answer"): Record<string, unknown> | undefined {
  const record = toRecord(value);
  if (record && field in record) return record;
  if (record && "result" in record) return resultRecord(record.result, field);
  if (typeof value === "string" && field === "summary") return { summary: value };
  if (typeof value === "string" && field === "answer") return { answer: value };
  return record;
}

export function normalizeAiJob(payload: JobEnvelope): JobResult {
  const workerResult = toRecord(payload.result);
  const type = payload.type ?? (typeof workerResult?.type === "string" ? workerResult.type : undefined);
  let result: JobResult["result"];

  if (type === "post-summary") {
    const value = payload.type ? payload.result : workerResult?.result;
    result = resultRecord(value, "summary");
  } else if (type === "topic-question") {
    const value = payload.type ? payload.answer : workerResult?.answer;
    result = resultRecord(value, "answer");
  } else if (workerResult) {
    result = workerResult;
  }

  const postId = payload.postId ?? (typeof workerResult?.postId === "string" ? workerResult.postId : undefined);
  return {
    jobId: payload.jobId ?? "",
    state: payload.state ?? "completed",
    postId,
    result,
    failedReason: payload.failedReason,
  };
}
