import Box from '@mui/material/Box';

export default function PageContainer({ children, sx = {} }) {
  return (
    <Box
      sx={{
        maxWidth: 1000,
        mx: 'auto',
        my: 6,
        p: 4,
        background: '#f8fafc',
        borderRadius: 4,
        fontSize: 22,
        lineHeight: 1.7,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export const sectionTitleSx = {
  fontWeight: 900,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: 'primary.main',
  textAlign: 'center',
  px: 2,
  py: 1,
  borderRadius: 2,
  background: 'linear-gradient(90deg, #e3f2fd 0%, #f8fafc 100%)',
  boxShadow: 1,
  fontSize: { xs: 20, sm: 26 },
  mb: 3,
};