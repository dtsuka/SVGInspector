import { useState, useEffect } from 'react';

interface AttributeEditorProps {
  node: Element | null;
  onChange: (name: string, value: string) => void;
  onDelete: (name: string) => void;
  onReorder: (draggedName: string, targetName: string, position: 'before' | 'after') => void;
}

export const AttributeEditor: React.FC<AttributeEditorProps> = ({ node, onChange, onDelete, onReorder }) => {
  const [attributes, setAttributes] = useState<{name: string, value: string}[]>([]);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [dropTarget, setDropTarget] = useState<{name: string, position: 'before' | 'after'} | null>(null);
  
  // State for style editing
  const [styleProperties, setStyleProperties] = useState<{name: string, value: string}[]>([]);
  const [newStyleKey, setNewStyleKey] = useState('');
  const [newStyleValue, setNewStyleValue] = useState('');
  const [styleDropTarget, setStyleDropTarget] = useState<{name: string, position: 'before' | 'after'} | null>(null);

  useEffect(() => {
    if (node) {
      const attrs = Array.from(node.attributes).map(attr => ({
        name: attr.name,
        value: attr.value
      }));
      setAttributes(attrs);

      // Parse style attribute
      const styleAttr = attrs.find(a => a.name === 'style');
      if (styleAttr) {
        const props = styleAttr.value.split(';')
          .map(p => p.trim())
          .filter(p => p)
          .map(p => {
            const [name, ...values] = p.split(':');
            return {
              name: name.trim(),
              value: values.join(':').trim()
            };
          });
        setStyleProperties(props);
      } else {
        setStyleProperties([]);
      }
    } else {
      setAttributes([]);
      setStyleProperties([]);
    }
  }, [node]);

  const updateStyleAttribute = (newProps: {name: string, value: string}[]) => {
    const styleString = newProps.map(p => `${p.name}: ${p.value}`).join('; ');
    onChange('style', styleString);
  };

  if (!node) {
    return <div style={{ padding: '10px' }}>Select an element to edit attributes</div>;
  }

  const handleAdd = () => {
    if (newAttrKey) {
      onChange(newAttrKey, newAttrValue);
      setNewAttrKey('');
      setNewAttrValue('');
    }
  };

  const handleAddStyle = () => {
    if (newStyleKey && newStyleValue) {
      const newProps = [...styleProperties, { name: newStyleKey, value: newStyleValue }];
      updateStyleAttribute(newProps);
      setNewStyleKey('');
      setNewStyleValue('');
    }
  };

  const handleDeleteStyle = (name: string) => {
    const newProps = styleProperties.filter(p => p.name !== name);
    updateStyleAttribute(newProps);
  };

  const handleStyleChange = (name: string, value: string) => {
    const newProps = styleProperties.map(p => p.name === name ? { ...p, value } : p);
    updateStyleAttribute(newProps);
  };

  // Attribute Drag & Drop
  const handleDragStart = (e: React.DragEvent, name: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'attribute', name }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (y < height / 2) {
      setDropTarget({ name: targetName, position: 'before' });
    } else {
      setDropTarget({ name: targetName, position: 'after' });
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'attribute' && dropTarget) {
        onReorder(data.name, targetName, dropTarget.position);
      }
    } catch (err) {
      // Ignore non-JSON data
    }
    setDropTarget(null);
  };

  // Style Drag & Drop
  const handleStyleDragStart = (e: React.DragEvent, name: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'style', name }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStyleDragOver = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (y < height / 2) {
      setStyleDropTarget({ name: targetName, position: 'before' });
    } else {
      setStyleDropTarget({ name: targetName, position: 'after' });
    }
  };

  const handleStyleDragLeave = () => {
    setStyleDropTarget(null);
  };

  const handleStyleDrop = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'style' && styleDropTarget) {
        const draggedName = data.name;
        const newProps = [...styleProperties];
        const draggedIndex = newProps.findIndex(p => p.name === draggedName);
        const targetIndex = newProps.findIndex(p => p.name === targetName);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          const [draggedItem] = newProps.splice(draggedIndex, 1);
          const newTargetIndex = newProps.findIndex(p => p.name === targetName);
          if (styleDropTarget.position === 'before') {
            newProps.splice(newTargetIndex, 0, draggedItem);
          } else {
            newProps.splice(newTargetIndex + 1, 0, draggedItem);
          }
          updateStyleAttribute(newProps);
        }
      }
    } catch (err) {
      // Ignore non-JSON data
    }
    setStyleDropTarget(null);
  };

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3>Attributes</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {attributes.map(attr => (
          <div key={attr.name}>
            <div 
              draggable
              onDragStart={(e) => handleDragStart(e, attr.name)}
              onDragOver={(e) => handleDragOver(e, attr.name)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, attr.name)}
              style={{ 
                display: 'flex', 
                gap: '5px', 
                alignItems: 'center',
                borderTop: dropTarget?.name === attr.name && dropTarget.position === 'before' ? '2px solid #007fd4' : '2px solid transparent',
                borderBottom: dropTarget?.name === attr.name && dropTarget.position === 'after' ? '2px solid #007fd4' : '2px solid transparent',
                cursor: 'grab',
                marginBottom: attr.name === 'style' ? '5px' : '0'
              }}
            >
              <span style={{ width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }} title={attr.name}>{attr.name}</span>
              {attr.name !== 'style' && (
                <>
                  <input 
                    value={attr.value} 
                    onChange={(e) => onChange(attr.name, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => onDelete(attr.name)}>x</button>
                </>
              )}
              {attr.name === 'style' && (
                 <button onClick={() => onDelete(attr.name)}>x</button>
              )}
            </div>
            
            {attr.name === 'style' && (
              <div style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: '2px solid #eee', paddingLeft: '10px' }}>
                {styleProperties.map(prop => (
                  <div 
                    key={prop.name}
                    draggable
                    onDragStart={(e) => handleStyleDragStart(e, prop.name)}
                    onDragOver={(e) => handleStyleDragOver(e, prop.name)}
                    onDragLeave={handleStyleDragLeave}
                    onDrop={(e) => handleStyleDrop(e, prop.name)}
                    style={{
                      display: 'flex',
                      gap: '5px',
                      alignItems: 'center',
                      borderTop: styleDropTarget?.name === prop.name && styleDropTarget.position === 'before' ? '2px solid #007fd4' : '2px solid transparent',
                      borderBottom: styleDropTarget?.name === prop.name && styleDropTarget.position === 'after' ? '2px solid #007fd4' : '2px solid transparent',
                      cursor: 'grab'
                    }}
                  >
                    <span style={{ width: '70px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9em' }} title={prop.name}>{prop.name}</span>
                    <input 
                      value={prop.value}
                      onChange={(e) => handleStyleChange(prop.name, e.target.value)}
                      style={{ flex: 1, fontSize: '0.9em' }}
                    />
                    <button onClick={() => handleDeleteStyle(prop.name)} style={{ fontSize: '0.8em' }}>x</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  <input 
                    placeholder="Prop" 
                    value={newStyleKey} 
                    onChange={e => setNewStyleKey(e.target.value)}
                    style={{ width: '70px', fontSize: '0.9em' }}
                  />
                  <input 
                    placeholder="Value" 
                    value={newStyleValue} 
                    onChange={e => setNewStyleValue(e.target.value)}
                    style={{ flex: 1, fontSize: '0.9em' }}
                  />
                  <button onClick={handleAddStyle} style={{ fontSize: '0.8em' }}>+</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px' }}>
        <h4>Add Attribute</h4>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
          <input 
            placeholder="Name" 
            value={newAttrKey} 
            onChange={e => setNewAttrKey(e.target.value)}
            style={{ width: '80px' }}
          />
          <input 
            placeholder="Value" 
            value={newAttrValue} 
            onChange={e => setNewAttrValue(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <button onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
};
