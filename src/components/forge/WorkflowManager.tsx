import { useState, useEffect } from "react";
import { FolderOpen, Plus, Trash2, Check } from "lucide-react";
import type { Node, Edge } from "reactflow";
import { safeParseJSON, isWorkflowIndex, isWorkflowData } from "@/lib/storageValidation";

export interface WorkflowMeta {
  id: string;
  name: string;
  updatedAt: string;
}

const WORKFLOWS_INDEX_KEY = "q-forge-workflows-index";
const WORKFLOW_PREFIX = "q-forge-wf-";

function loadIndex(): WorkflowMeta[] {
  return safeParseJSON(localStorage.getItem(WORKFLOWS_INDEX_KEY), isWorkflowIndex, []);
}

function saveIndex(index: WorkflowMeta[]) {
  localStorage.setItem(WORKFLOWS_INDEX_KEY, JSON.stringify(index));
}

export function saveWorkflowData(id: string, nodes: Node[], edges: Edge[]) {
  localStorage.setItem(WORKFLOW_PREFIX + id, JSON.stringify({ nodes, edges }));
  const index = loadIndex();
  const entry = index.find((w) => w.id === id);
  if (entry) {
    entry.updatedAt = new Date().toISOString();
    saveIndex(index);
  }
}

export function loadWorkflowData(id: string): { nodes: Node[]; edges: Edge[] } | null {
  const raw = localStorage.getItem(WORKFLOW_PREFIX + id);
  if (!raw) return null;
  return safeParseJSON(raw, isWorkflowData, null as any) ?? null;
}

interface Props {
  activeId: string | null;
  onSwitch: (id: string) => void;
  onNew: (id: string, name: string) => void;
}

export default function WorkflowManager({ activeId, onSwitch, onNew }: Props) {
  const [index, setIndex] = useState<WorkflowMeta[]>(loadIndex);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setIndex(loadIndex());
  }, [activeId]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = `wf-${Date.now()}`;
    const meta: WorkflowMeta = { id, name: newName.trim(), updatedAt: new Date().toISOString() };
    const updated = [...index, meta];
    saveIndex(updated);
    setIndex(updated);
    setCreating(false);
    setNewName("");
    onNew(id, meta.name);
  };

  const handleDelete = (id: string) => {
    const updated = index.filter((w) => w.id !== id);
    saveIndex(updated);
    localStorage.removeItem(WORKFLOW_PREFIX + id);
    setIndex(updated);
  };

  return (
    <div className="p-3 border-b border-border space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest">
          <FolderOpen className="h-3 w-3" /> پروژه‌ها
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="text-[hsl(var(--neon-amber))] hover:opacity-80"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {creating && (
        <div className="flex gap-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="نام پروژه..."
            className="flex-1 bg-muted/30 border border-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[hsl(var(--neon-amber))]"
            autoFocus
          />
          <button onClick={handleCreate} className="text-[hsl(var(--neon-green))]">
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-1 max-h-32 overflow-y-auto">
        {index.map((w) => (
          <div
            key={w.id}
            className={`flex items-center justify-between rounded px-2 py-1.5 text-[10px] cursor-pointer transition-colors ${
              w.id === activeId
                ? "bg-[hsl(var(--neon-amber)/0.15)] border border-[hsl(var(--neon-amber)/0.4)] text-[hsl(var(--neon-amber))]"
                : "hover:bg-muted/30 text-muted-foreground"
            }`}
            onClick={() => onSwitch(w.id)}
          >
            <span className="truncate">{w.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }}
              className="opacity-0 group-hover:opacity-100 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {index.length === 0 && (
          <p className="text-[9px] text-muted-foreground italic text-center py-1">هنوز پروژه‌ای نیست</p>
        )}
      </div>
    </div>
  );
}
