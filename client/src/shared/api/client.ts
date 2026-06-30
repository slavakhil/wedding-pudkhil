const API_URL = import.meta.env.VITE_API_URL ?? "";

export type Invitation = {
  slug: string;
  displayName: string;
  guestType: "single" | "couple" | "family";
};

export type ContentMap = Record<string, unknown>;

export type MediaAsset = {
  id: string;
  key: string;
  url: string;
  alt?: string | null;
  createdAt: string;
};

export type RsvpPayload = {
  invitationSlug: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  foodPreferences: string[];
  alcoholPreferences: string[];
  questionAnswers: Record<string, string[]>;
  hasChild: boolean;
  comment?: string;
  moneyGiftEnabled: boolean;
  moneyGiftAmount?: number;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Ошибка запроса." }));
    throw new Error(error.message ?? "Ошибка запроса.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const publicApi = {
  getContent: () => request<{ items: ContentMap }>("/api/public/content"),
  getMedia: () => request<{ assets: MediaAsset[] }>("/api/public/media"),
  getInvitation: (slug: string) => request<Invitation>(`/api/public/invitations/${slug}`),
  sendRsvp: (payload: RsvpPayload) =>
    request<{ guest: unknown }>("/api/public/rsvp", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};

export const adminApi = {
  login: (code: string) =>
    request<{ token: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ code })
    }),
  getInvitations: (token: string) =>
    request<{ invitations: AdminInvitation[] }>("/api/admin/invitations", {
      headers: { Authorization: `Bearer ${token}` }
    }),
  createInvitation: (token: string, payload: { displayName: string; internalName: string; guestType: string }) =>
    request<{ invitation: AdminInvitation; url: string }>("/api/admin/invitations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  updateInvitation: (token: string, id: string, payload: { displayName: string; internalName: string; guestType: string; isActive: boolean }) =>
    request<{ invitation: AdminInvitation }>(`/api/admin/invitations/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  deleteInvitation: (token: string, id: string) =>
    request<void>(`/api/admin/invitations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }),
  getGuests: (token: string) =>
    request<{ guests: AdminGuest[] }>("/api/admin/guests", {
      headers: { Authorization: `Bearer ${token}` }
    }),
  updateGuest: (token: string, id: string, payload: AdminGuestUpdatePayload) =>
    request<{ guest: AdminGuest }>(`/api/admin/guests/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  deleteGuest: (token: string, id: string) =>
    request<void>(`/api/admin/guests/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }),
  getContent: (token: string) =>
    request<{ items: AdminContentItem[] }>("/api/admin/content", {
      headers: { Authorization: `Bearer ${token}` }
    }),
  updateContent: (token: string, items: AdminContentItem[]) =>
    request<{ items: AdminContentItem[] }>("/api/admin/content", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items })
    }),
  getMedia: (token: string) =>
    request<{ assets: MediaAsset[] }>("/api/admin/media", {
      headers: { Authorization: `Bearer ${token}` }
    }),
  uploadMedia: async (token: string, payload: { file: File; key: string; alt: string }) => {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("key", payload.key);
    formData.append("alt", payload.alt);

    const response = await fetch(`${API_URL}/api/admin/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Не удалось загрузить фото." }));
      throw new Error(error.message ?? "Не удалось загрузить фото.");
    }

    return response.json() as Promise<{ asset: MediaAsset }>;
  },
  exportGuests: async (token: string) => {
    const response = await fetch(`${API_URL}/api/admin/guests/export.xlsx`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error("Не удалось скачать Excel.");
    }

    return response.blob();
  }
};

export type AdminContentItem = {
  id?: string;
  key: string;
  value: unknown;
  type: "text" | "json" | "image";
  updatedAt?: string;
};

export type AdminInvitation = {
  id: string;
  slug: string;
  displayName: string;
  internalName: string;
  guestType: string;
  isActive: boolean;
  url: string;
  hasResponse: boolean;
  createdAt: string;
};

export type AdminGuestUpdatePayload = {
  firstName: string;
  lastName: string;
  phone: string;
  foodPreferences: string[];
  alcoholPreferences: string[];
  questionAnswers: Record<string, string[]>;
  hasChild: boolean;
  comment?: string;
  moneyGiftEnabled: boolean;
  moneyGiftAmount?: number | null;
};

export type AdminGuest = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  foodPreferences: string[];
  alcoholPreferences: string[];
  questionAnswers?: Record<string, string[]>;
  hasChild: boolean;
  comment?: string;
  moneyGiftEnabled: boolean;
  moneyGiftAmount?: number;
  updatedAt: string;
  invitation: {
    displayName: string;
    internalName: string;
    slug: string;
  };
};
