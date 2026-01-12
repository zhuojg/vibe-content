import { create } from "zustand";

interface InitialChatStore {
  initialMessage: string | null;
  targetProjectId: string | null;
  setInitialChat: (projectId: string, message: string) => void;
  consumeInitialChat: () => { projectId: string; message: string } | null;
}

export const useInitialChatStore = create<InitialChatStore>((set, get) => ({
  initialMessage: null,
  targetProjectId: null,
  setInitialChat: (projectId, message) =>
    set({ targetProjectId: projectId, initialMessage: message }),
  consumeInitialChat: () => {
    const { targetProjectId, initialMessage } = get();
    if (targetProjectId && initialMessage) {
      set({ targetProjectId: null, initialMessage: null });
      return { projectId: targetProjectId, message: initialMessage };
    }
    return null;
  },
}));
