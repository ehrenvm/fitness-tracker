import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import backgroundImage from '../assets/noco-performance-logo.png';

export const BackgroundContainer = styled(Box)({
  minHeight: '100vh',
  width: '100%',
  position: 'relative',
  backgroundColor: '#f5f5f5',
  '&::before': {
    content: '""',
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50%',
    height: '50%',
    backgroundImage: `url(${backgroundImage})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    opacity: 0.15,
    zIndex: 0,
    pointerEvents: 'none',
  }
});

export const ContentContainer = styled('div')({
  position: 'relative',
  zIndex: 1,
}); 