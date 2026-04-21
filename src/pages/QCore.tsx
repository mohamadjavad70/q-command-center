import { useState, useCallback, useRef, useMemo } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  type Connection, type Node, type Edge,
  useReactFlow, ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { Shield, Download, Upload, RotateCcw, Home, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import NodeLibrarySidebar from "@/components/forge/NodeLibrarySidebar";
import ForgeChat from "@/components/forge/ForgeChat";
import NodeInspector from "@/components/forge/NodeInspector";
import RunLogPanel from "@/components/forge/RunLogPanel";
import WorkflowManager, { saveWorkflowData, loadWorkflowData } from "@/components/forge/WorkflowManager";
import { blueprintToFlow, nodeLibrary, type AgentNode, type Blueprint } from "@/lib/AgentBlueprints";
import { runWorkflowLinear, type RunLog } from "@/lib/executor";
import { safeParseJSON, isWorkflowData } from "@/lib/storageValidation";
import { getWorkspaceSummary } from "@/lib/workspaceRegistry";

const WORKFLOW_KEY = "q-forge-workflow";
const ACTIVE_WF_KEY = "q-forge-active-wf";

const DEFAULT_WORKFLOW = {
    nodes: [{
      id: "start",
      type: "input",
      position: { x: 300, y: 200 },
      data: { label: "شروع کار\nStart", nodeType: "trigger_webhook", config: {} },
      style: {
        background: "hsl(var(--neon-green) / 0.15)",
        border: "1px solid hsl(var(--neon-green) / 0.5)",
        color: "hsl(var(--foreground))",
        borderRadius: "8px", padding: "10px 14px", fontSize: "11px", fontFamily: "monospace",
      },
    }],
  edges: [],
};

function loadWorkflow(): { nodes: Node[]; edges: Edge[] } {
  return safeParseJSON(localStorage.getItem(WORKFLOW_KEY), isWorkflowData, DEFAULT_WORKFLOW);
}

type RightPanel = "chat" | "inspector";

function QCoreInner() {
  const initial = loadWorkflow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [nodeCounter, setNodeCounter] = useState(0);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const workspace = useMemo(() => getWorkspaceSummary(), []);

  // Multi-workflow
  const [activeWfId, setActiveWfId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_WF_KEY); } catch { return null; }
  });

  // Inspector + Runner state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("chat");
  const [runLogs, setRunLogs] = useState<RunLog[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRunByNode, setLastRunByNode] = useState<Record<string, any>>({});

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: "hsl(var(--neon-amber))", strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_e: any, node: Node) => {
    setSelectedNodeId(node.id);
    setRightPanel("inspector");
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const saveWorkflow = useCallback(() => {
    localStorage.setItem(WORKFLOW_KEY, JSON.stringify({ nodes, edges }));
    if (activeWfId) saveWorkflowData(activeWfId, nodes, edges);
  }, [nodes, edges, activeWfId]);

  const createNodeFromLibrary = useCallback((agentNode: AgentNode, position?: { x: number; y: number }) => {
    const newId = `node-${Date.now()}-${nodeCounter}`;
    setNodeCounter(c => c + 1);
    const newNode: Node = {
      id: newId,
      position: position ?? { x: 200 + Math.random() * 300, y: 100 + Math.random() * 300 },
      data: {
        label: `${agentNode.labelFa}\n${agentNode.label}`,
        nodeType: agentNode.id,
        config: { ...(agentNode.defaults ?? {}) },
      },
      style: {
        background: `hsl(var(--${agentNode.color}) / 0.15)`,
        border: `1px solid hsl(var(--${agentNode.color}) / 0.5)`,
        color: "hsl(var(--foreground))",
        borderRadius: "8px", padding: "10px 14px", fontSize: "11px", fontFamily: "monospace",
      },
    };
    setNodes(nds => [...nds, newNode]);
  }, [nodeCounter, setNodes]);

  const handleAddNode = useCallback((agentNode: AgentNode) => {
    createNodeFromLibrary(agentNode);
  }, [createNodeFromLibrary]);

  // Drag & Drop handler
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const nodeId = e.dataTransfer.getData("application/q-node-id");
    if (!nodeId) return;
    const agentNode = nodeLibrary.find(n => n.id === nodeId);
    if (!agentNode) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    createNodeFromLibrary(agentNode, position);
  }, [createNodeFromLibrary, screenToFlowPosition]);

  const handleBlueprintSelect = useCallback((bp: Blueprint) => {
    const flow = blueprintToFlow(bp);
    setNodes(flow.nodes as Node[]);
    setEdges(flow.edges as Edge[]);
  }, [setNodes, setEdges]);

  const onUpdateNodeConfig = useCallback((nodeId: string, patch: Record<string, any>) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...(n.data as any), config: { ...((n.data as any)?.config ?? {}), ...patch } } }
          : n
      )
    );
  }, [setNodes]);

  // Multi-workflow handlers
  const handleWfSwitch = useCallback((id: string) => {
    // Save current first
    if (activeWfId) saveWorkflowData(activeWfId, nodes, edges);
    const data = loadWorkflowData(id);
    if (data) {
      setNodes(data.nodes);
      setEdges(data.edges);
    }
    setActiveWfId(id);
    localStorage.setItem(ACTIVE_WF_KEY, id);
  }, [activeWfId, nodes, edges, setNodes, setEdges]);

  const handleWfNew = useCallback((id: string, _name: string) => {
    if (activeWfId) saveWorkflowData(activeWfId, nodes, edges);
    setNodes([]);
    setEdges([]);
    setActiveWfId(id);
    localStorage.setItem(ACTIVE_WF_KEY, id);
    saveWorkflowData(id, [], []);
  }, [activeWfId, nodes, edges, setNodes, setEdges]);

  // Runner
  const runSimulation = useCallback(async () => {
    setRunning(true);
    setRunLogs([]);
    try {
      const result = await runWorkflowLinear(nodes, edges, (log) => {
        setRunLogs(prev => [...prev, log]);
      });
      const byNode: Record<string, any> = {};
      result.logs.forEach(l => { byNode[l.nodeId] = l.output; });
      setLastRunByNode(byNode);
    } finally {
      setRunning(false);
    }
  }, [nodes, edges]);

  const exportWorkflow = () => {
    const data = { nodes, edges, exportedAt: new Date().toISOString(), version: "1.2" };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `Q-Agent-${Date.now()}.json`; a.click();
  };

  const importWorkflow = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (isWorkflowData(data)) {
            setNodes(data.nodes);
            setEdges(data.edges);
          } else {
            alert("فایل نامعتبر است — ساختار nodes/edges یافت نشد");
          }
        } catch { alert("فایل نامعتبر است"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* ── HEADER ── */}
      <nav className="h-12 border-b border-border glass-panel flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg" style={{ background: "hsl(var(--neon-amber) / 0.15)", border: "1px solid hsl(var(--neon-amber) / 0.3)" }}>
            <Shield className="w-4 h-4" style={{ color: "hsl(var(--neon-amber))" }} />
          </div>
          <span className="font-bold tracking-[0.15em] text-xs uppercase" style={{ color: "hsl(var(--neon-amber))" }}>
            Q-MOTHER-CORE
          </span>
          <span className="text-[10px] text-muted-foreground hidden md:inline">
            وضعیت: <span style={{ color: "hsl(var(--neon-green))" }}>مرکزی</span>
            <span className="mx-2">|</span>
            {workspace.active + workspace.support} ماژول متصل
            <span className="mx-2">|</span>
            {workspace.archive} آرشیو
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" asChild>
            <a href="/"><Home className="h-3 w-3" /> خانه</a>
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-[10px] gap-1"
            disabled={running}
            onClick={runSimulation}
            style={!running ? { color: "hsl(var(--neon-green))" } : undefined}
          >
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {running ? "اجرا..." : "شبیه‌سازی"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={importWorkflow}>
            <Upload className="h-3 w-3" /> وارد کردن
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={exportWorkflow}>
            <Download className="h-3 w-3" /> خروجی
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={saveWorkflow}>
            <RotateCcw className="h-3 w-3" /> ذخیره
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: NODE LIBRARY + WORKFLOW MANAGER ── */}
        <aside className="w-56 border-r border-border bg-card/50 shrink-0 overflow-hidden flex flex-col">
          <WorkflowManager activeId={activeWfId} onSwitch={handleWfSwitch} onNew={handleWfNew} />
          <div className="flex-1 overflow-hidden">
            <NodeLibrarySidebar onAddNode={handleAddNode} />
          </div>
        </aside>

        {/* ── CENTER: CANVAS + RUN LOGS ── */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 relative" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onDragOver={onDragOver}
              onDrop={onDrop}
              fitView
            >
              <Background color="hsl(var(--border))" gap={25} size={1} />
              <Controls style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <MiniMap
                nodeColor="hsl(var(--neon-amber))"
                maskColor="hsl(var(--background) / 0.8)"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
              />
            </ReactFlow>
          </main>
          <RunLogPanel logs={runLogs} running={running} />
        </div>

        {/* ── RIGHT: CHAT / INSPECTOR toggle ── */}
        <aside className="w-80 border-l border-border bg-card/50 shrink-0 overflow-hidden flex flex-col">
          <div className="flex items-center border-b border-border">
            <button
              onClick={() => setRightPanel("chat")}
              className={`flex-1 text-[10px] py-2 uppercase tracking-widest transition-colors ${rightPanel === "chat" ? "text-[hsl(var(--neon-amber))] border-b-2 border-[hsl(var(--neon-amber))]" : "text-muted-foreground"}`}
            >
              چت استراتژیک
            </button>
            <button
              onClick={() => setRightPanel("inspector")}
              className={`flex-1 text-[10px] py-2 uppercase tracking-widest transition-colors ${rightPanel === "inspector" ? "text-[hsl(var(--neon-amber))] border-b-2 border-[hsl(var(--neon-amber))]" : "text-muted-foreground"}`}
            >
              Inspector
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {rightPanel === "chat" ? (
              <ForgeChat onBlueprintSelect={handleBlueprintSelect} />
            ) : (
              <NodeInspector
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onUpdateNodeConfig={onUpdateNodeConfig}
                lastRunByNode={lastRunByNode}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function QCore() {
  return (
    <ReactFlowProvider>
      <QCoreInner />
    </ReactFlowProvider>
  );
}
