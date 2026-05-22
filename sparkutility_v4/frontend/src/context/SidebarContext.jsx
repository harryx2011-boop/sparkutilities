import { createContext, useContext, useState, useCallback, useRef } from 'react';

// Registry of active workflow progress entries.
// Tools call registerWorkflow / updateWorkflow / unregisterWorkflow to
// publish live progress into the sidebar without a global store.
const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  // workflows: { [id]: { label, icon, progress, indeterminate } }
  const [workflows, setWorkflows] = useState({});
  const workflowsRef = useRef({});

  const registerWorkflow = useCallback((id, { label, icon = null, progress = null, indeterminate = false }) => {
    const entry = { label, icon, progress, indeterminate };
    workflowsRef.current = { ...workflowsRef.current, [id]: entry };
    setWorkflows({ ...workflowsRef.current });
  }, []);

  const updateWorkflow = useCallback((id, patch) => {
    if (!workflowsRef.current[id]) return;
    workflowsRef.current = {
      ...workflowsRef.current,
      [id]: { ...workflowsRef.current[id], ...patch },
    };
    setWorkflows({ ...workflowsRef.current });
  }, []);

  const unregisterWorkflow = useCallback((id) => {
    const next = { ...workflowsRef.current };
    delete next[id];
    workflowsRef.current = next;
    setWorkflows({ ...next });
  }, []);

  const toggleCollapsed = useCallback(() => setCollapsed(c => !c), []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapsed, workflows, registerWorkflow, updateWorkflow, unregisterWorkflow }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
