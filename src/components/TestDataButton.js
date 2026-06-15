import React from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../FirebaseConfig';
import { Button, Box, Typography } from '@mui/material';

const TestDataButton = () => {
  const addTestAbsences = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const testPeople = [
      { name: 'João Silva', email: 'joao@example.com', photoURL: 'https://i.pravatar.cc/150?img=1' },
      { name: 'Maria Santos', email: 'maria@example.com', photoURL: 'https://i.pravatar.cc/150?img=2' },
      { name: 'Pedro Oliveira', email: 'pedro@example.com', photoURL: 'https://i.pravatar.cc/150?img=3' },
      { name: 'Ana Costa', email: 'ana@example.com', photoURL: 'https://i.pravatar.cc/150?img=4' },
      { name: 'Carlos Ferreira', email: 'carlos@example.com', photoURL: 'https://i.pravatar.cc/150?img=5' }
    ];

    try {
      let count = 0;
      for (const person of testPeople) {
        await addDoc(collection(db, 'ausencias'), {
          nome: person.name,
          email: person.email,
          photoURL: person.photoURL,
          data: today,
          razao: 'Doença',
          departamento: 'Recursos Humanos',
          userId: Math.random().toString(36).substr(2, 9)
        });
        count++;
      }
      alert(`✓ Adicionadas ${count} ausências para hoje!`);
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
  };

  return (
    <Box sx={{ p: 2, border: '2px dashed #f44336', borderRadius: 1, mb: 2, bgcolor: '#ffebee' }}>
      <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
        🔧 DEV ONLY - Adicionar dados de teste
      </Typography>
      <Button size="small" variant="contained" color="error" onClick={addTestAbsences}>
        Adicionar 5 ausências para hoje
      </Button>
    </Box>
  );
};

export default TestDataButton;
