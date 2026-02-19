import { api } from "./api";

export interface TriggerResponse {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
}

export async function listTriggersApi(): Promise<TriggerResponse[]> {
  const { data } = await api.get("/triggers");
  return data.data;
}

export async function createTriggerApi(input: {
  name: string;
  icon?: string;
}): Promise<TriggerResponse> {
  const { data } = await api.post("/triggers", input);
  return data.data;
}

export async function deleteTriggerApi(id: string): Promise<void> {
  await api.delete(`/triggers/${id}`);
}
