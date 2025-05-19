import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { ProfileService } from '../api/profile';
import { CvService } from '../api/cv';
import type { ApiGetProfile } from '../api/profile';

export const CV = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<ApiGetProfile>({
    queryKey: ['profile'],
    queryFn: () => ProfileService.fetchOwnProfile(),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await CvService.uploadCv({ file });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSuccess(true);
      setError('');
    },
    onError: () => {
      setError('Ошибка при загрузке файла');
      setSuccess(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Резюме
        </Typography>

        <Paper elevation={3} sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Резюме успешно загружено
            </Alert>
          )}

          {profile?.cv ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Текущее резюме
              </Typography>
              <Link href={profile.cv} target="_blank" rel="noopener noreferrer">
                {profile.cv}
              </Link>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ mb: 3 }}>
              У вас еще нет загруженного резюме
            </Typography>
          )}

          <Box>
            <input
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              id="cv-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="cv-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Загрузка...' : 'Загрузить резюме'}
              </Button>
            </label>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Поддерживаемые форматы: PDF, DOC, DOCX
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}; 