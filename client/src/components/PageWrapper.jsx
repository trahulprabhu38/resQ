import React from 'react';
import { Box, Container } from '@mui/material';

const PageWrapper = ({ children, maxWidth = 'md' }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        bgcolor: 'background.default',
        py: 4,
        overflow: 'auto'
      }}
    >
      <Container maxWidth={maxWidth} sx={{ height: '100%' }}>
        {children}
      </Container>
    </Box>
  );
};

export default PageWrapper; 