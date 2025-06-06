import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

const gradientSummaryGroups = [
  { label: 'Downhill', min: -Infinity, max: -3, icon: 'down' },
  { label: 'Flat', min: -3, max: 3, icon: 'flat' },
  { label: 'Uphill', min: 3, max: Infinity, icon: 'up' }
];

export default gradientSummaryGroups;