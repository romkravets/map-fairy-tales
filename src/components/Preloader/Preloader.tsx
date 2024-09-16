import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

interface Story {
  id: string;
  userId: string;
  regionId: string;
  story: {
    title: string;
    imageUrl: string;
    paragraphs: Array<{ paragraph: string }>;
  };
  region: string;
  like: number;
  status: boolean;
}

export default function Preloader() {
  return (
    <Box sx={{ display: 'flex' }} style={{display: 'flex', flexDirection: 'column', width: '100%',
      height:'100vh', alignItems: 'center', justifyContent: 'center'}}>
      <CircularProgress />
    </Box>
  );
}
