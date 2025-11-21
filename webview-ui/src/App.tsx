import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayerTree } from './components/LayerTree';
import { Preview } from './components/Preview';
import { AttributeEditor } from './components/AttributeEditor';
import { parseSvg, serializeSvg, getNodePath, getNodeByPath } from './utils/svgUtils';
import { vscode } from './utils/vscode';
import './App.css';

function App() {
  const [svgContent, setSvgContent] = useState<string>('');
  const [parsedDoc, setParsedDoc] = useState<Document | null>(null);
  const [selectedNode, setSelectedNode] = useState<Element | null>(null);

  const [selectedNodes, setSelectedNodes] = useState<Element[]>([]);

  // Handle messages from extension
  const parsedDocRef = useRef<Document | null>(null);
  const selectedNodesRef = useRef<Element[]>([]);

  useEffect(() => {
    parsedDocRef.current = parsedDoc;
  }, [parsedDoc]);

  useEffect(() => {
    selectedNodesRef.current = selectedNodes;
  }, [selectedNodes]);

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'load':
          // Try to preserve selection
          const currentDoc = parsedDocRef.current;
          const currentSelected = selectedNodesRef.current;
          let pathsToRestore: number[][] = [];
          
          if (currentDoc && currentDoc.documentElement && currentSelected.length > 0) {
             pathsToRestore = currentSelected.map(node => getNodePath(node, currentDoc.documentElement));
          }

          setSvgContent(message.svgText);
          const doc = parseSvg(message.svgText);
          setParsedDoc(doc);
          
          if (doc && doc.documentElement && pathsToRestore.length > 0) {
            const newSelectedNodes: Element[] = [];
            pathsToRestore.forEach(path => {
              const node = getNodeByPath(doc.documentElement, path);
              if (node) {
                newSelectedNodes.push(node);
              }
            });
            
            if (newSelectedNodes.length > 0) {
              setSelectedNodes(newSelectedNodes);
              setSelectedNode(newSelectedNodes[newSelectedNodes.length - 1]);
            } else {
              setSelectedNode(null);
              setSelectedNodes([]);
            }
          } else {
            setSelectedNode(null);
            setSelectedNodes([]);
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Signal that we are ready to receive data
    vscode.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync changes back to extension
  const updateSvg = useCallback((newDoc: Document) => {
    const newSvgText = serializeSvg(newDoc);
    setSvgContent(newSvgText);
    setParsedDoc(newDoc); // Update local state
    vscode.postMessage({
      type: 'updateSvg',
      svgText: newSvgText
    });
  }, []);

  const handleAttributeChange = (name: string, value: string) => {
    if (selectedNode && parsedDoc) {
      selectedNode.setAttribute(name, value);
      updateSvg(parsedDoc);
    }
  };

  const handleAttributeDelete = (name: string) => {
    if (selectedNode && parsedDoc) {
      selectedNode.removeAttribute(name);
      updateSvg(parsedDoc);
    }
  };

  const handleToggleVisibility = (node: Element) => {
    if (parsedDoc) {
      const currentVisibility = node.getAttribute('visibility');
      if (currentVisibility === 'hidden') {
        node.removeAttribute('visibility');
      } else {
        node.setAttribute('visibility', 'hidden');
      }
      updateSvg(parsedDoc);
    }
  };

  const handleNodeSelect = (node: Element, multi: boolean) => {
    if (multi) {
      setSelectedNodes(prev => {
        const exists = prev.includes(node);
        let newSelection;
        if (exists) {
          newSelection = prev.filter(n => n !== node);
        } else {
          newSelection = [...prev, node];
        }
        // Update primary selection to the last selected one, or null if empty
        setSelectedNode(newSelection.length > 0 ? newSelection[newSelection.length - 1] : null);
        return newSelection;
      });
    } else {
      setSelectedNode(node);
      setSelectedNodes([node]);
    }
  };

  const handlePreviewSelect = (path: number[], multi: boolean) => {
    if (parsedDoc && parsedDoc.documentElement) {
      const node = getNodeByPath(parsedDoc.documentElement, path);
      if (node) {
        handleNodeSelect(node, multi);
      }
    }
  };

  const handleGroup = () => {
    if (selectedNodes.length < 2 || !parsedDoc) return;

    // Find common parent (simplified: assume all selected nodes share the same parent for now, or handle reparenting)
    // For a robust implementation, we should check if they are siblings.
    // If not, maybe disable grouping or handle complex logic.
    // Let's assume they are siblings for this iteration or just take the parent of the first one.
    
    const firstParent = selectedNodes[0].parentElement;
    if (!firstParent) return;

    // Verify all nodes have the same parent
    const allSameParent = selectedNodes.every(n => n.parentElement === firstParent);
    if (!allSameParent) {
      console.warn("Can only group siblings");
      return;
    }

    // Create group element
    const group = parsedDoc.createElementNS("http://www.w3.org/2000/svg", "g");
    
    // Sort selected nodes by index to maintain order
    const sortedNodes = [...selectedNodes].sort((a, b) => {
      const indexA = Array.from(firstParent.children).indexOf(a);
      const indexB = Array.from(firstParent.children).indexOf(b);
      return indexA - indexB;
    });

    // Insert group before the first node
    firstParent.insertBefore(group, sortedNodes[0]);

    // Move nodes into group
    sortedNodes.forEach(node => {
      group.appendChild(node);
    });

    // Update selection to the new group
    setSelectedNode(group);
    setSelectedNodes([group]);

    updateSvg(parsedDoc);
  };

  const handleMoveNode = (sources: Element[], target: Element, position: 'before' | 'after' | 'inside') => {
    if (!parsedDoc) return;

    const parent = target.parentElement;
    if (!parent && position !== 'inside') return;

    // Filter out invalid moves (moving into self or children)
    const validSources = sources.filter(source => {
      return source !== target && !source.contains(target);
    });

    if (validSources.length === 0) return;

    // If moving multiple nodes, we need to be careful about the insertion point shifting.
    // A simple strategy is to insert them one by one.
    // If position is 'before', insert them before the target.
    // If position is 'after', insert them after the target (in reverse order to maintain selection order, or just insert before target.nextSibling).
    // If position is 'inside', append them to target.

    if (position === 'inside') {
      validSources.forEach(source => target.appendChild(source));
    } else if (position === 'before') {
      validSources.forEach(source => parent?.insertBefore(source, target));
    } else if (position === 'after') {
      // Insert in reverse order so they end up in the correct order after the target
      // Or just find the reference node (target.nextSibling) and insert before it
      const referenceNode = target.nextElementSibling;
      validSources.forEach(source => parent?.insertBefore(source, referenceNode));
    }

    updateSvg(parsedDoc);
  };

  const selectedNodePaths = useMemo(() => {
    if (!parsedDoc || !parsedDoc.documentElement) return [];
    return selectedNodes.map(node => getNodePath(node, parsedDoc.documentElement));
  }, [selectedNodes, parsedDoc]);

  const handleAttributeReorder = (draggedName: string, targetName: string, position: 'before' | 'after') => {
    if (!selectedNode || !parsedDoc) return;

    const attributes = Array.from(selectedNode.attributes);
    const draggedAttr = attributes.find(a => a.name === draggedName);
    const targetAttr = attributes.find(a => a.name === targetName);

    if (!draggedAttr || !targetAttr) return;

    // Create a new order of attributes
    const newAttributes: {name: string, value: string}[] = [];
    
    attributes.forEach(attr => {
      if (attr.name === draggedName) return; // Skip dragged attribute, we'll insert it later
      
      if (attr.name === targetName) {
        if (position === 'before') {
          newAttributes.push({ name: draggedName, value: draggedAttr.value });
          newAttributes.push({ name: attr.name, value: attr.value });
        } else {
          newAttributes.push({ name: attr.name, value: attr.value });
          newAttributes.push({ name: draggedName, value: draggedAttr.value });
        }
      } else {
        newAttributes.push({ name: attr.name, value: attr.value });
      }
    });

    // Re-apply attributes in the new order
    // First remove all attributes
    while (selectedNode.attributes.length > 0) {
      selectedNode.removeAttribute(selectedNode.attributes[0].name);
    }

    // Then add them back in order
    newAttributes.forEach(attr => {
      selectedNode.setAttribute(attr.name, attr.value);
    });

    updateSvg(parsedDoc);
  };

  return (
    <div className="app-container">
      <div className="panel left-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px' }}>
          <h3>Layers</h3>
          <button onClick={handleGroup} disabled={selectedNodes.length < 2} style={{ fontSize: '12px', padding: '2px 5px' }}>
            Group
          </button>
        </div>
        {parsedDoc && parsedDoc.documentElement && (
          <LayerTree 
            node={parsedDoc.documentElement} 
            onSelect={handleNodeSelect} 
            onToggleVisibility={handleToggleVisibility}
            onMoveNode={handleMoveNode}
            selectedNodes={selectedNodes} 
          />
        )}
      </div>
      <div className="panel center-panel">
        <Preview 
          svgContent={svgContent} 
          onSelect={handlePreviewSelect} 
          selectedNodePaths={selectedNodePaths} 
        />
      </div>
      <div className="panel right-panel">
        <AttributeEditor 
          node={selectedNode} 
          onChange={handleAttributeChange} 
          onDelete={handleAttributeDelete}
          onReorder={handleAttributeReorder}
        />
      </div>
    </div>
  );
}

export default App;
