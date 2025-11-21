import { useState, useEffect } from 'react';

interface AttributeEditorProps {
  node: Element | null;
  onChange: (name: string, value: string) => void;
  onDelete: (name: string) => void;
}

export const AttributeEditor: React.FC<AttributeEditorProps> = ({ node, onChange, onDelete }) => {
  const [attributes, setAttributes] = useState<{name: string, value: string}[]>([]);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  useEffect(() => {
    if (node) {
      const attrs = Array.from(node.attributes).map(attr => ({
        name: attr.name,
        value: attr.value
      }));
      setAttributes(attrs);
    } else {
      setAttributes([]);
    }
  }, [node]);

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

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3>Attributes</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {attributes.map(attr => (
          <div key={attr.name} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <span style={{ width: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={attr.name}>{attr.name}</span>
            <input 
              value={attr.value} 
              onChange={(e) => onChange(attr.name, e.target.value)}
              style={{ flex: 1 }}
            />
            <button onClick={() => onDelete(attr.name)}>x</button>
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
