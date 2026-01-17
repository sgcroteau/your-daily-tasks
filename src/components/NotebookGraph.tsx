import { useMemo, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface GraphNode {
  id: string;
  title: string;
  type: "task" | "note" | "quicknote";
  projectId: string | null;
  x: number;
  y: number;
  connections: string[];
  color?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  strength: number;
}

interface NotebookEntry {
  id: string;
  type: "task" | "note" | "quicknote";
  title: string;
  content: string;
  projectId: string | null;
  labelIds: string[];
  keywords: string[];
  color?: string;
}

interface NotebookGraphProps {
  entries: NotebookEntry[];
  projects: { id: string; name: string; color?: string }[];
  onSelectEntry?: (entryId: string) => void;
  selectedEntryId?: string;
}

// Calculate similarity between two entries
const calculateSimilarity = (entry1: NotebookEntry, entry2: NotebookEntry): number => {
  const sharedKeywords = entry1.keywords.filter(k => entry2.keywords.includes(k));
  const sameProject = entry1.projectId && entry1.projectId === entry2.projectId;
  const sharedLabels = entry1.labelIds.filter(l => entry2.labelIds.includes(l));
  
  return sharedKeywords.length * 2 + (sameProject ? 3 : 0) + sharedLabels.length * 2;
};

// Force-directed graph layout
const applyForceLayout = (nodes: GraphNode[], edges: GraphEdge[], iterations = 100): GraphNode[] => {
  const width = 600;
  const height = 400;
  const padding = 60;
  
  // Initialize positions in a circle
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const radius = Math.min(width, height) / 3;
    node.x = width / 2 + radius * Math.cos(angle);
    node.y = height / 2 + radius * Math.sin(angle);
  });
  
  const k = Math.sqrt((width * height) / nodes.length);
  
  for (let iter = 0; iter < iterations; iter++) {
    const temperature = 1 - iter / iterations;
    
    // Repulsive forces between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (k * k) / dist * 0.5 * temperature;
        
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        nodes[i].x -= fx;
        nodes[i].y -= fy;
        nodes[j].x += fx;
        nodes[j].y += fy;
      }
    }
    
    // Attractive forces along edges
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.from);
      const target = nodes.find(n => n.id === edge.to);
      if (!source || !target) continue;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist * dist) / k * 0.01 * edge.strength * temperature;
      
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      source.x += fx;
      source.y += fy;
      target.x -= fx;
      target.y -= fy;
    }
    
    // Keep nodes within bounds
    for (const node of nodes) {
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    }
  }
  
  return nodes;
};

const NotebookGraph = ({ entries, projects, onSelectEntry, selectedEntryId }: NotebookGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Build graph data
  const { nodes, edges } = useMemo(() => {
    if (entries.length === 0) return { nodes: [], edges: [] };
    
    // Limit to prevent performance issues
    const limitedEntries = entries.slice(0, 50);
    
    // Calculate edges (connections)
    const edgeList: GraphEdge[] = [];
    for (let i = 0; i < limitedEntries.length; i++) {
      for (let j = i + 1; j < limitedEntries.length; j++) {
        const similarity = calculateSimilarity(limitedEntries[i], limitedEntries[j]);
        if (similarity > 2) {
          edgeList.push({
            from: limitedEntries[i].id,
            to: limitedEntries[j].id,
            strength: Math.min(similarity / 10, 1)
          });
        }
      }
    }
    
    // Create nodes
    const nodeList: GraphNode[] = limitedEntries.map(entry => ({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      projectId: entry.projectId,
      x: 0,
      y: 0,
      connections: edgeList
        .filter(e => e.from === entry.id || e.to === entry.id)
        .map(e => e.from === entry.id ? e.to : e.from),
      color: entry.color,
    }));
    
    // Apply force-directed layout
    const layoutNodes = applyForceLayout([...nodeList], edgeList, 80);
    
    return { nodes: layoutNodes, edges: edgeList };
  }, [entries]);
  
  const getProjectColor = (projectId: string | null) => {
    if (!projectId) return "hsl(var(--muted-foreground))";
    const project = projects.find(p => p.id === projectId);
    return project?.color || "hsl(var(--primary))";
  };
  
  // Pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Zoom handling
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(2, prev.scale * delta))
    }));
  };
  
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No entries to visualize
      </div>
    );
  }
  
  const highlightedConnections = hoveredNode 
    ? nodes.find(n => n.id === hoveredNode)?.connections || []
    : selectedEntryId 
      ? nodes.find(n => n.id === selectedEntryId)?.connections || []
      : [];
  
  const activeNodeId = hoveredNode || selectedEntryId;
  
  return (
    <div className="relative w-full h-[400px] bg-muted/30 rounded-lg overflow-hidden border border-border">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm rounded-md p-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span>Note</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rotate-45 bg-amber-400" />
          <span>Quick Note</span>
        </div>
        <div className="text-muted-foreground mt-1">
          Scroll to zoom • Drag to pan
        </div>
      </div>
      
      {/* Stats */}
      <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm rounded-md px-3 py-2 text-xs">
        <span className="font-medium">{nodes.length}</span> nodes •{" "}
        <span className="font-medium">{edges.length}</span> connections
      </div>
      
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox="0 0 600 400"
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Edges */}
          {edges.map((edge, i) => {
            const source = nodes.find(n => n.id === edge.from);
            const target = nodes.find(n => n.id === edge.to);
            if (!source || !target) return null;
            
            const isHighlighted = 
              activeNodeId && 
              (edge.from === activeNodeId || edge.to === activeNodeId);
            
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={isHighlighted ? 0.8 : 0.3 + edge.strength * 0.4}
                className="transition-all duration-200"
              />
            );
          })}
          
          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = selectedEntryId === node.id;
            const isHovered = hoveredNode === node.id;
            const isConnected = highlightedConnections.includes(node.id);
            const isActive = isSelected || isHovered;
            const color = node.type === "quicknote" && node.color ? node.color : getProjectColor(node.projectId);
            
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectEntry?.(node.id)}
              >
                {/* Glow effect for active nodes */}
                {isActive && (
                  <circle
                    r={16}
                    fill={color}
                    opacity={0.2}
                    className="animate-pulse"
                  />
                )}
                
                {/* Node shape */}
                {node.type === "task" ? (
                  <circle
                    r={isActive ? 10 : isConnected ? 8 : 6}
                    fill={color}
                    stroke={isSelected ? "hsl(var(--foreground))" : "transparent"}
                    strokeWidth={2}
                    className="transition-all duration-200"
                    opacity={activeNodeId && !isActive && !isConnected ? 0.3 : 1}
                  />
                ) : node.type === "quicknote" ? (
                  <rect
                    x={isActive ? -8 : isConnected ? -6 : -5}
                    y={isActive ? -8 : isConnected ? -6 : -5}
                    width={isActive ? 16 : isConnected ? 12 : 10}
                    height={isActive ? 16 : isConnected ? 12 : 10}
                    transform="rotate(45)"
                    fill={color}
                    stroke={isSelected ? "hsl(var(--foreground))" : "transparent"}
                    strokeWidth={2}
                    className="transition-all duration-200"
                    opacity={activeNodeId && !isActive && !isConnected ? 0.3 : 1}
                  />
                ) : (
                  <rect
                    x={isActive ? -8 : isConnected ? -6 : -5}
                    y={isActive ? -8 : isConnected ? -6 : -5}
                    width={isActive ? 16 : isConnected ? 12 : 10}
                    height={isActive ? 16 : isConnected ? 12 : 10}
                    rx={2}
                    fill={color}
                    stroke={isSelected ? "hsl(var(--foreground))" : "transparent"}
                    strokeWidth={2}
                    className="transition-all duration-200"
                    opacity={activeNodeId && !isActive && !isConnected ? 0.3 : 1}
                  />
                )}
                
                {/* Label on hover */}
                {isActive && (
                  <g>
                    <rect
                      x={-60}
                      y={-35}
                      width={120}
                      height={20}
                      rx={4}
                      fill="hsl(var(--background))"
                      stroke="hsl(var(--border))"
                      strokeWidth={1}
                    />
                    <text
                      y={-22}
                      textAnchor="middle"
                      fill="hsl(var(--foreground))"
                      fontSize={10}
                      fontWeight={500}
                    >
                      {node.title.length > 18 ? node.title.slice(0, 18) + "..." : node.title}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default NotebookGraph;
