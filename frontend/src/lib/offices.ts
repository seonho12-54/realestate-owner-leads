import { apiRequest } from "@/lib/api";

export type OfficeOption = {
  id: number;
  name: string;
  phone: string | null;
};

export async function listActiveOffices() {
  return apiRequest<OfficeOption[]>("/api/offices");
}
