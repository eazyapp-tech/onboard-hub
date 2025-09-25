// frontend/lib/api.ts
export async function postJSON(path: string, body: unknown) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  }
  
  export const ping = () => fetch("/health").then(r => r.json());
  
  export const createOnboarding = (payload: any) =>
    postJSON("/api/onboarding", payload);
  
  export const createBooking = (payload: any) =>
    postJSON("/api/bookings", payload);
  