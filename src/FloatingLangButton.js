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
        color="primary"
        size="small"
        sx={{ fontWeight: 700, minWidth: 56 }}
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