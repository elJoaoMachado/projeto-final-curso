import React from 'react';
import { useTranslation } from 'react-i18next';
import { Fab, Button } from '@mui/material';

const FloatingLangButton = ({ inHeader = false }) => {
  const { i18n } = useTranslation();
  const isPT = i18n.language === 'pt';

  const toggleLang = () => {
    i18n.changeLanguage(isPT ? 'en' : 'pt');
  };

  if (inHeader) {
    return (
      <Button
        onClick={toggleLang}
        variant="outlined"
        size="small"
        sx={{
          fontWeight: 700,
          minWidth: 56,
          color: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.45)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.7)',
            backgroundColor: 'rgba(79, 140, 255, 0.3)',
          },
        }}
      >
        {isPT ? 'EN' : 'PT'}
      </Button>
    );
  }

  return (
    <Fab
      onClick={toggleLang}
      color="primary"
      size="small"
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        fontWeight: 'bold'
      }}
    >
      {isPT ? 'EN' : 'PT'}
    </Fab>
  );
};

export default FloatingLangButton; 