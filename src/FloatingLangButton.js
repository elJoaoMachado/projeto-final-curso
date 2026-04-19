import React from 'react';
import { useTranslation } from 'react-i18next';
import { Fab } from '@mui/material';

const FloatingLangButton = () => {
  const { i18n } = useTranslation();
  const isPT = i18n.language === 'pt';

  const toggleLang = () => {
    i18n.changeLanguage(isPT ? 'en' : 'pt');
  };

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