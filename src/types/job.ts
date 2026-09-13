export type JobType = "summarize" | "classify";
export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface JobMessage {
  jobId: string;
  type: JobType;
  input: string;
  attempt: number;
}
