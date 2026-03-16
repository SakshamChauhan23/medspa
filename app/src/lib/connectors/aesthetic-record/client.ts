import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  ARPatient,
  ARTreatment,
  ARAppointment,
  ARPaginatedResponse,
  ARConnectionConfig,
} from "./types";

const AR_BASE_URL = "https://api.aestheticrecord.com/v1";
const DEFAULT_PAGE_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class AestheticRecordClient {
  private http: AxiosInstance;
  private config: ARConnectionConfig;

  constructor(config: ARConnectionConfig) {
    this.config = config;
    this.http = axios.create({
      baseURL: config.baseUrl ?? AR_BASE_URL,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "X-Clinic-Id": config.clinicId,
      },
      timeout: 15_000,
    });

    // Response interceptor for rate-limit handling
    this.http.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          const retryAfter = Number(
            error.response.headers["retry-after"] ?? 5
          );
          await sleep(retryAfter * 1000);
          return this.http.request(error.config!);
        }
        throw error;
      }
    );
  }

  /**
   * Verify the API credentials are valid by making a lightweight request.
   */
  async verifyConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.http.get("/me");
      return { valid: true };
    } catch (err: unknown) {
      const error = err as AxiosError;
      if (error.response?.status === 401) {
        return { valid: false, error: "Invalid API key" };
      }
      return { valid: false, error: "Could not reach Aesthetic Record API" };
    }
  }

  /**
   * Fetch all patients using cursor-based pagination.
   * Yields batches of patients to avoid loading everything into memory.
   */
  async *fetchPatients(
    afterCursor?: string | null
  ): AsyncGenerator<ARPatient[]> {
    let cursor = afterCursor ?? null;
    let page = 1;

    while (true) {
      const response = await this.fetchWithRetry<
        ARPaginatedResponse<ARPatient>
      >("/patients", {
        per_page: DEFAULT_PAGE_SIZE,
        cursor: cursor ?? undefined,
        page,
      });

      if (response.data.length === 0) break;

      yield response.data;

      cursor = response.meta.next_cursor ?? null;
      if (!cursor || page >= response.meta.last_page) break;
      page++;
    }
  }

  /**
   * Fetch treatments for a specific patient.
   */
  async fetchTreatmentsForPatient(
    arPatientId: string
  ): Promise<ARTreatment[]> {
    const response = await this.fetchWithRetry<
      ARPaginatedResponse<ARTreatment>
    >(`/patients/${arPatientId}/treatments`, {
      per_page: DEFAULT_PAGE_SIZE,
    });
    return response.data;
  }

  /**
   * Fetch all treatments using cursor-based pagination.
   */
  async *fetchTreatments(
    afterCursor?: string | null
  ): AsyncGenerator<ARTreatment[]> {
    let cursor = afterCursor ?? null;
    let page = 1;

    while (true) {
      const response = await this.fetchWithRetry<
        ARPaginatedResponse<ARTreatment>
      >("/treatments", {
        per_page: DEFAULT_PAGE_SIZE,
        cursor: cursor ?? undefined,
        page,
      });

      if (response.data.length === 0) break;

      yield response.data;

      cursor = response.meta.next_cursor ?? null;
      if (!cursor || page >= response.meta.last_page) break;
      page++;
    }
  }

  /**
   * Fetch all appointments using cursor-based pagination.
   * Optionally filter by updated_after for incremental syncs.
   */
  async *fetchAppointments(options?: {
    updatedAfter?: string;
    afterCursor?: string | null;
  }): AsyncGenerator<ARAppointment[]> {
    let cursor = options?.afterCursor ?? null;
    let page = 1;

    while (true) {
      const response = await this.fetchWithRetry<
        ARPaginatedResponse<ARAppointment>
      >("/appointments", {
        per_page: DEFAULT_PAGE_SIZE,
        cursor: cursor ?? undefined,
        updated_after: options?.updatedAfter,
        page,
      });

      if (response.data.length === 0) break;

      yield response.data;

      cursor = response.meta.next_cursor ?? null;
      if (!cursor || page >= response.meta.last_page) break;
      page++;
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async fetchWithRetry<T>(
    path: string,
    params?: Record<string, unknown>,
    attempt = 1
  ): Promise<T> {
    try {
      const { data } = await this.http.get<T>(path, { params });
      return data;
    } catch (err: unknown) {
      const error = err as AxiosError;
      const isRetryable =
        !error.response || [500, 502, 503, 504].includes(error.response.status);

      if (isRetryable && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        return this.fetchWithRetry(path, params, attempt + 1);
      }
      throw error;
    }
  }
}
