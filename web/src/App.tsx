import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './App.css';

function App() {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setFile(null);
  };

  const handleProcess = (e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`Preparando para ler a planilha: ${file?.name}`);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true, 
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  return (
    <main className="container">
      <h1>Explorer.</h1>
      <p className="subtitle">Importe sua base QUALIS.</p>

      <div {...getRootProps()} className={`dropzone-area ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        
        <span className="icon-folder">
          {file ? '📂' : '📁'}
        </span>

        {!file ? (
          <>
            <p style={{ fontSize: '0.9rem', color: '#051F20', fontWeight: 500, marginBottom: '1.5rem' }}>
              {isDragActive ? "Pode soltar o arquivo!" : "Arraste sua planilha aqui"}
            </p>

            <button type="button" className="btn-select" onClick={open}>
              SELECIONAR ARQUIVO
            </button>
          </>
        ) : (
          <div className="action-group">
            <div style={{ fontSize: '0.85rem', color: '#051F20', fontWeight: 600 }}>
              ✓ {file.name}
            </div>

            <button type="button" className="btn-select" onClick={handleProcess}>
              ENVIAR ARQUIVO
            </button>

            <button type="button" className="btn-remove" onClick={handleRemove}>
              Remover arquivo
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;