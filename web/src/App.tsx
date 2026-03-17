import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import './App.css';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [estratoFilter, setEstratoFilter] = useState<string>('');
  
  const [journals, setJournals] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Fetch available areas on mount
  const fetchAreas = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/areas');
      const data = await response.json();
      setAreas(data);
    } catch (error) {
      console.error("Erro ao buscar áreas:", error);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  // Fetch journals and distribution when filters change
  const fetchAreaDetails = async () => {
    if (!selectedArea) {
      setJournals([]);
      setDistribution([]);
      return;
    }
    
    setIsLoadingData(true);
    try {
      // Fetch distribution
      const distRes = await fetch(`http://localhost:3000/api/journals/distribution?areaId=${selectedArea}`);
      const distData = await distRes.json();
      setDistribution(distData);

      // Fetch journals
      const estratoQuery = estratoFilter ? `&estrato=${estratoFilter}` : '';
      // Getting a larger limit to simulate the dashboard
      const journalsRes = await fetch(`http://localhost:3000/api/journals?areaId=${selectedArea}${estratoQuery}&limit=500`);
      const journalsData = await journalsRes.json();
      setJournals(journalsData.data || []);
      
    } catch (error) {
      console.error("Erro ao buscar dados da área:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAreaDetails();
  }, [selectedArea, estratoFilter]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setFeedback(null);
    }
  }, []);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setFile(null);
    setFeedback(null);
  };

  const handleProcess = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setFeedback({ type: 'success', text: data.message });
        setFile(null); 
        // Re-fetch areas to capture any newly uploaded areas
        fetchAreas(); 
      } else {
        setFeedback({ type: 'error', text: data.message || 'Erro ao processar arquivo.' });
      }
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', text: 'Erro de conexão com o servidor.' });
    } finally {
      setIsUploading(false);
    }
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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: (selectedArea || file) ? 'flex-start' : 'center', 
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: 'transparent',
      boxSizing: 'border-box'
    }}>
      <main 
        className="container" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          height: 'fit-content', 
          width: '100%',
          maxWidth: selectedArea ? '1200px' : '600px',
          marginBottom: '2rem',
          transition: 'max-width 0.4s ease-in-out', 
          boxSizing: 'border-box',
        }}
      >
        
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ color: '#051F20', margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: 800 }}>Qualis Explorer</h1>
            <p className="subtitle" style={{ color: '#163832', margin: 0, fontSize: '1.1rem' }}>Desafio Técnico Agora Sabemos</p>
          </div>
          
          {selectedArea && !file && (
             <div {...getRootProps()} style={{ outline: 'none' }}>
               <input {...getInputProps()} />
               <button type="button" className="btn-select" onClick={open} style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                 + Nova Ingestão CSV
               </button>
             </div>
          )}
        </div>

        {(!selectedArea || file) && (
        <div {...getRootProps()} className={`dropzone-area ${isDragActive ? 'active' : ''}`} style={{ width: '100%', marginBottom: '2rem' }}>
          <input {...getInputProps()} />
          
          <span className="icon-folder" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>
            {file ? '📂' : '📊'}
          </span>

          {!file ? (
            <>
              <p style={{ fontSize: '1rem', color: '#051F20', fontWeight: 500, marginBottom: '1.5rem' }}>
                {isDragActive ? "Pode soltar a planilha aqui!" : "Tem uma base de dados oficial Capes?"}
              </p>
              <button type="button" className="btn-select" onClick={open}>
                SELECIONAR ARQUIVO
              </button>
            </>
          ) : (
            <div className="action-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '0.9rem', color: '#051F20', fontWeight: 600, marginBottom: '10px' }}>
                ✓ {file.name}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-select" 
                  onClick={handleProcess}
                  disabled={isUploading}
                  style={{ opacity: isUploading ? 0.7 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                >
                  {isUploading ? "PROCESSANDO NO SERVIDOR..." : "INICIAR INGESTÃO BIG DATA"}
                </button>

                {!isUploading && (
                  <button type="button" className="btn-remove" onClick={handleRemove}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {feedback && (
          <div style={{ 
            width: '100%',
            marginBottom: '2rem',
            fontSize: '0.95rem', 
            fontWeight: 600,
            color: feedback.type === 'success' ? '#166534' : '#991b1b',
            backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
            padding: '1rem',
            textAlign: 'center',
            borderRadius: '8px',
          }}>
            {feedback.type === 'success' ? '✅' : '❌'} {feedback.text}
          </div>
        )}

        <div style={{ width: '100%', padding: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#051F20', marginBottom: '1.5rem', borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>
                Painel de Classificação
            </h2>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#051F20', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'left' }}>Área de Avaliação (CAPES):</label>
                    <select 
                        value={selectedArea}
                        onChange={(e) => {
                            setSelectedArea(e.target.value);
                            setEstratoFilter(''); 
                        }}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.8)', backgroundColor: 'rgba(255, 255, 255, 0.8)', outline: 'none', fontSize: '1rem', color: '#051F20' }}
                    >
                        <option value="">-- Selecione uma área para explorar --</option>
                        {areas.map(area => (
                            <option key={area.id} value={area.id}>{area.name}</option>
                        ))}
                    </select>
                </div>
                
                {selectedArea && (
                <div style={{ width: '200px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#051F20', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'left' }}>Filtrar Estrato:</label>
                    <select 
                        value={estratoFilter}
                        onChange={(e) => setEstratoFilter(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.8)', backgroundColor: 'rgba(255, 255, 255, 0.8)', outline: 'none', fontSize: '1rem', color: '#051F20' }}
                    >
                        <option value="">Todos</option>
                        {['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'B5', 'C'].map(est => (
                            <option key={est} value={est}>{est}</option>
                        ))}
                    </select>
                </div>
                )}
            </div>

            {selectedArea && !isLoadingData && (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    
                    <div style={{ flex: '1', minWidth: '250px', maxWidth: '300px', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: 'rgba(5, 31, 32, 0.9)', color: '#fff', padding: '1rem', fontWeight: 600, textAlign: 'center' }}>Distribuição de Estratos</div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {distribution.length === 0 ? (
                                <li style={{ padding: '1rem', textAlign: 'center', color: '#051F20' }}>Nenhum dado</li>
                            ) : (
                                distribution.map(dist => (
                                    <li 
                                        key={dist.estrato} 
                                        className={`dist-item ${estratoFilter === dist.estrato ? 'active-dist' : ''}`}
                                        onClick={() => setEstratoFilter(dist.estrato === estratoFilter ? '' : dist.estrato)}
                                        title={`Clique para filtrar por ${dist.estrato}`}
                                    >
                                        <span style={{ fontWeight: 600, color: '#051F20' }}>Estrato {dist.estrato}</span>
                                        <span style={{ color: '#051F20', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: '12px' }}>{dist.count}</span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                    <div style={{ flex: '3', minWidth: '500px', maxHeight: '600px', overflowX: 'auto', overflowY: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#051F20', backdropFilter: 'blur(10px)' }}>
                                <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>ISSN</th>
                                <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>Título do Periódico</th>
                                <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Qualis</th>
                            </tr>
                            </thead>
                            <tbody>
                            {journals.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: '#051F20' }}>
                                        Nenhuma revista encontrada para a seleção atual.
                                    </td>
                                </tr>
                            ) : (
                                journals.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '1rem', color: '#163832', whiteSpace: 'nowrap' }}>{item.issn}</td>
                                        <td style={{ padding: '1rem', fontWeight: '600', color: '#051F20' }}>{item.title}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                display: 'inline-block',
                                                backgroundColor: item.estrato.startsWith('A') ? '#dcfce7' : (item.estrato.startsWith('B') ? '#fef3c7' : '#fee2e2'), 
                                                color: item.estrato.startsWith('A') ? '#166534' : (item.estrato.startsWith('B') ? '#92400e' : '#991b1b'), 
                                                padding: '4px 12px', 
                                                borderRadius: '20px', 
                                                fontWeight: 700 
                                            }}>
                                                {item.estrato}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isLoadingData && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#051F20', fontWeight: 600 }}>
                    Carregando dados da Capes...
                </div>
            )}
        </div>

      </main>
    </div>
  );
}

export default App;